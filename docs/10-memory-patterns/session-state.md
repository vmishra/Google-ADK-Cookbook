# Session state

<span class="kicker">ch 10 · page 1 of 3</span>

State is cheap, synchronous, and scoped. Use it as the default place
for anything the agent needs across turns *within one conversation*.

---

## The four scopes

| Prefix | Scope | Typical use |
|---|---|---|
| *(none)* | Session | `last_city`, `current_plan`, `draft` |
| `user:` | All sessions of this `user_id` | `user:tier`, `user:locale` |
| `app:`  | All sessions of this `app_name` | `app:motd`, `app:rate_limit` |
| `temp:` | This invocation only | `temp:access_token`, `temp:trace_id` |

The service honours the prefix. You do not have to implement it.

## The reading contract

Reading is cheap — it is a dict lookup. Do it anywhere:

```python
# In a tool
def f(q: str, tool_context: ToolContext) -> str:
    tier = tool_context.state.get("user:tier", "standard")
    return lookup(q, tier=tier)

# In an instruction provider
def instr(ctx):
    return f"You are answering for a {ctx.session.state.get('user:tier')} user."

# In a callback
def before_tool(tool, args, ctx):
    if ctx.state.get("temp:locked"): return {"blocked": True}
```

## The writing contract

Writing inside a tool goes through `tool_context.state`:

```python
tool_context.state["key"] = value
```

ADK captures the write into `event.actions.state_delta` and the
service persists it. Do not reach into `session.state` directly
from a tool — the write happens but is not logged, and replay
will diverge.

## Patterns

### Pattern: short-term scratchpad

```python
def plan(query: str, tool_context: ToolContext) -> dict:
    tool_context.state["temp:plan"] = build_plan(query)
    return {"ok": True}

def execute(tool_context: ToolContext) -> dict:
    return run_plan(tool_context.state["temp:plan"])
```

Use `temp:` to avoid polluting the session's persistent state with
invocation-only data.

### Pattern: user profile

```python
# Populate once at session creation
session = await svc.create_session(
    app_name="support", user_id=uid,
    state={"user:tier": "gold", "user:locale": "en-US"})
```

Subsequent sessions for the same user inherit these.

### Pattern: cross-turn counter

```python
def before_agent(cc):
    cc.state["turn_count"] = cc.state.get("turn_count", 0) + 1
    if cc.state["turn_count"] > 30:
        cc.event_actions.escalate = True   # hard stop
```

### Pattern: route based on state

```python
def before_agent(cc):
    if cc.state.get("user:is_admin"):
        cc.event_actions.transfer_to_agent = "admin_agent"
```

---

## Anti-patterns

- **Storing large blobs in state.** Use artifacts. State is keyed-dict,
  not an object store.
- **Mutating nested dicts in place.** Assign back:
  ```python
  cur = tool_context.state.get("cart", [])
  cur.append(item)
  tool_context.state["cart"] = cur   # explicit re-assign
  ```
- **Using state for secrets.** Use `CredentialService`.
- **Using state as inter-service cache.** State is per-session. If
  every session should see the same value, compute it elsewhere.

---

## See also

- [Memory](vertex-memory-bank.md) — the long-term sibling.
- [Chapter 2 — Sessions](../02-core-concepts/sessions.md).
