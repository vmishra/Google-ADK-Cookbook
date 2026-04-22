"""Playwright-backed `BaseComputer` for ADK's ComputerUseToolset.

Implements the concrete methods the installed ADK expects:

    open_web_browser, navigate, go_back, go_forward,
    click_at, hover_at, type_text_at, key_combination,
    scroll_at, scroll_document, drag_and_drop, search, wait,
    current_state, environment, screen_size, initialize, close.

Each action returns a `ComputerState(screenshot=..., url=...)` so the
model can reason about what changed. Screenshots are PNG bytes.
"""
from __future__ import annotations

import os
from typing import Literal

try:
    from playwright.async_api import Browser, Page, async_playwright
except ImportError:  # pragma: no cover
    async_playwright = None  # type: ignore
    Browser = None  # type: ignore
    Page = None  # type: ignore

from google.adk.tools.computer_use.base_computer import (
    BaseComputer,
    ComputerEnvironment,
    ComputerState,
)


_KEY_MAP: dict[str, str] = {
    "enter": "Enter", "return": "Enter",
    "esc": "Escape", "escape": "Escape",
    "tab": "Tab", "backspace": "Backspace", "delete": "Delete",
    "up": "ArrowUp", "down": "ArrowDown",
    "left": "ArrowLeft", "right": "ArrowRight",
    "space": "Space",
    "ctrl": "Control", "cmd": "Meta", "meta": "Meta",
    "alt": "Alt", "shift": "Shift",
}


def _norm_key(k: str) -> str:
    return _KEY_MAP.get(k.lower(), k if len(k) > 1 else k)


class PlaywrightComputer(BaseComputer):
    """Drives a real Chromium page for the ADK computer-use loop."""

    def __init__(
        self,
        screen_size: tuple[int, int] = (1280, 860),
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

    # ---------- lifecycle

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

    # ---------- static metadata

    def environment(self) -> ComputerEnvironment:
        return ComputerEnvironment.ENVIRONMENT_BROWSER

    def screen_size(self) -> tuple[int, int]:
        return self._size

    # ---------- snapshot

    async def current_state(self) -> ComputerState:
        if self._page is None:
            return ComputerState(screenshot=b"", url="")
        shot = await self._page.screenshot(full_page=False, type="png")
        return ComputerState(screenshot=shot, url=self._page.url)

    # ---------- browser navigation

    async def open_web_browser(self) -> ComputerState:
        # Already open after initialize(); just return the current state.
        return await self.current_state()

    async def navigate(self, url: str) -> ComputerState:
        assert self._page is not None
        await self._page.goto(url, wait_until="domcontentloaded")
        return await self.current_state()

    async def go_back(self) -> ComputerState:
        assert self._page is not None
        await self._page.go_back(wait_until="domcontentloaded")
        return await self.current_state()

    async def go_forward(self) -> ComputerState:
        assert self._page is not None
        await self._page.go_forward(wait_until="domcontentloaded")
        return await self.current_state()

    # ---------- mouse + keyboard

    async def click_at(self, x: int, y: int) -> ComputerState:
        assert self._page is not None
        await self._page.mouse.click(x, y)
        await self._page.wait_for_timeout(120)
        return await self.current_state()

    async def hover_at(self, x: int, y: int) -> ComputerState:
        assert self._page is not None
        await self._page.mouse.move(x, y)
        return await self.current_state()

    async def type_text_at(
        self,
        x: int,
        y: int,
        text: str,
        press_enter: bool = True,
        clear_before_typing: bool = True,
    ) -> ComputerState:
        assert self._page is not None
        await self._page.mouse.click(x, y)
        if clear_before_typing:
            await self._page.keyboard.press("Meta+A")
            await self._page.keyboard.press("Delete")
        await self._page.keyboard.type(text, delay=16)
        if press_enter:
            await self._page.keyboard.press("Enter")
        return await self.current_state()

    async def key_combination(self, keys: list[str]) -> ComputerState:
        assert self._page is not None
        combo = "+".join(_norm_key(k) for k in keys)
        await self._page.keyboard.press(combo)
        return await self.current_state()

    # ---------- scrolling

    async def scroll_at(
        self,
        x: int,
        y: int,
        direction: Literal["up", "down", "left", "right"],
        magnitude: int,
    ) -> ComputerState:
        assert self._page is not None
        dx = 0
        dy = 0
        step = 80 * max(1, magnitude)
        if direction == "up": dy = -step
        elif direction == "down": dy = step
        elif direction == "left": dx = -step
        elif direction == "right": dx = step
        await self._page.mouse.move(x, y)
        await self._page.mouse.wheel(dx, dy)
        return await self.current_state()

    async def scroll_document(
        self, direction: Literal["up", "down", "left", "right"]
    ) -> ComputerState:
        assert self._page is not None
        viewport = await self._page.viewport_size()
        cx = (viewport["width"] if viewport else self._size[0]) // 2
        cy = (viewport["height"] if viewport else self._size[1]) // 2
        return await self.scroll_at(cx, cy, direction, magnitude=6)

    # ---------- misc

    async def drag_and_drop(
        self, x: int, y: int, destination_x: int, destination_y: int
    ) -> ComputerState:
        assert self._page is not None
        await self._page.mouse.move(x, y)
        await self._page.mouse.down()
        await self._page.mouse.move(destination_x, destination_y, steps=12)
        await self._page.mouse.up()
        return await self.current_state()

    async def search(self) -> ComputerState:
        # Used by the model to perform a web search. Point it at the dashboard
        # instead — this agent should not wander off into Google.
        return await self.current_state()

    async def wait(self, seconds: int) -> ComputerState:
        assert self._page is not None
        await self._page.wait_for_timeout(max(0, seconds) * 1000)
        return await self.current_state()
