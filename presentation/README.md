# ADK, in motion

An interactive exhibit of the Agent Development Kit. A surface you
explore rather than read.

Half the screen narrates; the other half renders the concept as a
living diagram — data moving, agents talking, state changing in
real time. Press <kbd>V</kbd> and a single request walks through
every primitive, turn by turn, as one cinematic sequence.

Three depths are hidden inside each scene. The surface is simple.
The next two layers unfold when you ask.

---

## Run

```bash
cd presentation
npm install
npm run dev
```

Open http://localhost:5173.

### Managed via script

From the repo root, `presentation.sh` wraps the dev server with a
PID file so it runs detached and survives your shell. It installs
dependencies the first time (and whenever `package.json` or the
lockfile changes).

```bash
./presentation.sh start     # install if needed, launch in background
./presentation.sh status    # is it running? on what URL?
./presentation.sh logs      # tail the dev server log
./presentation.sh stop
./presentation.sh restart
```

State lives in `presentation/.dev-server.pid` and
`presentation/.dev-server.log`.

## Ship

```bash
npm run build      # static output in presentation/dist/
npm run preview
```

Pure static. Host anywhere.

## Structure

```
presentation/
  index.html
  src/
    main.tsx
    App.tsx
    styles/            tokens.css · globals.css
    lib/               motion presets, utilities
    state/             slide + level + play mode
    components/
      primitives/      Button, Chip, Panel, Kbd, StatusDot
      shell/           Topbar, Sidebar, CommandPalette, Shell, Slide
      diagrams/        Canvas, Node, Edge, Annotation, CodeCard
      video/           scenes storyboard + VideoStage
    slides/            fourteen scenes, one file each
```

## Keyboard

| Key | Effect |
|---|---|
| <kbd>→</kbd> / <kbd>←</kbd> | Next / previous scene |
| <kbd>1</kbd> / <kbd>2</kbd> / <kbd>3</kbd> | Depth — beginner · intermediate · advanced |
| <kbd>V</kbd> | Toggle the traced-request sequence |
| <kbd>Space</kbd> | Inside trace mode: pause / resume |
| <kbd>R</kbd> | Restart the trace |
| <kbd>⌘</kbd><kbd>K</kbd> | Jump to any scene |
| <kbd>Esc</kbd> | Close overlays |

## Deploy

The output is a plain static bundle under `dist/`. Three paths:

- **GitHub Pages.** Add a workflow that runs `npm ci && npm run build`
  and uploads `dist/` as a Pages artifact. Set `base: "/your-repo/"`
  in `vite.config.ts` if you are not at the site root.
- **Cloud Storage + CDN.** Sync `dist/` to a bucket; front with
  Cloud CDN. Cache assets aggressively; `index.html` with no-cache.
- **Any static host.** Netlify, Vercel, Cloudflare Pages —
  point at the repo, `dist/` is the publish directory.

## Design

Every value follows
`/Users/vikas/Desktop/Project/Agentic-Concierge/DESIGN.md`: OKLCH
palette, single warm champagne accent, Geist for UI with Fraunces
italic reserved for editorial moments, springs not curves, no emoji,
no exclamation marks, progressive disclosure.
