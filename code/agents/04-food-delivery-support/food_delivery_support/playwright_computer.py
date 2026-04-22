"""A minimal Playwright-backed BaseComputer for the computer-use agent.

Adapted from `google/adk-python/contributing/samples/computer_use/playwright.py`.
Kept small — only the methods the ADK ComputerUseToolset actually calls.
"""
from __future__ import annotations

import os
from typing import Tuple

try:
    from playwright.async_api import async_playwright, Browser, Page
except ImportError:  # pragma: no cover
    async_playwright = None  # type: ignore
    Browser = None  # type: ignore
    Page = None  # type: ignore

from google.adk.tools.computer_use.base_computer import BaseComputer


_KEY_MAP = {
    "enter": "Enter",
    "return": "Enter",
    "esc": "Escape",
    "escape": "Escape",
    "tab": "Tab",
    "backspace": "Backspace",
    "delete": "Delete",
    "up": "ArrowUp",
    "down": "ArrowDown",
    "left": "ArrowLeft",
    "right": "ArrowRight",
    "space": "Space",
}


class PlaywrightComputer(BaseComputer):
    """Drives a real Chromium page via Playwright.

    The mock merchant dashboard is served from the same FastAPI app at
    `http://127.0.0.1:8004/dashboard/`. The agent navigates there on
    start-up; the allowlist keeps it confined to that origin.
    """

    def __init__(
        self,
        screen_size: Tuple[int, int] = (1280, 860),
        start_url: str = "http://127.0.0.1:8004/dashboard/",
        headless: bool | None = None,
    ) -> None:
        if async_playwright is None:
            raise RuntimeError(
                "Playwright is not installed. Run `pip install playwright` "
                "and then `playwright install chromium`."
            )
        self._size = screen_size
        self._start_url = start_url
        self._headless = (
            headless
            if headless is not None
            else os.environ.get("HEADLESS", "false").lower() == "true"
        )
        self._pw = None
        self._browser: Browser | None = None
        self._page: Page | None = None

    async def initialize(self) -> None:
        self._pw = await async_playwright().start()
        self._browser = await self._pw.chromium.launch(
            headless=self._headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                f"--window-size={self._size[0]},{self._size[1]}",
            ],
        )
        context = await self._browser.new_context(
            viewport={"width": self._size[0], "height": self._size[1]}
        )
        self._page = await context.new_page()
        await self._page.goto(self._start_url, wait_until="domcontentloaded")

    async def close(self) -> None:
        if self._browser:
            await self._browser.close()
        if self._pw:
            await self._pw.stop()

    # ------- actions -------

    async def screenshot(self) -> bytes:
        assert self._page is not None
        return await self._page.screenshot(full_page=False, type="png")

    async def current_url(self) -> str:
        return self._page.url if self._page else ""

    async def click(self, x: int, y: int) -> None:
        assert self._page is not None
        await self._page.mouse.click(x, y)

    async def double_click(self, x: int, y: int) -> None:
        assert self._page is not None
        await self._page.mouse.dblclick(x, y)

    async def type_text(self, text: str) -> None:
        assert self._page is not None
        await self._page.keyboard.type(text, delay=16)

    async def key_press(self, key: str) -> None:
        assert self._page is not None
        normalized = _KEY_MAP.get(key.lower(), key)
        await self._page.keyboard.press(normalized)

    async def scroll(
        self, x: int, y: int, direction: str, magnitude: int = 5
    ) -> None:
        assert self._page is not None
        dy = magnitude * 80 * (1 if direction == "down" else -1)
        await self._page.mouse.move(x, y)
        await self._page.mouse.wheel(0, dy)

    async def navigate(self, url: str) -> None:
        assert self._page is not None
        await self._page.goto(url, wait_until="domcontentloaded")

    async def wait(self, milliseconds: int) -> None:
        assert self._page is not None
        await self._page.wait_for_timeout(milliseconds)
