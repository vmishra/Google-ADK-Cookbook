# 20 — production-template

A starter template for production. Includes:

- A `Runner` wired to `VertexAiSessionService` + `VertexAiMemoryBankService`.
- A platform plugin composing rate limit, audit, tracing, retry.
- A FastAPI server with `/v1/sessions` and streaming events.
- `.env.example`, `pyproject.toml`, Dockerfile.

Treat this as a starting point for a real project.
