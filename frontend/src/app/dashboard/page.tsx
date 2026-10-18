"use client";

import { Plus } from "lucide-react";
import { WorkspaceCard } from "@/components/dashboard/workspace-card";
import { RecentDocuments } from "@/components/dashboard/recent-documents";
import { CreateWorkspaceDialog } from "@/components/dashboard/create-workspace-dialog";
import { Workspace } from "@/types";

const mockWorkspaces: Workspace[] = [
  {
    id: "ws_1",
    name: "Мой проект",
    slug: "my-project",
    description: "Основное рабочее пространство для документации",
    iconEmoji: "🚀",
    memberCount: 3,
    documentCount: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "ws_2",
    name: "Команда разработки",
    slug: "dev-team",
    description: "Инженерная база знаний и архитектурные решения",
    iconEmoji: "⚡",
    memberCount: 12,
    documentCount: 24,
    createdAt: new Date().toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8 pb-10">
      {/* Top Banner / Greeting */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Рабочие пространства
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Выберите рабочую область или создайте новую для командной работы
          </p>
        </div>
        <CreateWorkspaceDialog />
      </div>

      {/* Workspaces Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {mockWorkspaces.map((ws) => (
          <WorkspaceCard key={ws.id} workspace={ws} />
        ))}

        {/* Create workspace placeholder card */}
        <CreateWorkspaceDialog>
          <button className="h-full min-h-[160px] rounded-xl border border-dashed border-border/80 hover:border-primary/60 bg-muted/20 hover:bg-muted/40 transition-all p-6 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-foreground group cursor-pointer text-left w-full">
            <div className="h-10 w-10 rounded-full border border-dashed border-border group-hover:border-primary/60 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-all">
              <Plus className="h-5 w-5" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">Новое пространство</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Создать проект или изолированную рабочую область
              </p>
            </div>
          </button>
        </CreateWorkspaceDialog>
      </div>

      {/* Recent Documents */}
      <div className="pt-2">
        <RecentDocuments />
      </div>
    </div>
  );
}
