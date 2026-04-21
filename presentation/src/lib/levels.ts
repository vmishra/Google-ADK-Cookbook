export type Level = "beginner" | "intermediate" | "advanced";

export const LEVEL_ORDER: Level[] = ["beginner", "intermediate", "advanced"];

export const LEVEL_LABEL: Record<Level, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const LEVEL_SHORT: Record<Level, string> = {
  beginner: "L1",
  intermediate: "L2",
  advanced: "L3",
};
