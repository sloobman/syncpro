"use client";

import Link from "next/link";
import { ChevronRight, Filter, ArrowUpDown } from "lucide-react";
import { DocumentRow } from "@/components/dashboard/document-row";
import { CreateDocumentDialog } from "@/components/dashboard/create-document-dialog";
import { InviteMembersDialog } from "@/components/dashboard/invite-members-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Document } from "@/types";

const mockDocuments: Document[] = [
  {
    id: "doc_1",
    workspaceId: "ws_1",
    title: "Глава 1: Введение в системы совместного редактирования",
    defaultBranch: "main",
    createdBy: "usr_1",
    wordCount: 2450,
    isFavorite: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "doc_2",
    workspaceId: "ws_1",
    title: "Архитектура и сетевой протокол Merkle-CRDT",
    defaultBranch: "feature/dag-sync",
    createdBy: "usr_2",
    wordCount: 5120,
    isFavorite: false,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "doc_3",
    workspaceId: "ws_1",
    title: "Roadmap Q4 2026: фазирование релизов",
    defaultBranch: "main",
    createdBy: "usr_1",
    wordCount: 1340,
    isFavorite: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    id: "doc_4",
    workspaceId: "ws_1",
    title: "Протокол синхронизации состояния StateVector Handshake",
    defaultBranch: "main",
    createdBy: "usr_3",
    wordCount: 3890,
    isFavorite: false,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date(Date.now() - 432000000).toISOString(),
  },
];

export default function WorkspaceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumbs & Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">
            Панель управления
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">Мой проект</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 bg-muted/60 rounded-xl">🚀</span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Мой проект
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Основное рабочее пространство для документации
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <InviteMembersDialog />
            <CreateDocumentDialog workspaceId={params.id} />
          </div>
        </div>
      </div>

      {/* Filter and Tab controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <Tabs defaultValue="all" className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">Все (4)</TabsTrigger>
            <TabsTrigger value="favorites">Избранные (2)</TabsTrigger>
            <TabsTrigger value="archive">Архив</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span>Сортировка</span>
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Filter className="h-3.5 w-3.5" />
            <span>Фильтр</span>
          </Button>
        </div>
      </div>

      {/* Documents List */}
      <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm divide-y divide-border">
        {mockDocuments.map((doc) => (
          <DocumentRow key={doc.id} document={doc} />
        ))}
      </div>
    </div>
  );
}
