// Website looks you can pick from Admin → Settings.
// The colors for each one live in app/globals.css under "Seasonal themes".

export const THEMES = ["auto", "classic", "spring", "summer", "fall", "winter"] as const;
export type Theme = (typeof THEMES)[number];
export type Look = Exclude<Theme, "auto">;

export const DEFAULT_THEME: Theme = "classic";

export const THEME_INFO: Record<Theme, { label: string; blurb: string; swatch: string[] }> = {
  auto: {
    label: "Automatic",
    blurb: "Switches by itself: spring Mar–May, summer Jun–Aug, fall Sep–Nov, winter Dec–Feb.",
    swatch: ["#f0a6b8", "#e9a23b", "#e07a2e", "#9fd3f0"],
  },
  classic: { label: "Classic", blurb: "The original green and gold, no seasonal touches.", swatch: ["#14321d", "#407628", "#e9a23b"] },
  spring: { label: "Spring", blurb: "Fresh greens with blossom pink and drifting petals.", swatch: ["#1d3f24", "#3f8a3a", "#f0a6b8"] },
  summer: { label: "Summer", blurb: "Bright green with a big warm sun.", swatch: ["#123a1c", "#2f8a2c", "#f5b324"] },
  fall: { label: "Fall", blurb: "Burnt orange and brown with falling leaves.", swatch: ["#3b2414", "#9a4a1c", "#e07a2e"] },
  winter: { label: "Winter", blurb: "Deep blue and ice with falling snow.", swatch: ["#142a3d", "#2f6690", "#9fd3f0"] },
};

export function isTheme(v: unknown): v is Theme {
  return typeof v === "string" && (THEMES as readonly string[]).includes(v);
}

/** The season for a YYYY-MM-DD date. */
export function seasonFor(ymd: string): Look {
  const m = Number(ymd.slice(5, 7));
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "fall";
  return "winter";
}

/** Turns the saved setting into the look to show today. */
export function lookFor(theme: Theme, todayYmd: string): Look {
  return theme === "auto" ? seasonFor(todayYmd) : theme;
}
