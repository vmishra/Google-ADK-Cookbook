# Function tools

<span class="kicker">ch 04 · page 1 of 6</span>

The default. Any Python callable with type hints and a docstring can
be a tool. 90% of tools in a typical agent are function tools.

---

## Canonical shape

```python
def calculate_discount(
    original_price_cents: int,
    discount_percentage: float,
) -> int:
    """Return the final price in cents after applying the discount.

    Args:
      original_price_cents: The pre-discount price as an integer number
        of cents. Must be non-negative.
      discount_percentage: Percentage off, as a float between 0 and 100.

    Returns:
      The price after discount, in cents, as an integer.
    """
    return int(original_price_cents * (1 - discount_percentage / 100))
```

The model sees:

- **Name** — from the function name. Snake case.
- **Description** — the first paragraph of the docstring.
- **Parameters** — name, type (from the hint), description (from the
  `Args:` block in Google-style or `param` in reST-style).
- **Return** — type and the `Returns:` block (only for the developer,
  not the model).

## Accepted types

| Type hint | JSON schema |
|---|---|
| `str` | string |
| `int` | integer |
| `float` | number |
| `bool` | boolean |
| `list[T]` | array of T |
| `dict[str, T]` | object |
| `Literal["a", "b"]` | enum |
| `Optional[T]` | nullable T |
| `pydantic.BaseModel` subclass | nested object with the model's fields |

`datetime`, `Path`, custom classes are not supported — convert at the
boundary.

## Pydantic argument models

For tools with many parameters, pass a pydantic model:

```python
from pydantic import BaseModel, Field

class ScheduleArgs(BaseModel):
    title: str = Field(..., description="Meeting title, max 80 chars")
    start_iso: str = Field(..., description="ISO 8601 start time")
    duration_minutes: int = Field(30, ge=5, le=480)
    attendees: list[str] = Field(default_factory=list)

def schedule_meeting(args: ScheduleArgs) -> dict:
    """Book a meeting on the user's calendar."""
    ...
```

The generated schema is richer (descriptions, constraints), and
validation happens automatically.

## `ToolContext` — the side-effect channel

Accept `tool_context: ToolContext` as the last parameter when the
tool needs to touch state, memory, artifacts, or credentials.

```python
from google.adk.tools.tool_context import ToolContext

def save_search(query: str, tool_context: ToolContext) -> dict:
    """Save the query to the user's history and return the id."""
    history = tool_context.state.get("user:search_history", [])
    history.append({"query": query, "t": time.time()})
    tool_context.state["user:search_history"] = history
    return {"ok": True, "index": len(history)}
```

The model does not see `tool_context` — it is injected by ADK.

## Returning errors

Do not raise for business-rule failures. Return a dict the agent can
reason about.

```python
def cancel_order(order_id: str) -> dict:
    order = orders.get(order_id)
    if not order:
        return {"ok": False, "reason": "order not found"}
    if order.status == "shipped":
        return {"ok": False, "reason": "already shipped"}
    order.status = "cancelled"
    return {"ok": True}
```

Raise only for infrastructure failures — network errors, bugs,
misconfiguration. Those propagate up and can be handled by a plugin.

## Async tools

Tools can be `async def` and ADK will await them.

```python
async def fetch_user(user_id: str) -> dict:
    async with httpx.AsyncClient() as c:
        r = await c.get(f"https://api.internal/users/{user_id}")
        r.raise_for_status()
        return r.json()
```

Mix freely with sync tools — the runner handles both.

## Error-handling callbacks

If a tool might raise, wrap it with `after_tool_callback` to convert
exceptions into agent-visible errors:

```python
def after_tool(tool, args, ctx, result):
    if isinstance(result, Exception):
        return {"ok": False, "error": str(result)}
    return result
```

See the `tool_error_handling` sample for full examples.

---

## Anti-patterns

- **Stringly-typed args.** `def f(options: str)` forces the model to
  serialise into a string. Use a pydantic model.
- **Hidden side effects.** A tool called `get_weather` that also
  writes to state will surprise the agent. If it writes, say so in
  the docstring.
- **Swallowing exceptions.** Return an error dict, or let the
  exception reach the callback. Do not `except: return None`.

---

## See also

- [OpenAPI tools](openapi-tools.md)
- [Long-running tools](long-running-tools.md)
- `contributing/samples/tool_error_handling`, `pydantic_argument`,
  `tool_output_processing` in `google/adk-python`.
