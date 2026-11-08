"use client";

import { useEffect, useState } from "react";
import {
  RotateCw,
  Clock,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface AuditLog {
  id: string;
  actorId: string | null;
  actorName: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetch("/api/admin/audit-logs?limit=100", { credentials: "include" });
        if (res.ok && isMounted) {
          const data = await res.json();
          setLogs(data.logs || []);
        }
      } catch (err) {
        console.error("Failed to fetch audit logs:", err);
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
  }, [refreshKey]);

  const handleRefresh = () => {
    setIsLoading(true);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Журнал безопасности и аудита ({logs.length})</h2>
          <p className="text-sm text-muted-foreground">
            Детализированная фиксация административных действий, изменений тарифов и статусов пользователей.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2 text-xs">
          <RotateCw className="size-3.5" />
          <span>Обновить</span>
        </Button>
      </div>

      <Card className="border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-4">Время</th>
                <th className="py-3 px-4">Действие</th>
                <th className="py-3 px-4">Администратор</th>
                <th className="py-3 px-4">Целевой объект</th>
                <th className="py-3 px-4">Детали операции</th>
                <th className="py-3 px-4">IP адрес</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="size-5 animate-spin mx-auto mb-2" />
                    Загрузка записей аудита...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    События аудита отсутствуют
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3.5 shrink-0" />
                        <span>{new Date(log.createdAt).toLocaleString("ru-RU")}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="font-mono text-[10px] py-0 font-semibold">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-foreground">{log.actorName}</div>
                      <div className="text-[11px] text-muted-foreground">{log.actorEmail}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">
                      <span className="text-foreground font-semibold">{log.targetType}</span>
                      {log.targetId && <span>: {log.targetId.substring(0, 8)}...</span>}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate">
                      {log.details ? (
                        <div className="font-mono text-[11px] bg-muted/60 px-2 py-1 rounded text-muted-foreground truncate">
                          {JSON.stringify(log.details)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">
                      {log.ipAddress || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
