# 18 — eval-suite

A support agent with a regression eval set and a pytest runner.
Covers Chapter 12.

## Run

```bash
pip install -r requirements.txt
adk eval . eval/regression.evalset.json --config_file_path eval/config.json
pytest test_eval.py
```
