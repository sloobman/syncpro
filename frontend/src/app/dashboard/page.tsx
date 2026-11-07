"use client";

import { useEffect } from "react";
import { Plus } from "lucide-react";
import { WorkspaceCard } from "@/components/dashboard/workspace-card";
import { RecentDocuments } from "@/components/dashboard/recent-documents";
import { CreateWorkspaceDialog } from "@/components/dashboard/create-workspace-dialog";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";

export default function DashboardPage() {
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const fetchWorkspaces = useWorkspaceStore((state) => state.fetchWorkspaces);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  return (
    <div className="space-y-8 pb-10">
      {/* Top Banner / Greeting */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Рабочие пространства
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ваши изолированные проекты и пространства совместной работы
          </p>
        </div>
        <CreateWorkspaceDialog />
      </div>

      {/* Workspaces Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {workspaces.map((ws) => (
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
