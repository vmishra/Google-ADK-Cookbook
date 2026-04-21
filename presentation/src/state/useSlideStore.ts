import { create } from "zustand";
import type { Level } from "@/lib/levels";

export interface Slide {
  id: string;
  kicker: string;
  title: string;
  chapter: string;
}

interface SlideState {
  index: number;
  level: Level;
  playMode: boolean;
  paletteOpen: boolean;

  slides: Slide[];

  setIndex: (i: number) => void;
  next: () => void;
  prev: () => void;
  setLevel: (level: Level) => void;
  togglePlay: () => void;
  setPaletteOpen: (open: boolean) => void;
}

export const useSlideStore = create<SlideState>((set, get) => ({
  index: 0,
  level: "beginner",
  playMode: false,
  paletteOpen: false,

  slides: [], // populated by the registry at startup

  setIndex: (i) => set({ index: Math.max(0, Math.min(i, get().slides.length - 1)) }),
  next: () =>
    set((s) => ({ index: Math.min(s.index + 1, s.slides.length - 1) })),
  prev: () => set((s) => ({ index: Math.max(s.index - 1, 0) })),
  setLevel: (level) => set({ level }),
  togglePlay: () => set((s) => ({ playMode: !s.playMode })),
  setPaletteOpen: (open) => set({ paletteOpen: open }),
}));

export function registerSlides(slides: Slide[]) {
  useSlideStore.setState({ slides });
}
