"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, ArrowUpDown, Search, X, Check, Eye } from "lucide-react";
import { DocumentRow } from "@/components/dashboard/document-row";
import { CreateDocumentDialog } from "@/components/dashboard/create-document-dialog";
import { InviteMembersDialog } from "@/components/dashboard/invite-members-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";

type SortMode = "updated_desc" | "updated_asc" | "title_asc" | "words_desc";

export function WorkspaceContent({ workspaceId }: { workspaceId: string }) {
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const allDocuments = useWorkspaceStore((state) => state.documents);
  const updateDocument = useWorkspaceStore((state) => state.updateDocument);
  const deleteDocument = useWorkspaceStore((state) => state.deleteDocument);
  const createDocument = useWorkspaceStore((state) => state.createDocument);
  const fetchWorkspaces = useWorkspaceStore((state) => state.fetchWorkspaces);
  const fetchWorkspaceDocuments = useWorkspaceStore((state) => state.fetchWorkspaceDocuments);

  useEffect(() => {
    fetchWorkspaces();
    fetchWorkspaceDocuments(workspaceId);
  }, [workspaceId, fetchWorkspaces, fetchWorkspaceDocuments]);

  const currentWs = workspaces.find((w) => w.id === workspaceId) || {
    id: workspaceId,
    name: "Рабочее пространство",
    iconEmoji: "📁",
    description: "Пространство документов и совместной работы",
    currentUserRole: "viewer" as const,
  };

  const isViewer = currentWs.currentUserRole === "viewer" || currentWs.currentUserRole === "commenter";

  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("updated_desc");

  // Filter documents belonging to this workspace
  const workspaceDocs = useMemo(() => {
    return allDocuments.filter((d) => d.workspaceId === workspaceId);
  }, [allDocuments, workspaceId]);

  // Handlers
  const handleToggleFavorite = (id: string) => {
    const doc = allDocuments.find((d) => d.id === id);
    if (doc) {
      updateDocument(id, { isFavorite: !doc.isFavorite });
    }
  };

  const handleRename = (id: string, newTitle: string) => {
    if (isViewer) return;
    updateDocument(id, { title: newTitle });
  };

  const handleDuplicate = async (id: string) => {
    if (isViewer) return;
    const original = allDocuments.find((d) => d.id === id);
    if (!original) return;
    await createDocument({
      title: `${original.title} (Копия)`,
      workspaceId,
      template: "blank",
    });
  };

  const handleDelete = (id: string) => {
    if (isViewer) return;
    deleteDocument(id);
  };

  // Filtered & Sorted documents
  const filteredDocuments = useMemo(() => {
    return workspaceDocs
      .filter((doc) => {
        // Tab filter
        if (activeTab === "favorites" && (!doc.isFavorite || doc.isArchived)) return false;
        if (activeTab === "archive" && !doc.isArchived) return false;
        if (activeTab === "all" && doc.isArchived) return false;

        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return doc.title.toLowerCase().includes(q);
        }

        return true;
      })
      .sort((a, b) => {
        if (sortMode === "updated_desc") {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }
        if (sortMode === "updated_asc") {
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        }
        if (sortMode === "title_asc") {
          return a.title.localeCompare(b.title, "ru");
        }
        if (sortMode === "words_desc") {
          return (b.wordCount || 0) - (a.wordCount || 0);
        }
        return 0;
      });
  }, [workspaceDocs, activeTab, searchQuery, sortMode]);

  const allCount = workspaceDocs.filter((d) => !d.isArchived).length;
  const favCount = workspaceDocs.filter((d) => d.isFavorite && !d.isArchived).length;
  const archCount = workspaceDocs.filter((d) => d.isArchived).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumbs & Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">
            Панель управления
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">{currentWs.name}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2.5 bg-muted/60 rounded-2xl shadow-inner">
              {currentWs.iconEmoji || "📁"}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {currentWs.name}
                </h1>
                {isViewer && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    Читатель
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentWs.description || "Рабочее пространство для документации"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <InviteMembersDialog workspaceId={workspaceId} />
            {!isViewer && <CreateDocumentDialog workspaceId={workspaceId} />}
          </div>
        </div>
      </div>

      {/* Filter and Tab controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="all" className="text-xs">
              Все ({allCount})
            </TabsTrigger>
            <TabsTrigger value="favorites" className="text-xs">
              Избранные ({favCount})
            </TabsTrigger>
            <TabsTrigger value="archive" className="text-xs">
              Архив ({archCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {searchOpen ? (
            <div className="relative flex-1 sm:w-64 flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по документам..."
                className="pl-8 pr-8 h-8 text-xs bg-card"
                autoFocus
              />
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSearchOpen(false);
                }}
                className="absolute right-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchOpen(true)}
              className="h-8 text-xs gap-1.5 cursor-pointer flex-1 sm:flex-none justify-center"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Поиск</span>
            </Button>
          )}

          {/* Sort Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 cursor-pointer flex-1 sm:flex-none justify-center"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span>Сортировка</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-xs">
              <DropdownMenuLabel>Сортировать по</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setSortMode("updated_desc")}
                className="flex items-center justify-between"
              >
                Сначала новые
                {sortMode === "updated_desc" && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSortMode("updated_asc")}
                className="flex items-center justify-between"
              >
                Сначала старые
                {sortMode === "updated_asc" && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSortMode("title_asc")}
                className="flex items-center justify-between"
              >
                По названию (А-Я)
                {sortMode === "title_asc" && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSortMode("words_desc")}
                className="flex items-center justify-between"
              >
                По размеру
                {sortMode === "words_desc" && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Documents List */}
      <div className="border border-border rounded-xl bg-card divide-y divide-border overflow-hidden shadow-sm">
        {filteredDocuments.length > 0 ? (
          filteredDocuments.map((doc) => (
            <DocumentRow
              key={doc.id}
              document={doc}
              readOnly={isViewer}
              onToggleFavorite={handleToggleFavorite}
              onRename={isViewer ? undefined : handleRename}
              onDuplicate={isViewer ? undefined : handleDuplicate}
              onDelete={isViewer ? undefined : handleDelete}
            />
          ))
        ) : (
          <div className="py-16 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {searchQuery ? "Ничего не найдено" : "В этом разделе пока нет документов"}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? "Попробуйте изменить поисковый запрос или сбросить фильтры"
                  : isViewer
                  ? "Владелец пространства еще не добавил сюда документы"
                  : "Создайте первый документ выше, чтобы начать совместную работу"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
