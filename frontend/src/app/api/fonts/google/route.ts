import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/jwt";
import { FontRepository } from "@/lib/db/font-repository";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
    }

    const body = await request.json();
    const { fontName, workspaceId } = body;

    if (!fontName || typeof fontName !== "string" || !fontName.trim()) {
      return NextResponse.json({ error: "Название шрифта обязательно" }, { status: 400 });
    }

    const cleanName = fontName.trim();
    // Security: sanitize font family name
    const sanitizedFamily = cleanName.replace(/[^a-zA-Z0-9\s-_+]/g, "").trim();
    if (!sanitizedFamily) {
      return NextResponse.json({ error: "Некорректное имя шрифта" }, { status: 400 });
    }

    // Google Fonts URL (properly format family with '+')
    const formattedFamily = encodeURIComponent(sanitizedFamily).replace(/%20/g, "+");
    let googleFontUrl = `https://fonts.googleapis.com/css2?family=${formattedFamily}:wght@400;500;600;700&display=swap`;

    // Validate that font exists in Google Fonts
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    try {
      const checkRes = await fetch(googleFontUrl, { headers: { "User-Agent": ua } });
      const cssText = checkRes.ok ? await checkRes.text() : "";

      if (!checkRes.ok || !cssText.includes("@font-face")) {
        // Fallback: try without weight specification
        const simpleUrl = `https://fonts.googleapis.com/css2?family=${formattedFamily}&display=swap`;
        const simpleRes = await fetch(simpleUrl, { headers: { "User-Agent": ua } });
        const simpleCss = simpleRes.ok ? await simpleRes.text() : "";

        if (simpleRes.ok && simpleCss.includes("@font-face")) {
          googleFontUrl = simpleUrl;
        } else {
          return NextResponse.json(
            {
              error: `Шрифт "${cleanName}" не найден в каталоге Google Fonts. Проверьте правильность написания или загрузите файл шрифта (.woff2, .ttf) во вкладке "Файл шрифта".`,
            },
            { status: 400 }
          );
        }
      }
    } catch (fetchErr) {
      console.warn("[Google Font Check Warning]:", fetchErr);
      // If network fetch fails server-side, continue to save so local testing works
    }

    // Always exactly 64 characters hex for VARCHAR(64)
    const sha256Hash = crypto
      .createHash("sha256")
      .update(`google:${sanitizedFamily.toLowerCase()}`)
      .digest("hex");

    const savedFont = await FontRepository.saveFont({
      workspaceId,
      familyName: sanitizedFamily,
      displayName: sanitizedFamily,
      sourceType: "google",
      sha256Hash,
      fileUrl: googleFontUrl,
      format: "google",
    });

    return NextResponse.json({ success: true, font: savedFont }, { status: 201 });
  } catch (err) {
    console.error("[Google Font API Error]:", err);
    return NextResponse.json({ error: "Ошибка подключения шрифта" }, { status: 500 });
  }
}
