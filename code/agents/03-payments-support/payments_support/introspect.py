"""Walk an ADK agent tree and produce a JSON description the portal
can render as an interactive architecture diagram.

The shape we emit per node:

  {
    "name":          str,
    "kind":          "LlmAgent" | "SequentialAgent" | "ParallelAgent" | ...,
    "description":   short one-line summary
    "model":         str          (LlmAgent only)
    "instruction":   str          (full system prompt — the portal may
                                   truncate client-side)
    "output_key":    str          (LlmAgent that writes to state)
    "planner":       {"thinking_level": "MINIMAL"|"LOW"|"MEDIUM"|"HIGH"}
    "tools":         [
                       {"kind": "function", "name": str, "description": str},
                       {"kind": "agent_tool", "name": str, "wraps": str, ...},
                       {"kind": "ComputerUseToolset", ...},
                     ]
    "sub_agents":    [node, node, ...]   (transferable delegation)
  }

Tools surfaced as `agent_tool` reference a peer agent by name — the
portal can resolve that reference to draw the link.
"""
from __future__ import annotations

from typing import Any


def introspect(agent: Any, depth: int = 0, max_depth: int = 8) -> dict:
    """Return the agent tree rooted at ``agent`` as a JSON-ready dict."""
    node: dict = {
        "name": getattr(agent, "name", "?"),
        "kind": type(agent).__name__,
        "description": (getattr(agent, "description", "") or "")[:320],
    }

    model = getattr(agent, "model", None)
    if model:
        node["model"] = str(model)

    instruction = getattr(agent, "instruction", None)
    if instruction:
        # Instruction can be a long multi-line string. Keep it intact;
        # the portal presents it inside a scrollable block.
        node["instruction"] = str(instruction)

    output_key = getattr(agent, "output_key", None)
    if output_key:
        node["output_key"] = output_key

    planner = getattr(agent, "planner", None)
    if planner is not None:
        node["planner"] = _describe_planner(planner)

    tools = getattr(agent, "tools", None) or []
    if tools:
        node["tools"] = [_describe_tool(t) for t in tools]

    sub_agents = getattr(agent, "sub_agents", None) or []
    if sub_agents and depth < max_depth:
        node["sub_agents"] = [
            introspect(s, depth + 1, max_depth) for s in sub_agents
        ]

    return node


def _describe_planner(planner: Any) -> dict:
    """Extract the thinking level from a BuiltInPlanner."""
    d: dict = {"kind": type(planner).__name__}
    tc = getattr(planner, "thinking_config", None)
    if tc is not None:
        level = getattr(tc, "thinking_level", None)
        if level is not None:
            d["thinking_level"] = getattr(level, "name", str(level))
        include = getattr(tc, "include_thoughts", None)
        if include is not None:
            d["include_thoughts"] = bool(include)
        budget = getattr(tc, "thinking_budget", None)
        if budget is not None:
            d["thinking_budget"] = int(budget)
    return d


def _describe_tool(tool: Any) -> dict:
    """Classify a tool entry. Three shapes:

      1. bare Python function — canonical ADK tool.
      2. AgentTool — wraps a peer agent (composition, not transfer).
      3. Toolset (e.g. ComputerUseToolset) — opaque handle to a bundle.
    """
    # AgentTool wraps another agent.
    inner = getattr(tool, "agent", None)
    if inner is not None:
        return {
            "kind": "agent_tool",
            "name": getattr(inner, "name", "agent_tool"),
            "wraps": getattr(inner, "name", "?"),
            "description": (getattr(inner, "description", "") or "")[:240],
            "wraps_model": getattr(inner, "model", None),
        }

    # Bare Python function.
    if callable(tool) and hasattr(tool, "__name__"):
        doc = (tool.__doc__ or "").strip()
        # Use the first sentence / paragraph as the description.
        first_para = doc.split("\n\n", 1)[0] if doc else ""
        return {
            "kind": "function",
            "name": tool.__name__,
            "description": first_para[:320],
        }

    # Toolset (ComputerUseToolset, MCPToolset, etc.) — introspect what
    # we can.
    return {
        "kind": type(tool).__name__,
        "name": type(tool).__name__,
        "description": (getattr(tool, "description", "") or "")[:240],
    }
