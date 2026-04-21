---
name: weather
description: >
  Answers weather questions. Use for current conditions or a short
  forecast. Calls get_weather for the city value; consults state's
  last_city when the user says "there" or "it".
---

# Weather skill

## When to use

A user question is weather-related if it references temperature, sky,
precipitation, wind, or a forecast window.

## Procedure

1. Identify the city. If the user says "here" or "there", read
   `state['last_city']`. If both are missing, ask.
2. Call `get_weather(city)`.
3. Respond briefly. One sentence for current; bullets for forecasts.
4. For unit conversion, see `references/UNITS.md`.
