# State prefixes cheatsheet

| Prefix | Scope | Example key | Persistence |
|---|---|---|---|
| *(none)* | this session | `draft`, `last_city` | until session is deleted |
| `user:` | all sessions of `user_id` | `user:name`, `user:tier` | persists per user |
| `app:` | all sessions of `app_name` | `app:motd`, `app:rate_limit` | persists app-wide |
| `temp:` | this invocation only | `temp:access_token` | wiped at end of invocation |

Read with `session.state.get(...)`. Write via `tool_context.state[...]`
(tools) or `callback_context.state[...]` (callbacks). Never mutate
the underlying `Session.state` directly from a tool — that bypasses
the event log.

```python
# Read
tier = ctx.state.get("user:tier", "standard")

# Write (in a tool)
tool_context.state["last_city"] = city

# Write (in a callback)
cc.state["turn_count"] = cc.state.get("turn_count", 0) + 1
```
