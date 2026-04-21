"""Pytest runner for the eval set."""
import pytest
from google.adk.evaluation.agent_evaluator import AgentEvaluator


@pytest.mark.asyncio
async def test_support_regression():
    await AgentEvaluator.evaluate(
        agent_module="examples.18-eval-suite",
        eval_dataset_file_path_or_dir="examples/18-eval-suite/eval",
        config_file_path="examples/18-eval-suite/eval/config.json",
    )
