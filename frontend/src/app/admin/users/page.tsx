"use client";

import { useEffect, useState } from "react";
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Shield,
  KeyRound,
  Lock,
  Unlock,
  Zap,
  MoreVertical,
  Loader2,
  Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  status: string;
  plan: string;
  subscriptionStatus: string;
  expiresAt: string | null;
  workspacesCount: number;
  documentsCount: number;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  // Dialog states
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"free" | "pro" | "enterprise">("pro");
  const [planDurationDays, setPlanDurationDays] = useState("30");
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");
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
        if (roleFilter !== "all") params.set("role", roleFilter);
        if (statusFilter !== "all") params.set("status", statusFilter);

        const res = await fetch(`/api/admin/users?${params.toString()}`, { credentials: "include" });
        if (res.ok && isMounted) {
          const data = await res.json();
          setUsers(data.users || []);
          setTotal(data.total || 0);
        }
      } catch (err) {
        console.error("Failed to fetch users:", err);
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
  }, [page, search, roleFilter, statusFilter, refreshKey]);

  const showFeedback = (text: string, type: "success" | "error" = "success") => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const reloadData = () => {
    setIsLoading(true);
    setRefreshKey((k) => k + 1);
  };

  const handleForceVerify = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "force_verify" }),
      });
      if (res.ok) {
        showFeedback("Email успешно подтвержден");
        reloadData();
      } else {
        const err = await res.json();
        showFeedback(err.error || "Ошибка подтверждения", "error");
      }
    } catch {
      showFeedback("Ошибка сети", "error");
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "blocked" ? "active" : "blocked";
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "set_status", status: nextStatus }),
      });
      if (res.ok) {
        showFeedback(nextStatus === "blocked" ? "Пользователь заблокирован" : "Пользователь разблокирован");
        reloadData();
      } else {
        const err = await res.json();
        showFeedback(err.error || "Ошибка изменения статуса", "error");
      }
    } catch {
      showFeedback("Ошибка сети", "error");
    }
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const nextRole = currentRole === "admin" ? "user" : "admin";
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "set_role", role: nextRole }),
      });
      if (res.ok) {
        showFeedback(`Роль изменена на ${nextRole}`);
        reloadData();
      } else {
        const err = await res.json();
        showFeedback(err.error || "Ошибка изменения роли", "error");
      }
    } catch {
      showFeedback("Ошибка сети", "error");
    }
  };

  const handleResetPasswordSubmit = async () => {
    if (!selectedUser || !newPassword.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "reset_password", password: newPassword.trim() }),
      });
      if (res.ok) {
        showFeedback("Пароль успешно сброшен");
        setPasswordModalOpen(false);
        setNewPassword("");
      } else {
        const err = await res.json();
        showFeedback(err.error || "Ошибка сброса пароля", "error");
      }
    } catch {
      showFeedback("Ошибка сети", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetPlanSubmit = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "set_plan",
          plan: selectedPlan,
          durationDays: parseInt(planDurationDays, 10) || 30,
        }),
      });
      if (res.ok) {
        showFeedback(`Тариф успешно изменен на ${selectedPlan.toUpperCase()}`);
        setPlanModalOpen(false);
        reloadData();
      } else {
        const err = await res.json();
        showFeedback(err.error || "Ошибка изменения тарифа", "error");
      }
    } catch {
      showFeedback("Ошибка сети", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newUserName.trim(),
          email: newUserEmail.trim(),
          password: newUserPassword.trim(),
          role: newUserRole,
          emailVerified: true,
        }),
      });
      if (res.ok) {
        showFeedback("Пользователь успешно создан");
        setCreateUserModalOpen(false);
        setNewUserName("");
        setNewUserEmail("");
        setNewUserPassword("");
        reloadData();
      } else {
        const err = await res.json();
        showFeedback(err.error || "Ошибка создания пользователя", "error");
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
          <h2 className="text-xl font-bold tracking-tight">Пользователи ({total})</h2>
          <p className="text-sm text-muted-foreground">
            Управление учетными записями, статусом верификации email и подписками.
          </p>
        </div>
        <Button onClick={() => setCreateUserModalOpen(true)} className="gap-2">
          <Plus className="size-4" />
          <span>Добавить пользователя</span>
        </Button>
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

      {/* Filters Bar */}
      <Card className="border-border/60">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени или email..."
              value={search}
              onChange={(e) => {
                setIsLoading(true);
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => {
                setIsLoading(true);
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 rounded-md border border-input bg-background text-xs"
            >
              <option value="all">Все роли</option>
              <option value="user">Обычные пользователи</option>
              <option value="admin">Администраторы</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setIsLoading(true);
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 rounded-md border border-input bg-background text-xs"
            >
              <option value="all">Все статусы</option>
              <option value="active">Активные</option>
              <option value="blocked">Заблокированные</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-4">Пользователь</th>
                <th className="py-3 px-4">Email & Верификация</th>
                <th className="py-3 px-4">Роль</th>
                <th className="py-3 px-4">Статус</th>
                <th className="py-3 px-4">Тариф</th>
                <th className="py-3 px-4">Пространств / Док.</th>
                <th className="py-3 px-4">Дата регистрации</th>
                <th className="py-3 px-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="size-5 animate-spin mx-auto mb-2" />
                    Загрузка пользователей...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    Пользователи не найдены
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground">{u.name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">{u.id.substring(0, 8)}...</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-foreground">{u.email}</div>
                      <div className="mt-0.5">
                        {u.emailVerified ? (
                          <Badge variant="outline" className="text-[10px] py-0 text-green-600 dark:text-green-400 border-green-500/30 bg-green-500/10">
                            Подтвержден
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] py-0 text-amber-500 border-amber-500/30 bg-amber-500/10">
                            Не подтвержден
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {u.role === "admin" ? (
                        <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 text-[10px] py-0">
                          Админ
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] py-0">
                          User
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {u.status === "blocked" ? (
                        <Badge variant="destructive" className="text-[10px] py-0">
                          Заблокирован
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 dark:text-green-400 border-green-500/30 text-[10px] py-0">
                          Активен
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={u.plan === "pro" || u.plan === "enterprise" ? "default" : "outline"}
                        className="uppercase text-[10px] py-0 font-bold"
                      >
                        {u.plan}
                      </Badge>
                      {u.expiresAt && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          до {new Date(u.expiresAt).toLocaleDateString("ru-RU")}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {u.workspacesCount} / {u.documentsCount}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString("ru-RU")}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7">
                            <MoreVertical className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-xs w-48">
                          {!u.emailVerified && (
                            <DropdownMenuItem onClick={() => handleForceVerify(u.id)} className="gap-2">
                              <CheckCircle2 className="size-3.5 text-green-500" />
                              <span>Подтвердить Email</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(u);
                              setPasswordModalOpen(true);
                            }}
                            className="gap-2"
                          >
                            <KeyRound className="size-3.5 text-blue-500" />
                            <span>Сбросить пароль</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(u);
                              setSelectedPlan((u.plan as "free" | "pro" | "enterprise") || "pro");
                              setPlanModalOpen(true);
                            }}
                            className="gap-2"
                          >
                            <Zap className="size-3.5 text-amber-500" />
                            <span>Изменить тариф</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleRole(u.id, u.role)} className="gap-2">
                            <Shield className="size-3.5 text-purple-500" />
                            <span>{u.role === "admin" ? "Снять права админа" : "Сделать админом"}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(u.id, u.status)}
                            className={u.status === "blocked" ? "text-green-600 gap-2" : "text-destructive gap-2"}
                          >
                            {u.status === "blocked" ? (
                              <>
                                <Unlock className="size-3.5" />
                                <span>Разблокировать</span>
                              </>
                            ) : (
                              <>
                                <Lock className="size-3.5" />
                                <span>Заблокировать</span>
                              </>
                            )}
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

      {/* Password Reset Modal */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Сброс пароля для {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-pass">Новый временный пароль</Label>
              <Input
                id="new-pass"
                type="text"
                placeholder="Минимум 8 символов"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordModalOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleResetPasswordSubmit}
              disabled={newPassword.length < 8 || actionLoading}
            >
              {actionLoading ? <Loader2 className="size-4 animate-spin" /> : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Modal */}
      <Dialog open={planModalOpen} onOpenChange={setPlanModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Изменение тарифа для {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Тарифный план</Label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value as "free" | "pro" | "enterprise")}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="free">Free (100 МБ, 3 пространства)</option>
                <option value="pro">Pro (10 ГБ, шрифты, 20 пространств)</option>
                <option value="enterprise">Enterprise (100 ГБ, кастомные квоты)</option>
              </select>
            </div>

            {selectedPlan !== "free" && (
              <div className="space-y-2">
                <Label htmlFor="plan-days">Срок действия (дней)</Label>
                <Input
                  id="plan-days"
                  type="number"
                  min="1"
                  value={planDurationDays}
                  onChange={(e) => setPlanDurationDays(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSetPlanSubmit} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="size-4 animate-spin" /> : "Применить тариф"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Modal */}
      <Dialog open={createUserModalOpen} onOpenChange={setCreateUserModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateUserSubmit}>
            <DialogHeader>
              <DialogTitle>Создание нового пользователя</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <Label htmlFor="cu-name">Имя пользователя</Label>
                <Input
                  id="cu-name"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Иван Иванов"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cu-email">Email адрес</Label>
                <Input
                  id="cu-email"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cu-pass">Пароль</Label>
                <Input
                  id="cu-pass"
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Минимум 8 символов"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Роль</Label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="user">Обычный пользователь</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateUserModalOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="size-4 animate-spin" /> : "Создать"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
