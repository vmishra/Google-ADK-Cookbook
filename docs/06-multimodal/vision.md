# Vision

<span class="kicker">ch 06 · page 4 of 5</span>

Images, PDFs, and video frames are first-class inputs in Gemini.
You pass them as `Part`s alongside text; the model reasons over
them.

---

## Passing an image in

```python
from google.genai import types

with open("receipt.jpg", "rb") as f:
    image_part = types.Part.from_bytes(data=f.read(), mime_type="image/jpeg")

msg = types.Content(role="user", parts=[
    types.Part(text="Extract the total, tip, and date."),
    image_part,
])
async for event in runner.run_async(user_id="u", session_id=sid, new_message=msg):
    ...
```

The model extracts data from the image and can combine it with tool
calls.

## Pointing at GCS

For large files or files already stored remotely, use `file_data`:

```python
image_part = types.Part(file_data=types.FileData(
    file_uri="gs://my-bucket/receipts/42.jpg",
    mime_type="image/jpeg"))
```

This is the preferred path for PDFs over 10MB and for long videos.

## Vision tool pattern

Wrap the vision workflow as a tool for reuse:

```python
def analyse_receipt(image_gcs_uri: str, tool_context: ToolContext) -> dict:
    """Given a GCS URI to a receipt image, return extracted fields."""
    image_part = types.Part(file_data=types.FileData(
        file_uri=image_gcs_uri, mime_type="image/jpeg"))
    # Call a vision-focused sub-agent with this part
    ...
```

## Multimodal tool results

Tools can also return images:

```python
def render_chart(data: list[dict]) -> types.Part:
    """Render a chart and return the PNG part."""
    png_bytes = render_plot(data)
    return types.Part.from_bytes(data=png_bytes, mime_type="image/png")
```

The model sees the image as a tool result and can reason over it —
closing the loop for "draw a chart and explain what it shows".

## Video

Pass a `video/mp4` or `video/mov` part. Gemini 2.5 handles short
clips inline; longer clips should go through the Vertex AI video
ingestion pipeline first.

```python
video_part = types.Part(file_data=types.FileData(
    file_uri="gs://my-bucket/call_recording.mp4",
    mime_type="video/mp4"))
```

## Live video input

In `run_live`, video frames can be streamed the same way as audio —
each frame is a part on a `LiveRequest`. See the
`live_bidi_streaming_single_agent` sample for the framing.

---

## See also

- `contributing/samples/vision_agent`, `vision_agent_simple`,
  `multimodal_tool_results`, `structured_output_multimodal`.
- [Examples 13 — Vision analyzer](https://github.com/vmishra/Google-ADK-Cookbook/tree/main/examples/13-vision-analyzer).
