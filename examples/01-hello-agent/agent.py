"""A single LlmAgent with two function tools."""
import asyncio
import random

from google.adk.agents import LlmAgent
from google.adk.runners import InMemoryRunner
from google.genai import types


def roll_die(sides: int) -> int:
    """Roll a die with the given number of sides and return the result.

    Args:
      sides: the number of sides on the die, e.g. 6 or 20.

    Returns:
      A random integer between 1 and sides, inclusive.
    """
    return random.randint(1, max(2, sides))


def check_prime(n: int) -> bool:
    """Return True if n is prime."""
    if n < 2:
        return False
    return all(n % i for i in range(2, int(n ** 0.5) + 1))


root_agent = LlmAgent(
    name="hello_agent",
    model="gemini-2.5-flash",
    description="Rolls dice and checks primality.",
    instruction=(
        "You are a concise assistant. When the user asks for a roll, "
        "call roll_die. When they ask about primality, call check_prime. "
        "Respond in one short sentence."),
    tools=[roll_die, check_prime],
)


async def _main():
    runner = InMemoryRunner(agent=root_agent, app_name="hello")
    session = await runner.session_service.create_session(
        app_name="hello", user_id="demo")
    prompt = "Roll a 20-sided die and tell me if the result is prime."
    async for event in runner.run_async(
        user_id="demo", session_id=session.id,
        new_message=types.Content(
            role="user", parts=[types.Part(text=prompt)])):
        if event.content and event.content.parts:
            for part in event.content.parts:
                if part.text:
                    print(part.text, end="", flush=True)
    print()


if __name__ == "__main__":
    asyncio.run(_main())
