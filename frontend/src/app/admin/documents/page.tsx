"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  RotateCcw,
  Trash2,
  Share2,
  ExternalLink,
  MoreVertical,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface AdminDocument {
  id: string;
  title: string;
  workspaceId: string;
  workspaceName: string;
  createdById: string;
  authorName: string;
  authorEmail: string;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  // Transfer modal
  const [selectedDoc, setSelectedDoc] = useState<AdminDocument | null>(null);
  const [newOwnerInput, setNewOwnerInput] = useState("");
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
          includeDeleted: includeDeleted ? "true" : "false",
        });
        if (search.trim()) params.set("search", search.trim());

        const res = await fetch(`/api/admin/documents?${params.toString()}`, { credentials: "include" });
        if (res.ok && isMounted) {
          const data = await res.json();
          setDocuments(data.documents || []);
          setTotal(data.total || 0);
        }
      } catch (err) {
        console.error("Failed to fetch documents:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [page, search, includeDeleted, refreshKey]);

  const showFeedback = (text: string, type: "success" | "error" = "success") => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const reloadData = () => {
    setIsLoading(true);
    setRefreshKey((k) => k + 1);
  };

  const handleRestore = async (documentId: string) => {
    try {
      const res = await fetch("/api/admin/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "restore", documentId }),
      });
      if (res.ok) {
        showFeedback("Документ успешно восстановлен");
        reloadData();
      } else {
        const err = await res.json();
        showFeedback(err.error || "Ошибка восстановления документа", "error");
      }
    } catch {
      showFeedback("Ошибка сети", "error");
    }
  };

  const handleSoftDelete = async (documentId: string) => {
    try {
      const res = await fetch("/api/admin/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "delete", documentId }),
      });
      if (res.ok) {
        showFeedback("Документ перемещен в корзину");
        reloadData();
      } else {
        const err = await res.json();
        showFeedback(err.error || "Ошибка удаления документа", "error");
      }
    } catch {
      showFeedback("Ошибка сети", "error");
    }
  };

  const handleTransferSubmit = async () => {
    if (!selectedDoc || !newOwnerInput.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "transfer",
          documentId: selectedDoc.id,
          newOwnerEmailOrId: newOwnerInput.trim(),
        }),
      });
      if (res.ok) {
        showFeedback("Владелец документа успешно изменен");
        setTransferModalOpen(false);
        setNewOwnerInput("");
        reloadData();
      } else {
        const err = await res.json();
        showFeedback(err.error || "Ошибка передачи документа", "error");
      }
    } catch {
      showFeedback("Ошибка сети", "error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Документы ({total})</h2>
          <p className="text-sm text-muted-foreground">
            Глобальный реестр документов платформы с возможностью восстановления и передачи прав.
          </p>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`flex items-center gap-2 p-3 text-xs rounded-lg border ${
            feedbackMsg.type === "success"
              ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
              : "bg-destructive/10 text-destructive border-destructive/20"
          }`}
        >
          {feedbackMsg.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <AlertCircle className="size-4 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Filters */}
      <Card className="border-border/60">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию, автору или пространству..."
              value={search}
              onChange={(e) => {
                setIsLoading(true);
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="include-deleted"
              checked={includeDeleted}
              onCheckedChange={(checked) => {
                setIsLoading(true);
                setIncludeDeleted(Boolean(checked));
                setPage(1);
              }}
            />
            <label
              htmlFor="include-deleted"
              className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Включая удаленные документы
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card className="border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-4">Название документа</th>
                <th className="py-3 px-4">Пространство</th>
                <th className="py-3 px-4">Автор</th>
                <th className="py-3 px-4">Статус</th>
                <th className="py-3 px-4">Последнее изменение</th>
                <th className="py-3 px-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="size-5 animate-spin mx-auto mb-2" />
                    Загрузка документов...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    Документы не найдены
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-emerald-500 shrink-0" />
                        <Link
                          href={`/doc/${doc.id}`}
                          target="_blank"
                          className="hover:underline flex items-center gap-1 group"
                        >
                          <span>{doc.title || "Без названия"}</span>
                          <ExternalLink className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{doc.id.substring(0, 8)}...</div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {doc.workspaceName}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-foreground">{doc.authorName}</div>
                      <div className="text-[11px] text-muted-foreground">{doc.authorEmail}</div>
                    </td>
                    <td className="py-3 px-4">
                      {doc.isDeleted ? (
                        <Badge variant="destructive" className="text-[10px] py-0">
                          Удален
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 dark:text-green-400 border-green-500/30 text-[10px] py-0">
                          Активен
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(doc.updatedAt).toLocaleString("ru-RU")}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7">
                            <MoreVertical className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-xs">
                          {doc.isDeleted ? (
                            <DropdownMenuItem onClick={() => handleRestore(doc.id)} className="gap-2 text-green-600">
                              <RotateCcw className="size-3.5" />
                              <span>Восстановить</span>
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleSoftDelete(doc.id)} className="gap-2 text-destructive">
                              <Trash2 className="size-3.5" />
                              <span>Удалить в корзину</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedDoc(doc);
                              setTransferModalOpen(true);
                            }}
                            className="gap-2"
                          >
                            <Share2 className="size-3.5 text-blue-500" />
                            <span>Передать владение</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Transfer Ownership Modal */}
      <Dialog open={transferModalOpen} onOpenChange={setTransferModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Передача владения документом</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <p className="text-muted-foreground">
              Документ: <strong className="text-foreground">{selectedDoc?.title || "Без названия"}</strong>
              <br />
              Текущий автор: {selectedDoc?.authorEmail}
            </p>
            <div className="space-y-2">
              <Label htmlFor="doc-new-owner">Email или ID нового владельца</Label>
              <Input
                id="doc-new-owner"
                type="text"
                placeholder="colleague@example.com"
                value={newOwnerInput}
                onChange={(e) => setNewOwnerInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleTransferSubmit} disabled={!newOwnerInput.trim() || actionLoading}>
              {actionLoading ? <Loader2 className="size-4 animate-spin" /> : "Передать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
