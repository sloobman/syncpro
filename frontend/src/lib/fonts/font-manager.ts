export interface FontItem {
  id: string;
  name: string;
  family: string;
  category: "sans" | "serif" | "mono" | "custom";
  sourceType: "system" | "google" | "custom_file";
  fileUrl?: string;
}

export const BUILT_IN_FONTS: FontItem[] = [
  // Sans-Serif
  {
    id: "inter",
    name: "Inter (Стандартный)",
    family: "Inter, system-ui, -apple-system, sans-serif",
    category: "sans",
    sourceType: "system",
  },
  {
    id: "roboto",
    name: "Roboto",
    family: "Roboto, system-ui, -apple-system, sans-serif",
    category: "sans",
    sourceType: "google",
    fileUrl: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap",
  },
  {
    id: "montserrat",
    name: "Montserrat",
    family: "Montserrat, system-ui, -apple-system, sans-serif",
    category: "sans",
    sourceType: "google",
    fileUrl: "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap",
  },
  {
    id: "open-sans",
    name: "Open Sans",
    family: "'Open Sans', system-ui, -apple-system, sans-serif",
    category: "sans",
    sourceType: "google",
    fileUrl: "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap",
  },

  // Serif
  {
    id: "merriweather",
    name: "Merriweather",
    family: "Merriweather, Georgia, serif",
    category: "serif",
    sourceType: "google",
    fileUrl: "https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap",
  },
  {
    id: "playfair",
    name: "Playfair Display",
    family: "'Playfair Display', Georgia, serif",
    category: "serif",
    sourceType: "google",
    fileUrl: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap",
  },
  {
    id: "lora",
    name: "Lora",
    family: "Lora, Georgia, serif",
    category: "serif",
    sourceType: "google",
    fileUrl: "https://fonts.googleapis.com/css2?family=Lora:wght@400;600&display=swap",
  },
  {
    id: "georgia",
    name: "Georgia",
    family: "Georgia, serif",
    category: "serif",
    sourceType: "system",
  },

  // Monospace
  {
    id: "jetbrains-mono",
    name: "JetBrains Mono",
    family: "'JetBrains Mono', monospace",
    category: "mono",
    sourceType: "google",
    fileUrl: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap",
  },
  {
    id: "fira-code",
    name: "Fira Code",
    family: "'Fira Code', monospace",
    category: "mono",
    sourceType: "google",
    fileUrl: "https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&display=swap",
  },
];

/**
 * Normalizes a font family string for robust comparison.
 * Extracts the primary font family name, strips quotes, and lowercases.
 * e.g., "'Impact', sans-serif" -> "impact", "\"Open Sans\", sans-serif" -> "open sans"
 */
export function normalizeFontFamily(font: string): string {
  if (!font) return "";
  const first = font.split(",")[0].trim().replace(/['"]/g, "").toLowerCase();
  return first;
}

/**
 * Matches a font string to an item in allFonts by primary family name.
 */
export function matchFontFamily(font: string, allFonts: FontItem[]): string {
  if (!font) return allFonts[0]?.family || "Inter, system-ui, -apple-system, sans-serif";
  const norm = normalizeFontFamily(font);
  const found = allFonts.find((f) => normalizeFontFamily(f.family) === norm);
  if (found) return found.family;
  return font;
}

export class FontManager {
  private static loadedFamilies = new Set<string>();

  /**
   * Dynamically loads a font into the document if not already loaded.
   * Performs strict sanitization on family name and URL to prevent CSS injection.
   */
  static loadFont(font: { family: string; sourceType: string; fileUrl?: string }): void {
    if (typeof window === "undefined" || !font.family) return;

    // Sanitize family name: only letters, numbers, hyphens, underscores and spaces
    const baseFamily = font.family.split(",")[0].replace(/[^a-zA-Z0-9\s-_]/g, "").trim();
    if (!baseFamily || this.loadedFamilies.has(baseFamily)) return;

    this.loadedFamilies.add(baseFamily);

    if (font.sourceType === "google" && font.fileUrl) {
      // Validate Google Fonts URL scheme
      if (font.fileUrl.startsWith("https://fonts.googleapis.com/css2?family=")) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = font.fileUrl;
        document.head.appendChild(link);
      }
    } else if (font.sourceType === "custom_file" && font.fileUrl) {
      // Sanitize URL: only allow relative or valid HTTPS endpoints
      const cleanUrl = font.fileUrl.replace(/["'<>]/g, "").trim();
      if (cleanUrl.startsWith("/api/files/") || cleanUrl.startsWith("https://")) {
        const style = document.createElement("style");
        style.textContent = `
          @font-face {
            font-family: '${baseFamily}';
            src: url('${cleanUrl}');
            font-weight: 400 700;
            font-display: swap;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }

  /**
   * Preloads all built-in fonts.
   */
  static preloadBuiltInFonts(): void {
    if (typeof window === "undefined") return;
    for (const f of BUILT_IN_FONTS) {
      if (f.sourceType === "google" && f.fileUrl) {
        this.loadFont(f);
      }
    }
  }
}
