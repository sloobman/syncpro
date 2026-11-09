"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Resilient Error Boundary designed specifically for contentEditable rich-text editors.
 * Catches browser DOM mutation desyncs such as "NotFoundError: Failed to execute 'removeChild' on 'Node'"
 * and automatically recovers without crashing the page or showing Next.js unhandled error overlay.
 */
export class EditorErrorBoundary extends Component<Props, State> {
  private recoveryTimer: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn(
      "[SyncPro EditorErrorBoundary] Caught DOM reconciliation exception:",
      error.message,
      errorInfo
    );

    // If it's a known browser-native contenteditable reconciliation issue (e.g. removeChild / insertBefore / NotFoundError),
    // automatically reset the error state on the next tick so React mounts a clean tree.
    const isDomDesync =
      error.message?.includes("removeChild") ||
      error.message?.includes("insertBefore") ||
      error.name === "NotFoundError";

    if (isDomDesync) {
      if (this.recoveryTimer) clearTimeout(this.recoveryTimer);
      this.recoveryTimer = setTimeout(() => {
        this.setState({ hasError: false, error: undefined });
      }, 50);
    }
  }

  componentWillUnmount() {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }
  }

  private handleManualReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center p-6 my-4 rounded-2xl border border-destructive/20 bg-destructive/5 text-center space-y-3 font-sans">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-semibold text-sm">
              Временное рассогласование выделения
            </span>
          </div>
          <p className="text-xs text-muted-foreground max-w-md">
            Редактор восстанавливает визуальное состояние документа после быстрой мутации текста. Все ваши данные сохранены в CRDT.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={this.handleManualReset}
            className="h-7 text-xs gap-1.5 cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Обновить холст</span>
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
