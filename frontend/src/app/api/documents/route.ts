import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/jwt";
import { WorkspaceRepository } from "@/lib/db/workspace-repository";

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    const body = await request.json();
    const { id, workspaceId, title, content } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Название документа обязательно" },
        { status: 400 }
      );
    }

    const document = await WorkspaceRepository.createDocument({
      id,
      workspaceId,
      title: title.trim(),
      content: content || "",
      createdBy: user?.id,
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (err) {
    console.error("[API Documents POST Error]:", err);
    return NextResponse.json({ error: "Ошибка создания документа" }, { status: 500 });
  }
}
