# Services cheatsheet

| Kind | Dev (in-process) | Self-hosted | Managed |
|---|---|---|---|
| Session | `InMemorySessionService` | `DatabaseSessionService(db_url=...)` | `VertexAiSessionService(project, location, agent_engine_id)` |
| Memory  | `InMemoryMemoryService`   | *(roll your own)*                   | `VertexAiMemoryBankService(project, location, agent_engine_id)` |
| Artifact| `InMemoryArtifactService` | *(roll your own)*                   | `GcsArtifactService(bucket=...)` |
| Credential | `InMemoryCredentialService` | *(roll your own)*                | `SecretManagerCredentialService(project=...)` |

## Wiring

```python
from google.adk.runners import Runner

runner = Runner(
    agent=root_agent,
    session_service=...,
    memory_service=...,
    artifact_service=...,
    credential_service=...,
    plugins=[...],
)
```

## Common backends by environment

| Env | Session | Memory | Artifact |
|---|---|---|---|
| Dev laptop | InMemory | InMemory | InMemory |
| Cloud Run single-instance | InMemory or Database | InMemory or VertexMemBank | Gcs |
| Cloud Run autoscaled | Database or VertexAiSession | VertexMemBank | Gcs |
| Agent Engine | VertexAiSession (implicit) | VertexMemBank | Gcs (implicit) |
| GKE sandboxed | Database or VertexAiSession | VertexMemBank | Gcs |

Swap services by changing one line in the runner factory.
