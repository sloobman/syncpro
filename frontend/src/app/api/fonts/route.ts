import { NextRequest, NextResponse } from "next/server";
import { FontRepository } from "@/lib/db/font-repository";
import { isPrerenderInterrupted } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    const fonts = await FontRepository.getFonts(workspaceId);
    return NextResponse.json({ fonts });
  } catch (err) {
    if (isPrerenderInterrupted(err)) {
      throw err;
    }
    console.error("[Fonts GET API Error]:", err);
    return NextResponse.json({ error: "Ошибка получения шрифтов" }, { status: 500 });
  }
}
