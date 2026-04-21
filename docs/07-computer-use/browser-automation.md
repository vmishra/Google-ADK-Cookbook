# Browser automation

<span class="kicker">ch 07 · page 1 of 2</span>

A working computer-use agent. The model sees a screenshot, emits
actions (click, type, scroll, navigate), Playwright executes them,
and the next screenshot is fed back.

---

## Install

```bash
pip install "google-adk[extensions]" playwright rich browserbase
playwright install-deps chromium
playwright install chromium
```

## The agent

```python
# computer_use_agent/agent.py
from google.adk.agents import Agent
from google.adk.tools.computer_use.computer_use_toolset import ComputerUseToolset
from .playwright_computer import PlaywrightComputer

root_agent = Agent(
    model="gemini-2.5-computer-use-preview-10-2025",
    name="computer_use_agent",
    description="Operates a browser to complete the user's task.",
    instruction=(
        "You operate a real browser. "
        "Think before each action. Say what you intend, then act. "
        "Never enter credentials unless the user has typed them in chat. "
        "If you are about to submit a form that spends money or deletes "
        "data, stop and ask for approval."),
    tools=[ComputerUseToolset(
        computer=PlaywrightComputer(
            screen_size=(1280, 936),
            profile_name="browser_profile_for_adk",
        ))],
)
```

## `PlaywrightComputer` — the `BaseComputer` implementation

A minimal shape (full version in `contributing/samples/computer_use/playwright.py`):

```python
from playwright.async_api import async_playwright
from google.adk.tools.computer_use.base_computer import BaseComputer

class PlaywrightComputer(BaseComputer):
    def __init__(self, screen_size=(1280, 720), profile_name=None):
        self._size = screen_size
        self._profile = profile_name
        self._browser = None
        self._page = None

    async def setup(self):
        self._pw = await async_playwright().start()
        self._browser = await self._pw.chromium.launch_persistent_context(
            user_data_dir=f"/tmp/{self._profile}",
            viewport={"width": self._size[0], "height": self._size[1]},
            headless=False)
        self._page = await self._browser.new_page()

    async def screenshot(self) -> bytes:
        return await self._page.screenshot()

    async def click(self, x: int, y: int): await self._page.mouse.click(x, y)
    async def double_click(self, x: int, y: int): await self._page.mouse.dblclick(x, y)
    async def type(self, text: str): await self._page.keyboard.type(text)
    async def press(self, keys: list[str]):
        for k in keys: await self._page.keyboard.press(k)
    async def scroll(self, x: int, y: int, dy: int):
        await self._page.mouse.wheel(0, dy)
    async def navigate(self, url: str): await self._page.goto(url)

    async def teardown(self):
        await self._browser.close(); await self._pw.stop()
```

## Running a task

```python
from google.adk.runners import InMemoryRunner
from google.genai import types

runner = InMemoryRunner(agent=root_agent, app_name="cu")
session = await runner.session_service.create_session(app_name="cu", user_id="u")

task = "Go to news.ycombinator.com and tell me the top three story titles."
async for event in runner.run_async(
    user_id="u", session_id=session.id,
    new_message=types.Content(role="user", parts=[types.Part(text=task)])):
    if event.content and event.content.parts:
        for p in event.content.parts:
            if p.text: print(p.text, end="", flush=True)
```

The model reads each screenshot, plans, and emits `click`, `type`,
or `navigate` actions through the toolset. No XPath, no selectors.

## What it does well

- Read-only reconnaissance tasks — *"look up this order status",
  "check if my flight is still on time"*.
- Form filling when the form is visible and fields are obvious.
- Multi-step navigation that would be brittle with a DOM-based
  automation library.

## What it struggles with

- Pages that require precise pixel-level interaction (custom map
  widgets, drag-and-drop editors).
- CAPTCHAs. By design.
- Long tasks (>30 steps). Screenshot tokens are expensive; decompose
  long tasks into named sub-tasks.

---

## See also

- `contributing/samples/computer_use`, `sandbox_computer_use`.
- [Safety loops](safety-loops.md) — the next page.
- [Examples 09 — Computer use](https://github.com/vmishra/Google-ADK-Cookbook/tree/main/examples/09-computer-use-browser).
