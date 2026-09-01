import type { PracticeColor } from "@starter/shared";

const HEX: Record<PracticeColor, string> = {
  blue: "#7fa8d4",
  periwinkle: "#8b7fd4",
  teal: "#6fbfa8",
  violet: "#c9a5f0",
  amber: "#e0a458",
};

/** Literal hex for a practice's colour — SVG strokes need a real value. */
export function practiceHex(color: PracticeColor | string): string {
  return HEX[color as PracticeColor] ?? HEX.periwinkle;
}
