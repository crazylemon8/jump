import { EarthyTheme } from "./EarthyTheme";
import type { WorldTheme } from "./types";

export function createDefaultWorldTheme(): WorldTheme {
  return new EarthyTheme();
}

export type { WorldTheme } from "./types";
