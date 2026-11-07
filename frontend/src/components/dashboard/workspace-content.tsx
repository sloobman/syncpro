"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronRight, Filter, ArrowUpDown, Search, X, Check } from "lucide-react";
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

  const currentWs = workspaces.find((w) => w.id === workspaceId) || {
    id: workspaceId,
    name: "Рабочее пространство",
    iconEmoji: "📁",
    description: "Пространство документов и совместной работы",
  };

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
    updateDocument(id, { title: newTitle });
  };

  const handleDuplicate = async (id: string) => {
    const original = allDocuments.find((d) => d.id === id);
    if (!original) return;
    await createDocument({
      title: `${original.title} (Копия)`,
      workspaceId,
      template: "blank",
    });
  };

  const handleDelete = (id: string) => {
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
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {currentWs.name}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentWs.description || "Рабочее пространство для документации"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <InviteMembersDialog />
            <CreateDocumentDialog workspaceId={workspaceId} />
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

        <div className="flex items-center gap-2">
          {searchOpen ? (
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Фильтр по названию..."
                className="h-8 pl-8 pr-7 text-xs w-48 sm:w-64"
                autoFocus
              />
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSearchOpen(false);
                }}
                className="absolute right-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchOpen(true)}
              className="h-8 gap-1.5 text-xs cursor-pointer"
            >
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Фильтр{searchQuery ? " (1)" : ""}</span>
            </Button>
          )}

          {/* Sort Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs cursor-pointer">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">Сортировка</span>
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
              onToggleFavorite={handleToggleFavorite}
              onRename={handleRename}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
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
                  : "Создайте первый документ с помощью кнопки вверху страницы"}
              </p>
            </div>
            {!searchQuery && (
              <div className="pt-2">
                <CreateDocumentDialog workspaceId={workspaceId}>
                  <Button size="sm" className="gap-2 text-xs">
                    Создать документ
                  </Button>
                </CreateDocumentDialog>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
