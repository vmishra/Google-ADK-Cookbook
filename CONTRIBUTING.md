# Contributing

Contributions that keep the cookbook accurate and practical are welcome.
This is not a marketing site; it is a reference.

## What we accept

- **Corrections.** If an import path, API signature, or model ID has
  drifted, open a PR with the fix and a link to the current docs.
- **New examples.** Follow the structure of an existing folder under
  `examples/`. One agent per folder, one README, one requirements file.
- **New chapters.** Only after discussion in an issue. The chapter list is
  deliberate and not open-ended.
- **Translations.** Open an issue first so we can set up the
  `docs/<lang>/` layout.

## What we do not accept

- Marketing language. See the voice notes below.
- Posts that argue "framework X is bad." We compare where comparison is
  useful (Chapter 17) — we do not campaign.
- Examples that will not run. Every code block in this repo should either
  be copy-pasteable or clearly marked as a sketch.

## Voice and style

- No exclamation marks. No emoji in prose, code comments, or commit
  messages.
- Sentence case on headings.
- Describe what the code does and, when it is non-obvious, *why*. Avoid
  restating the obvious ("this function returns a string").
- Prefer `observational` over `instructional` tone. *"The runner batches
  events…"* beats *"You need to remember that the runner batches…"*.
- Numbers in tables and telemetry lines use tabular-nums. In Markdown,
  just leave them as plain digits — the site build applies the CSS.

## Pull request checklist

- [ ] Code runs against the ADK version pinned in the chapter header.
- [ ] Imports are namespaced (`from google.adk import Agent`, not
      `from adk import Agent`).
- [ ] No secrets. If an example needs credentials, it reads from
      environment variables and documents them in its README.
- [ ] New chapters are added to both `README.md` and `mkdocs.yml`.
- [ ] Commit messages are readable in isolation. Squash fixup commits
      before review.

## Running the site locally

```bash
pip install mkdocs-material
mkdocs serve
```

Open `http://127.0.0.1:8000` and edit Markdown files directly — MkDocs
hot-reloads.

## Filing an issue

Include:

1. ADK version (`pip show google-adk`).
2. Which chapter or example.
3. What you expected versus what happened.
4. A minimal reproduction if the bug is in example code.

Thank you for reading this far.
