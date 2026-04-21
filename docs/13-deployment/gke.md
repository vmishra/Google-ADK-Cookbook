# GKE

<span class="kicker">ch 13 · page 3 of 3</span>

GKE for when you need Kubernetes-native features: sidecars, custom
sandboxes, per-tenant pods, strict network policy, horizontal pod
autoscaling on signals Cloud Run cannot see.

---

## When to reach for GKE

- **Computer use at scale.** Each session needs its own browser
  context. GKE lets you put each browser in a pod with resource
  limits and cleanup.
- **Code execution.** Containerised sandbox per user. See the
  `gke_agent_sandbox` sample for the pattern.
- **Multi-tenant isolation.** Namespace per tenant, NetworkPolicies
  blocking cross-tenant traffic.
- **Regulated workloads.** PSP/PSA enforcement, CIS benchmark
  compliance.

## Minimal deploy

```yaml
# deploy/agent.yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: support-agent }
spec:
  replicas: 2
  selector: { matchLabels: { app: support-agent } }
  template:
    metadata: { labels: { app: support-agent } }
    spec:
      serviceAccountName: support-agent-sa
      containers:
        - name: agent
          image: gcr.io/my-project/support-agent:latest
          ports: [{ containerPort: 8080 }]
          env:
            - name: GOOGLE_GENAI_USE_VERTEXAI
              value: "true"
            - name: GOOGLE_CLOUD_PROJECT
              valueFrom: { fieldRef: { fieldPath: metadata.annotations['project'] } }
          resources:
            requests: { cpu: "500m", memory: "1Gi" }
            limits:   { cpu: "2",    memory: "4Gi" }
---
apiVersion: v1
kind: Service
metadata: { name: support-agent }
spec:
  selector: { app: support-agent }
  ports: [{ port: 80, targetPort: 8080 }]
```

## Workload Identity for Vertex auth

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: support-agent-sa
  annotations:
    iam.gke.io/gcp-service-account: support-agent@PROJECT.iam.gserviceaccount.com
```

Bind the GCP SA to the K8s SA with `gcloud iam service-accounts
add-iam-policy-binding`.

## Per-session browser pods (computer use)

For computer-use agents, one Playwright-per-pod per active session
is a clean pattern. A small orchestrator agent launches pods via the
K8s API, routes the user's session to its pod, and reaps pods on
session end.

```python
# simplified launcher tool
async def launch_browser_pod(session_id: str) -> dict:
    manifest = render_pod_manifest(session_id)
    await k8s.create_namespaced_pod("agents", manifest)
    return {"ok": True, "pod": f"cu-{session_id}"}
```

See `contributing/samples/gke_agent_sandbox`.

## Observability

- Prometheus for metrics.
- OpenTelemetry collector sidecar for traces.
- Cloud Logging agent at the node level for logs.

ADK emits everything over OTel; the collector routes where you want.

---

## Chapter recap

Three managed paths. One self-hosted. The agent code does not
change between them — only the services wired into the runner.

Next: [Chapter 14 — Safety](../14-safety/index.md).
