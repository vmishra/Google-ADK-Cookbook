# Google ADK · presented

A field tool for Google Cloud architects. A fast, animated,
single-page presentation of what ADK is and what it can do — built
for the moment a customer asks *"show me what this does."*

Not a slide deck. A live surface.

---

## Run locally

```bash
cd presentation
npm install
npm run dev
```

Open http://localhost:5173.

## Ship

```bash
npm run build      # static output in presentation/dist/
npm run preview    # serve the build locally
```

The build is static. Host on GitHub Pages, Cloud Storage + CDN,
or drop it on Vercel/Netlify.

## Structure

```
presentation/
  index.html                 Font preloads, dark-first
  src/
    main.tsx                 Entry
    App.tsx                  Shell + slide router
    styles/
      tokens.css             OKLCH palette (DESIGN.md §2)
      globals.css            Base styles, fonts, reset
    lib/
      motion.ts              Spring presets (DESIGN.md §4.2)
      cn.ts                  Class composition helper
    state/
      useSlideStore.ts       Zustand store: slide, level, playing
    components/
      primitives/            Button, Chip, Panel, Kbd (DESIGN.md §9)
      shell/                 Topbar, Sidebar, dual-pane Shell
      diagrams/              Animated arrow + node + flow primitives
      video/                 Scene controller for Play Video mode
    slides/                  One file per slide
```

## Design contract

This sub-app follows `/Users/vikas/Desktop/Project/Agentic-Concierge/DESIGN.md`
as a specification. Notable rules:

- OKLCH for every colour. One accent (champagne, hue ~85).
- Geist for UI, Fraunces italic for editorial, Geist Mono for numerics.
- Springs, not curves. `stiffness: 260, damping: 28, mass: 0.6`.
- No emoji, no exclamation marks, no sparkle icons.
- Progressive disclosure. Levels: beginner → intermediate → advanced.
- Restraint is the signature.

## Levels

Each slide supports three levels:

- **Beginner** — one concept, one animation, minimal legend.
- **Intermediate** — adds state flow, callbacks, event stream.
- **Advanced** — the full harness perspective: plugins, services,
  per-tenant policy, A2A federation.

Switch with the level picker in the topbar or with `1` / `2` / `3`.

## Play Video

Press `V` or click the Play pill in the topbar. The canvas switches
to a cinematic sequence that walks a single request through every
ADK primitive — user message → runner → session → coordinator →
specialist → tool → memory → response. Code samples surface at the
right beats; the left pane narrates.

The timeline is scrubbable. Pause, rewind, replay any scene.
