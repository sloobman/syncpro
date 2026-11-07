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
import { Document } from "@/types";

const INITIAL_DOCUMENTS: Document[] = [
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

type SortMode = "updated_desc" | "updated_asc" | "title_asc" | "words_desc";

export default function WorkspaceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [documents, setDocuments] = useState<Document[]>(INITIAL_DOCUMENTS);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("updated_desc");

  // Handlers
  const handleToggleFavorite = (id: string) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isFavorite: !d.isFavorite } : d))
    );
  };

  const handleRename = (id: string, newTitle: string) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, title: newTitle, updatedAt: new Date().toISOString() } : d
      )
    );
  };

  const handleDuplicate = (id: string) => {
    const original = documents.find((d) => d.id === id);
    if (!original) return;
    const duplicated: Document = {
      ...original,
      id: `doc_${Date.now()}`,
      title: `${original.title} (Копия)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFavorite: false,
    };
    setDocuments((prev) => [duplicated, ...prev]);
  };

  const handleDelete = (id: string) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isArchived: true } : d))
    );
  };

  // Filtered & Sorted documents
  const filteredDocuments = useMemo(() => {
    return documents
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
          return b.wordCount - a.wordCount;
        }
        return 0;
      });
  }, [documents, activeTab, searchQuery, sortMode]);

  const allCount = documents.filter((d) => !d.isArchived).length;
  const favCount = documents.filter((d) => d.isFavorite && !d.isArchived).length;
  const archCount = documents.filter((d) => d.isArchived).length;

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
            <span className="text-3xl p-2.5 bg-muted/60 rounded-2xl shadow-inner">🚀</span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Мой проект
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Основное рабочее пространство для документации и релизов
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
                <span>Сортировка</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-xs">
              <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Порядок отображения
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setSortMode("updated_desc")}
                className="flex items-center justify-between cursor-pointer"
              >
                <span>Сначала новые</span>
                {sortMode === "updated_desc" && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSortMode("updated_asc")}
                className="flex items-center justify-between cursor-pointer"
              >
                <span>Сначала старые</span>
                {sortMode === "updated_asc" && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSortMode("title_asc")}
                className="flex items-center justify-between cursor-pointer"
              >
                <span>По названию (А-Я)</span>
                {sortMode === "title_asc" && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSortMode("words_desc")}
                className="flex items-center justify-between cursor-pointer"
              >
                <span>По объёму текста</span>
                {sortMode === "words_desc" && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Documents List */}
      <div className="border border-border rounded-2xl bg-card overflow-hidden shadow-xs divide-y divide-border">
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
          <div className="py-12 px-4 text-center">
            <p className="text-sm font-medium text-foreground">Документы не найдены</p>
            <p className="text-xs text-muted-foreground mt-1">
              {searchQuery ? "Попробуйте изменить поисковый запрос" : "В этом разделе пока нет документов"}
            </p>
            {searchQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="mt-4 text-xs"
              >
                Сбросить фильтр
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
