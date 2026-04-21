# Streaming

<span class="kicker">ch 06 · page 3 of 5</span>

Text streaming. Every token the model produces is yielded as an
event; your UI renders them as they arrive. Two modes: SSE and
plain async.

---

## Token streaming with `run_async`

`run_async` already streams. Each token chunk arrives as a partial
event.

```python
async for event in runner.run_async(user_id="u", session_id=sid, new_message=msg):
    if event.partial and event.content:
        for part in event.content.parts:
            if part.text:
                print(part.text, end="", flush=True)   # paint to UI
    elif event.content and event.turn_complete:
        finalise_bubble()
```

`partial=True` events come mid-generation; `turn_complete=True`
marks the end.

## SSE adapter

Server-Sent Events are the simplest wire format for text-only
streaming.

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI()

@app.post("/stream")
async def stream(body: dict):
    async def gen():
        async for ev in runner.run_async(...):
            if ev.content and ev.content.parts:
                for p in ev.content.parts:
                    if p.text:
                        yield f"data: {p.text}\n\n"
        yield "event: done\ndata: {}\n\n"
    return StreamingResponse(gen(), media_type="text/event-stream")
```

Browser side:

```javascript
const es = new EventSource("/stream");
es.onmessage = e => appendToken(e.data);
es.addEventListener("done", () => finaliseBubble());
```

## Streaming tool calls

When the model emits a tool call, you get an event with a
`function_call` part:

```python
for part in event.content.parts:
    if part.function_call:
        # Render a "calling X..." chip in the UI
        show_tool_chip(part.function_call.name)
```

After the tool executes, a `function_response` part arrives on a
subsequent event.

## Anti-patterns

- **Buffering the whole response.** Defeats the point of streaming.
- **Rendering raw HTML from model output.** Escape or render as
  Markdown.
- **Assuming one event = one visible token.** Models sometimes batch
  multiple tokens per event.

---

## See also

- `contributing/samples/streaming_agent`, `sse_agent`,
  `stream_fc_args` in `google/adk-python`.
