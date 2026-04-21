# CI integration

<span class="kicker">ch 12 · page 3 of 3</span>

The `adk eval` CLI returns non-zero on failure. Wire it into the
job your PR has to pass.

---

## GitHub Actions

```yaml
# .github/workflows/eval.yml
name: eval
on: [pull_request]
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.11" }
      - run: pip install -e ".[eval]"
      - uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF }}
          service_account: ${{ secrets.SA_EMAIL }}
      - run: |
          adk eval agents/support \
            agents/support/eval/regression.evalset.json \
            --config_file_path agents/support/eval/config.json \
            --print_detailed_results
```

Use workload identity federation — committed service-account keys
are a liability.

## pytest integration

```python
# tests/test_support_eval.py
import pytest
from google.adk.evaluation.agent_evaluator import AgentEvaluator


@pytest.mark.asyncio
async def test_regression():
    await AgentEvaluator.evaluate(
        agent_module="agents.support",
        eval_dataset_file_path_or_dir="agents/support/eval",
        config_file_path="agents/support/eval/config.json",
    )
```

Fits into any existing pytest runner. The advantage over the CLI:
you can parameterize across models (run the same suite on Flash
and Pro, block merges that regress either).

## Cloud Build

```yaml
# cloudbuild.yaml
steps:
  - name: python:3.11
    entrypoint: bash
    args:
      - -c
      - |
        pip install -e ".[eval]"
        adk eval agents/support agents/support/eval/ \
          --config_file_path agents/support/eval/config.json
```

## What to gate on

- **Merges to main:** trajectory + rubric, fast suite (< 5 minutes).
- **Nightly:** full eval set, all metrics, larger sample.
- **Model upgrades:** side-by-side eval of Flash vs Pro, block
  regressions.

## Evaluation is a rolling target

Add a case every time a bug escapes to production. A growing eval
set is the strongest statement a team makes about their agent's
quality over time.

---

## See also

- `contributing/samples/*/eval` — every production-grade sample
  ships evals.
