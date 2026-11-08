"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  FolderKanban,
  FileText,
  GitCommit,
  HardDrive,
  ShieldCheck,
  UserCheck,
  UserX,
  Zap,
  ArrowRight,
  Loader2,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SystemMetrics {
  totalUsers: number;
  verifiedUsers: number;
  blockedUsers: number;
  plans: {
    free: number;
    pro: number;
    enterprise: number;
  };
  totalWorkspaces: number;
  totalDocuments: number;
  deletedDocuments: number;
  totalCommits: number;
  totalStorageBytes: number;
}

interface AuditLogItem {
  id: string;
  actorName: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string | null;
  createdAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Б";
  const k = 1024;
  const sizes = ["Б", "КБ", "МБ", "ГБ", "ТБ"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [metricsRes, logsRes] = await Promise.all([
          fetch("/api/admin/metrics", { credentials: "include" }),
          fetch("/api/admin/audit-logs?limit=5", { credentials: "include" }),
        ]);

        if (metricsRes.ok) {
          const mData = await metricsRes.json();
          setMetrics(mData.metrics);
        }
        if (logsRes.ok) {
          const lData = await logsRes.json();
          setRecentLogs(lData.logs || []);
        }
      } catch (err) {
        console.error("Failed to load admin metrics:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Обзор системы SyncPro</h2>
        <p className="text-sm text-muted-foreground">
          Ключевые показатели платформы, статистика пользователей и журнал безопасности.
        </p>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Пользователи</CardTitle>
            <Users className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">{metrics?.totalUsers || 0}</div>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <UserCheck className="size-3" />
                {metrics?.verifiedUsers || 0} подтв.
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-red-500">
                <UserX className="size-3" />
                {metrics?.blockedUsers || 0} блок.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Subscriptions */}
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Тарифные планы</CardTitle>
            <Zap className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">
              {(metrics?.plans.pro || 0) + (metrics?.plans.enterprise || 0)}{" "}
              <span className="text-xs font-normal text-muted-foreground">Pro/Ent</span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>Free: {metrics?.plans.free || 0}</span>
              <span>•</span>
              <span className="text-primary font-medium">Pro: {metrics?.plans.pro || 0}</span>
              <span>•</span>
              <span className="text-indigo-500 font-medium">Ent: {metrics?.plans.enterprise || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Documents & Workspaces */}
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Документы и Пространства</CardTitle>
            <FileText className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">{metrics?.totalDocuments || 0}</div>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>{metrics?.totalWorkspaces || 0} пространств</span>
              <span>•</span>
              <span>{metrics?.deletedDocuments || 0} в корзине</span>
            </div>
          </CardContent>
        </Card>

        {/* Commits & Storage */}
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">DAG Коммиты и Данные</CardTitle>
            <HardDrive className="size-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">{formatBytes(metrics?.totalStorageBytes || 0)}</div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
              <GitCommit className="size-3 text-purple-500" />
              <span>{metrics?.totalCommits || 0} коммитов в Merkle-DAG</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/60 hover:border-primary/50 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                Управление пользователями
              </span>
              <Button variant="ghost" size="sm" asChild className="h-7 px-2">
                <Link href="/admin/users">
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardTitle>
            <CardDescription className="text-xs">
              Подтверждение email, сброс паролей, блокировка и смена тарифов.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/60 hover:border-primary/50 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FolderKanban className="size-4 text-blue-500" />
                Пространства и Документы
              </span>
              <Button variant="ghost" size="sm" asChild className="h-7 px-2">
                <Link href="/admin/workspaces">
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardTitle>
            <CardDescription className="text-xs">
              Передача владения, аудит документов и восстановление удаленных файлов.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/60 hover:border-primary/50 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Zap className="size-4 text-amber-500" />
                Генератор промокодов
              </span>
              <Button variant="ghost" size="sm" asChild className="h-7 px-2">
                <Link href="/admin/promo-codes">
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardTitle>
            <CardDescription className="text-xs">
              Создание кодов для Pro-тарифа с контролем сроков и лимитов активаций.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Recent Audit Logs */}
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-500" />
              Последние действия администраторов
            </CardTitle>
            <CardDescription className="text-xs">
              Журнал аудита операций над пользователями и ресурсами
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild className="text-xs">
            <Link href="/admin/audit">Все логи</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              Действий пока не зафиксировано
            </div>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card/40 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[10px] py-0">
                        {log.action}
                      </Badge>
                      <span>{log.targetType}: {log.targetId || "—"}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Выполнил: <span className="text-foreground">{log.actorName}</span> ({log.actorEmail})
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                    <Clock className="size-3" />
                    <span>{new Date(log.createdAt).toLocaleTimeString("ru-RU")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
