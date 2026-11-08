export type PageFormat = "a4" | "a5" | "letter";
export type PageOrientation = "portrait" | "landscape";
export type PageMargins = "normal" | "narrow" | "wide";

export interface PageLayoutConfig {
  format: PageFormat;
  orientation: PageOrientation;
  margins: PageMargins;
  zoom: number; // 0.75 | 1.0 | 1.25 | 1.5
}

export interface PageDimension {
  widthPx: number;
  heightPx: number;
  label: string;
}

export const PAGE_DIMENSIONS: Record<PageFormat, Record<PageOrientation, PageDimension>> = {
  a4: {
    portrait: { widthPx: 794, heightPx: 1123, label: "A4 (210 × 297 мм)" },
    landscape: { widthPx: 1123, heightPx: 794, label: "A4 Альбомная (297 × 210 мм)" },
  },
  a5: {
    portrait: { widthPx: 559, heightPx: 794, label: "A5 (148 × 210 мм)" },
    landscape: { widthPx: 794, heightPx: 559, label: "A5 Альбомная (210 × 148 мм)" },
  },
  letter: {
    portrait: { widthPx: 816, heightPx: 1056, label: "Letter (216 × 279 мм)" },
    landscape: { widthPx: 1056, heightPx: 816, label: "Letter Альбомная (279 × 216 мм)" },
  },
};

export interface MarginValue {
  top: number;
  bottom: number;
  left: number;
  right: number;
  label: string;
}

export const MARGIN_VALUES: Record<PageMargins, MarginValue> = {
  normal: { top: 76, bottom: 76, left: 76, right: 76, label: "Обычные (20 мм)" },
  narrow: { top: 48, bottom: 48, left: 48, right: 48, label: "Узкие (12.7 мм)" },
  wide: { top: 96, bottom: 96, left: 96, right: 96, label: "Широкие (25.4 мм)" },
};

export const DEFAULT_PAGE_LAYOUT: PageLayoutConfig = {
  format: "a4",
  orientation: "portrait",
  margins: "normal",
  zoom: 1.0,
};
