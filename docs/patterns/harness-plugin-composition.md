# Pattern: Harness plugin composition

> Stack plugins to realise a platform. Order matters.

## When to use

Any time you are building a runner that is shared across teams or
tenants.

## The shape

```python
plugins = [
    RateLimitPlugin(rps=tenant.rps),
    CircuitBreakerPlugin(),
    PerTenantPolicy(tenant=tenant),
    PiiRedactionPlugin(),
    RetryPlugin(),
    CostMeterPlugin(tenant=tenant),
    AuditPlugin(sink=bq_audit),
    TracingPlugin(),
]
```

Runner-level composition. Each plugin is single-purpose.

## Rules

- Cheap rejection first. Rate limits and circuit breakers fire
  before the model is touched.
- Policy before PII redaction — policy may depend on unredacted
  content.
- PII redaction before audit — audits should not leak.
- Retries inside cost metering — retries cost money too.
- Tracing last so it sees the final state.

## Anti-patterns

- Writing one "mega-plugin" that does everything. You lose the
  ability to swap individual policies per tenant.
- Reading side-effects between plugins. Each plugin should be
  self-contained; cross-plugin state goes through session state or
  a plugin-private cache keyed by `invocation_id`.
