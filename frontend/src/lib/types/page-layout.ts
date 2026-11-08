export type PageFormat = "a4" | "a5" | "letter" | "custom";
export type PageOrientation = "portrait" | "landscape";
export type PageMargins = "normal" | "narrow" | "wide" | "custom";

export interface CustomDimensions {
  widthMm: number;
  heightMm: number;
}

export interface CustomMargins {
  topMm: number;
  bottomMm: number;
  leftMm: number;
  rightMm: number;
}

export interface PageLayoutConfig {
  format: PageFormat;
  orientation: PageOrientation;
  margins: PageMargins;
  zoom: number; // 0.75 | 1.0 | 1.25 | 1.5
  customDimensions?: CustomDimensions;
  customMargins?: CustomMargins;
  lineHeight?: number | string; // default 1.5
  paragraphSpacing?: number; // default 8 px
  letterSpacing?: string; // default "normal"
}

export interface PageDimension {
  widthPx: number;
  heightPx: number;
  label: string;
}

export const PAGE_DIMENSIONS: Record<"a4" | "a5" | "letter", Record<PageOrientation, PageDimension>> = {
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

export const MARGIN_VALUES: Record<"normal" | "narrow" | "wide", MarginValue> = {
  normal: { top: 76, bottom: 76, left: 76, right: 76, label: "Обычные (20 мм)" },
  narrow: { top: 48, bottom: 48, left: 48, right: 48, label: "Узкие (12.7 мм)" },
  wide: { top: 96, bottom: 96, left: 96, right: 96, label: "Широкие (25.4 мм)" },
};

// Guardrail constraints
export const MIN_PAGE_SIZE_MM = 100;
export const MAX_PAGE_WIDTH_MM = 840;
export const MAX_PAGE_HEIGHT_MM = 1189;
export const MIN_MARGIN_MM = 5;
export const MIN_PRINTABLE_AREA_MM = 50;

export function mmToPx(mm: number): number {
  return Math.round(mm * 3.7795275591);
}

export function pxToMm(px: number): number {
  return Math.round(px / 3.7795275591);
}

export function getPageDimensions(config: PageLayoutConfig): PageDimension {
  if (config.format === "custom" && config.customDimensions) {
    const wMm = Math.max(MIN_PAGE_SIZE_MM, Math.min(MAX_PAGE_WIDTH_MM, config.customDimensions.widthMm || 210));
    const hMm = Math.max(MIN_PAGE_SIZE_MM, Math.min(MAX_PAGE_HEIGHT_MM, config.customDimensions.heightMm || 297));
    const isLandscape = config.orientation === "landscape";
    const widthMm = isLandscape ? Math.max(wMm, hMm) : Math.min(wMm, hMm);
    const heightMm = isLandscape ? Math.min(wMm, hMm) : Math.max(wMm, hMm);
    return {
      widthPx: mmToPx(widthMm),
      heightPx: mmToPx(heightMm),
      label: `Пользовательский (${widthMm} × ${heightMm} мм)`,
    };
  }
  const dims = PAGE_DIMENSIONS[config.format as "a4" | "a5" | "letter"] || PAGE_DIMENSIONS.a4;
  return dims[config.orientation] || dims.portrait;
}

export function getPageMargins(config: PageLayoutConfig): MarginValue {
  if (config.margins === "custom" && config.customMargins) {
    const top = mmToPx(Math.max(MIN_MARGIN_MM, config.customMargins.topMm ?? 20));
    const bottom = mmToPx(Math.max(MIN_MARGIN_MM, config.customMargins.bottomMm ?? 20));
    const left = mmToPx(Math.max(MIN_MARGIN_MM, config.customMargins.leftMm ?? 20));
    const right = mmToPx(Math.max(MIN_MARGIN_MM, config.customMargins.rightMm ?? 20));
    return {
      top,
      bottom,
      left,
      right,
      label: `Пользовательские (${config.customMargins.topMm ?? 20} / ${config.customMargins.bottomMm ?? 20} / ${config.customMargins.leftMm ?? 20} / ${config.customMargins.rightMm ?? 20} мм)`,
    };
  }
  return MARGIN_VALUES[config.margins as "normal" | "narrow" | "wide"] || MARGIN_VALUES.normal;
}

export function validatePageLayout(config: PageLayoutConfig): {
  valid: boolean;
  error?: string;
  sanitized: PageLayoutConfig;
} {
  const sanitized = { ...config };

  if (sanitized.format === "custom") {
    const rawW = sanitized.customDimensions?.widthMm;
    const rawH = sanitized.customDimensions?.heightMm;

    if (
      rawW === undefined ||
      rawH === undefined ||
      !Number.isFinite(rawW) ||
      !Number.isFinite(rawH) ||
      rawW < MIN_PAGE_SIZE_MM ||
      rawH < MIN_PAGE_SIZE_MM
    ) {
      return {
        valid: false,
        error: `Минимальный размер страницы должен быть не менее ${MIN_PAGE_SIZE_MM} × ${MIN_PAGE_SIZE_MM} мм`,
        sanitized,
      };
    }
    if (rawW > MAX_PAGE_WIDTH_MM || rawH > MAX_PAGE_HEIGHT_MM) {
      return {
        valid: false,
        error: `Максимальный размер страницы ограничен форматом ${MAX_PAGE_WIDTH_MM} × ${MAX_PAGE_HEIGHT_MM} мм`,
        sanitized,
      };
    }
    sanitized.customDimensions = {
      widthMm: Math.round(rawW),
      heightMm: Math.round(rawH),
    };
  }

  if (sanitized.margins === "custom") {
    const top = sanitized.customMargins?.topMm;
    const bottom = sanitized.customMargins?.bottomMm;
    const left = sanitized.customMargins?.leftMm;
    const right = sanitized.customMargins?.rightMm;

    if (
      top === undefined ||
      bottom === undefined ||
      left === undefined ||
      right === undefined ||
      !Number.isFinite(top) ||
      !Number.isFinite(bottom) ||
      !Number.isFinite(left) ||
      !Number.isFinite(right) ||
      top < MIN_MARGIN_MM ||
      bottom < MIN_MARGIN_MM ||
      left < MIN_MARGIN_MM ||
      right < MIN_MARGIN_MM
    ) {
      return {
        valid: false,
        error: `Минимальное поле страницы должно быть не менее ${MIN_MARGIN_MM} мм`,
        sanitized,
      };
    }

    const dim = getPageDimensions(sanitized);
    const widthMm = pxToMm(dim.widthPx);
    const heightMm = pxToMm(dim.heightPx);

    if (left + right > widthMm - MIN_PRINTABLE_AREA_MM) {
      return {
        valid: false,
        error: `Сумма левого и правого полей (${left + right} мм) оставляет менее ${MIN_PRINTABLE_AREA_MM} мм для контента`,
        sanitized,
      };
    }

    if (top + bottom > heightMm - MIN_PRINTABLE_AREA_MM) {
      return {
        valid: false,
        error: `Сумма верхнего и нижнего полей (${top + bottom} мм) оставляет менее ${MIN_PRINTABLE_AREA_MM} мм для контента`,
        sanitized,
      };
    }

    sanitized.customMargins = {
      topMm: Math.round(top),
      bottomMm: Math.round(bottom),
      leftMm: Math.round(left),
      rightMm: Math.round(right),
    };
  }

  return { valid: true, sanitized };
}

export const DEFAULT_PAGE_LAYOUT: PageLayoutConfig = {
  format: "a4",
  orientation: "portrait",
  margins: "normal",
  zoom: 1.0,
  lineHeight: 1.5,
  paragraphSpacing: 8,
  letterSpacing: "normal",
};
