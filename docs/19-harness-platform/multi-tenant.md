# Multi-tenant

<span class="kicker">ch 19 · page 4 of 6</span>

A platform that runs agents for many customers has to isolate them.
The mechanisms are the same as any SaaS: identity, data isolation,
resource quotas, billing. This page is how they map onto ADK.

---

## The tenancy key

Every call into the platform carries a tenant id. Resolve it once,
stamp it onto the `InvocationContext`, and let every service and
plugin read it from there.

```python
class TenancyPlugin(BasePlugin):
    def __init__(self, resolver):
        self._resolver = resolver
    async def on_before_run(self, ctx):
        tenant = self._resolver(ctx.session.user_id)
        ctx.session.state["user:tenant"] = tenant
```

All downstream plugins and callbacks read `ctx.session.state["user:tenant"]`.

---

## Data isolation

Four dimensions. Know which you are enforcing and where.

| Dimension | Enforcement |
|---|---|
| Sessions | `SessionService` keys by `(tenant, user_id, session_id)` |
| Memory | `MemoryService` scopes search by tenant |
| Artifacts | `ArtifactService` writes to per-tenant bucket or prefix |
| Credentials | `CredentialService` keys by tenant; separate store preferred |

Do *not* rely on the agent to respect tenancy. Enforce at the
service layer. Agents are untrusted with respect to this.

## Network isolation

For regulated workloads, run agents in per-tenant namespaces or
projects. GKE is the right target. Per-tenant deployment is
expensive; start with shared deployment + service-level tenancy,
move only the tenants that require it.

## Resource quotas

Three levers, enforced by plugins:

- **Requests per second.** `RateLimitPlugin`.
- **Tokens per day.** `CostMeterPlugin` + a daily reset.
- **Concurrent sessions.** Track in Redis; reject at `on_before_run`.

Make quotas visible to tenants. "429 quota exceeded" with a tenant
dashboard beats silent throttling.

## Billing

The event log is the canonical source for billing. Every
`usage_metadata`-bearing event contributes tokens-in and
tokens-out; every tool call contributes a per-tool fee; every
artifact byte contributes a storage charge.

```python
class BillingPlugin(BasePlugin):
    async def on_event(self, ctx, event):
        tenant = ctx.session.state.get("user:tenant")
        if event.usage_metadata:
            emit_usage(tenant, event.usage_metadata)
        if event.actions.artifact_delta:
            for name, _ in event.actions.artifact_delta.items():
                emit_artifact_write(tenant, name)
```

Emit to BigQuery or a streaming billing table; aggregate
downstream.

## Identity

- Users authenticate to your surface (OIDC, SAML, passkey, SSO).
- Your surface issues a short-lived JWT to the platform API.
- The platform API resolves tenant from the JWT and calls the
  runner factory.
- Tools that need *user* credentials (OAuth to Google Drive, Slack)
  request them via `CredentialService`, which mediates the user's
  OAuth grants per-tenant.

Never leak a user credential across tenants. The
`CredentialService` is the layer that enforces this.

## Noisy-neighbour

Two tactics:

- **Per-tenant priority queues.** Enterprise tenants get a
  separate instance pool; everyone else shares.
- **Per-tenant circuit breakers.** If one tenant's agent storms a
  backend, trip the breaker for that tenant only.

---

## Next

- [Harness patterns](harness-patterns.md) — the reusable patterns.
