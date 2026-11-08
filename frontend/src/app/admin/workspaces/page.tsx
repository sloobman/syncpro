"use client";

import { useEffect, useState } from "react";
import {
  FolderKanban,
  Search,
  MoreVertical,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Share2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

interface AdminWorkspace {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  memberCount: number;
  documentCount: number;
  createdAt: string;
}

export default function AdminWorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  // Transfer modal
  const [selectedWs, setSelectedWs] = useState<AdminWorkspace | null>(null);
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
        });
        if (search.trim()) params.set("search", search.trim());

        const res = await fetch(`/api/admin/workspaces?${params.toString()}`, { credentials: "include" });
        if (res.ok && isMounted) {
          const data = await res.json();
          setWorkspaces(data.workspaces || []);
          setTotal(data.total || 0);
        }
      } catch (err) {
        console.error("Failed to fetch workspaces:", err);
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
  }, [page, search, refreshKey]);

  const showFeedback = (text: string, type: "success" | "error" = "success") => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const reloadData = () => {
    setIsLoading(true);
    setRefreshKey((k) => k + 1);
  };

  const handleTransferSubmit = async () => {
    if (!selectedWs || !newOwnerInput.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/workspaces", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          workspaceId: selectedWs.id,
          newOwnerEmailOrId: newOwnerInput.trim(),
        }),
      });
      if (res.ok) {
        showFeedback("Владение пространством успешно передано");
        setTransferModalOpen(false);
        setNewOwnerInput("");
        reloadData();
      } else {
        const err = await res.json();
        showFeedback(err.error || "Ошибка передачи прав", "error");
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
          <h2 className="text-xl font-bold tracking-tight">Рабочие пространства ({total})</h2>
          <p className="text-sm text-muted-foreground">
            Просмотр всех пространств и переназначение владельцев.
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

      {/* Search */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию или владельцу..."
              value={search}
              onChange={(e) => {
                setIsLoading(true);
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Workspaces Table */}
      <Card className="border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-4">Название пространства</th>
                <th className="py-3 px-4">Текущий владелец</th>
                <th className="py-3 px-4">Участников</th>
                <th className="py-3 px-4">Документов</th>
                <th className="py-3 px-4">Дата создания</th>
                <th className="py-3 px-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="size-5 animate-spin mx-auto mb-2" />
                    Загрузка пространств...
                  </td>
                </tr>
              ) : workspaces.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    Рабочие пространства не найдены
                  </td>
                </tr>
              ) : (
                workspaces.map((ws) => (
                  <tr key={ws.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <FolderKanban className="size-4 text-blue-500 shrink-0" />
                        <span>{ws.name}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{ws.id.substring(0, 8)}...</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-foreground">{ws.ownerName}</div>
                      <div className="text-[11px] text-muted-foreground">{ws.ownerEmail}</div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{ws.memberCount}</td>
                    <td className="py-3 px-4 text-muted-foreground">{ws.documentCount}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(ws.createdAt).toLocaleDateString("ru-RU")}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7">
                            <MoreVertical className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-xs">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedWs(ws);
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
            <DialogTitle>Передача владения пространством</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <p className="text-muted-foreground">
              Пространство: <strong className="text-foreground">{selectedWs?.name}</strong>
              <br />
              Текущий владелец: {selectedWs?.ownerEmail}
            </p>
            <div className="space-y-2">
              <Label htmlFor="new-owner-email">Email или ID нового владельца</Label>
              <Input
                id="new-owner-email"
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
              {actionLoading ? <Loader2 className="size-4 animate-spin" /> : "Передать права"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
