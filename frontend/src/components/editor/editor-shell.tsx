"use client";

import { useState } from "react";
import { EditorTopbar } from "@/components/editor/editor-topbar";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import { EditorSidebar } from "@/components/editor/editor-sidebar";
import { EditorStatusbar } from "@/components/editor/editor-statusbar";

export function EditorShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
      <EditorTopbar />
      <EditorToolbar />

      {/* Main editor area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Document canvas */}
        <div className="flex-1 overflow-y-auto bg-muted/20 p-4 sm:p-8 flex justify-center">
          <div className="w-full max-w-[850px] min-h-[1050px] bg-card border border-border shadow-sm rounded-xl p-8 sm:p-12 relative text-foreground space-y-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Глава 1: Введение в системы совместного редактирования
            </h1>

            <p className="text-sm sm:text-base leading-relaxed text-muted-foreground">
              Совместное редактирование документов в реальном времени является одной из ключевых технологических задач современных распределённых систем. В отличие от традиционных централизованных блокировок, современные архитектуры опираются на бессерверную или гибридную репликацию данных без централизованного арбитра разрешения конфликтов.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight pt-4">
              1.1. Архитектурный стиль Merkle-CRDT
            </h2>

            <p className="text-sm sm:text-base leading-relaxed text-muted-foreground">
              Платформа SyncPro совмещает математическое ядро Conflict-free Replicated Data Types (CRDT) на базе алгоритмов YATA и Fugue с графом контроля версий Merkle-DAG. Каждый символ и блок текста идентифицируются неизменяемым кортежем из идентификатора клиента и логических часов Лампорта.
            </p>

            {/* Remote collaborative cursor demo */}
            <div className="relative inline-block border-l-2 border-blue-500 pl-1 my-2 bg-blue-500/10 rounded-r py-0.5 pr-2">
              <span className="absolute -top-5 left-0 bg-blue-500 text-[10px] text-white font-medium px-1.5 py-0.5 rounded shadow-sm">
                Алиса
              </span>
              <span className="text-sm sm:text-base text-foreground font-medium">
                «Бесконфликтное слияние веток на базе 3-Way CRDT Merge гарантирует отсутствие маркеров конфликтов в продакшене.»
              </span>
            </div>

            <p className="text-sm sm:text-base leading-relaxed text-muted-foreground">
              При параллельном ветвлении истории формируется направленный ациклический граф (DAG). Вычисление общего наименьшего предка (LCA) позволяет применить дельты обеих веток относительно общей базовой точки без потери пользовательских правок.
            </p>
          </div>
        </div>

        {/* Right collapsible sidebar */}
        <EditorSidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
      </div>

      <EditorStatusbar />
    </div>
  );
}
