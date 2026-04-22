/* Motion presets, per DESIGN.md §4.2 — copied verbatim.
   Springs, not curves, for every state transition. */

import type { Transition, Variants } from "motion/react";

export const spring: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 28,
  mass: 0.6,
};

export const springSoft: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 32,
  mass: 0.7,
};

export const springCrisp: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 30,
  mass: 0.5,
};

export const quickOut: Transition = {
  duration: 0.18,
  ease: [0.2, 0.7, 0.2, 1],
};

export const slowIn: Transition = {
  duration: 0.8,
  ease: [0.2, 0.7, 0.2, 1],
};

/* Fade + small lift. The workhorse. */
export const fadeRise: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: spring },
  exit: { opacity: 0, y: -4, transition: quickOut },
};

export const fadeScale: Variants = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1, transition: spring },
  exit: { opacity: 0, scale: 0.98, transition: quickOut },
};

export const chipEnter: Variants = {
  initial: { opacity: 0, y: 4, scale: 0.96 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...spring, stiffness: 320 },
  },
  exit: { opacity: 0, scale: 0.96, transition: quickOut },
};

/* Staggered list used for deliberate reveals (not initial page mount). */
export const stagger = (gap = 0.04): Variants => ({
  animate: { transition: { staggerChildren: gap } },
});

/* Cinematic slow beats — only for Play Video. */
export const beat = {
  arrive: 0.9,
  draw: 1.1,
  dwell: 1.8,
} as const;
