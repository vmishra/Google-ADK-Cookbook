# Tracing

<span class="kicker">ch 11 · page 1 of 2</span>

ADK emits OpenTelemetry spans for every agent invocation, model
call, and tool execution. Configure an exporter and you have
distributed tracing — with the usual caveats about sampling and
cardinality.

---

## Setup

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(
    endpoint="http://otel-collector:4317")))
trace.set_tracer_provider(provider)
```

Set the endpoint via `OTEL_EXPORTER_OTLP_ENDPOINT` instead of
hard-coding — ADK picks it up.

## What you get by default

Spans per:

- `runner.run_async` — one per invocation.
- `agent.{name}.run` — one per agent call, nested.
- `llm.generate_content` — one per model call.
- `tool.{name}.execute` — one per tool call.

Attributes include `model`, `session_id`, `user_id`, `tool_name`,
`tokens_in`, `tokens_out`, `duration_ms`.

## Custom spans

Inside a tool or callback, add domain spans:

```python
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

def lookup_invoice(invoice_id: str) -> dict:
    with tracer.start_as_current_span("invoice_lookup") as sp:
        sp.set_attribute("invoice_id", invoice_id)
        result = db.get(invoice_id)
        sp.set_attribute("status", result["status"])
        return result
```

These nest correctly under the tool span.

## A `TracingPlugin` that enriches

For attributes you want on every span, use a plugin:

```python
from google.adk.plugins.base_plugin import BasePlugin

class TenantAttributesPlugin(BasePlugin):
    async def on_before_run(self, ctx):
        span = trace.get_current_span()
        span.set_attribute("tenant", ctx.session.state.get("user:tenant", ""))
        span.set_attribute("agent_root", ctx.agent.name)

runner = Runner(agent=root_agent, session_service=svc,
                plugins=[TenantAttributesPlugin()])
```

## Sampling

In production, sample. Head-based sampling at 5-10% is usually
enough; keep 100% for spans with errors.

## Cost — not just latency

Wrap the LLM span's attributes into a log-based metric so you can
slice cost by model, tenant, or agent:

```python
# In a plugin, after each llm.generate_content span completes:
log("llm_cost", model=span.model,
    tokens_in=span.tokens_in, tokens_out=span.tokens_out,
    tenant=span.tenant)
```

## Exporting to BigQuery

For ad-hoc SQL over a week of runs, a plugin writes one row per
event to a BigQuery table:

```python
class AuditPlugin(BasePlugin):
    async def on_event(self, ctx, event):
        await bq_insert("events", {
            "ts": event.timestamp,
            "session_id": ctx.session.id,
            "author": event.author,
            "event_json": event.model_dump_json(),
        })
```

The `postgres_session_service` sample shows a similar pattern for
session history.

---

## See also

- `contributing/samples/tracer_debug_utils`, `runner_debug_example`,
  `plugin_debug_logging`.
