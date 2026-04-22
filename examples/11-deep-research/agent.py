"""Planner / parallel research / synthesise / write, in a refinement loop."""
from pydantic import BaseModel

from google.adk.agents import LlmAgent, SequentialAgent, ParallelAgent, LoopAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.tools import google_search
from google.adk.tools.load_memory_tool import load_memory_tool


class Plan(BaseModel):
    steps: list[str]


planner = LlmAgent(
    name="planner", model="gemini-3.1-pro-preview",
    instruction=(
        "Break the user's question into 3-6 specific, search-engine-able "
        "steps. Prefer recent sources."),
    output_schema=Plan, output_key="plan")

web_researcher = LlmAgent(
    name="web_researcher", model="gemini-3-flash-preview",
    instruction=(
        "Execute each step in state['plan'].steps using google_search. "
        "Write 3-5 bullets per step to state['web_notes']."),
    tools=[google_search], output_key="web_notes")

memory_researcher = LlmAgent(
    name="memory_researcher", model="gemini-3-flash-preview",
    instruction=(
        "Search long-term memory for prior findings on the same topic. "
        "Write to state['mem_notes']. Skip if nothing relevant."),
    tools=[load_memory_tool], output_key="mem_notes")

fan_out = ParallelAgent(name="fan_out",
                        sub_agents=[web_researcher, memory_researcher])


def stop_if_enough(cc: CallbackContext):
    if cc.state.get("coverage_score", 0.0) >= 0.8:
        cc.event_actions.escalate = True


synthesiser = LlmAgent(
    name="synthesiser", model="gemini-3.1-pro-preview",
    instruction=(
        "Given state['plan'], state['web_notes'], state['mem_notes'], "
        "rate coverage 0-1 in state['coverage_score']. Below 0.8, revise "
        "state['plan'] with more steps. Otherwise stop."),
    after_agent_callback=stop_if_enough,
    output_key="synthesis")

loop = LoopAgent(
    name="research_loop",
    sub_agent=SequentialAgent(name="one_pass",
                              sub_agents=[fan_out, synthesiser]),
    max_iterations=3)

writer = LlmAgent(
    name="writer", model="gemini-3.1-pro-preview",
    instruction=(
        "Write a 400-word report answering the user question using "
        "state['web_notes'] and state['mem_notes']. Cite inline as [n]. "
        "Include a Sources section at the end."))


root_agent = SequentialAgent(
    name="deep_research",
    sub_agents=[planner, loop, writer])
