import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background">
      {/* Left side branding decoration */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-muted/40 border-r border-border relative overflow-hidden">
        <div className="z-10">
          <Logo size="lg" />
        </div>

        <div className="z-10 space-y-4 max-w-md">
          <blockquote className="text-xl font-medium leading-relaxed">
            «SyncPro объединил скорость локального редактора с мощью Merkle-CRDT и контроля версий, кардинально изменив подход к командной работе над документами.»
          </blockquote>
          <div>
            <p className="font-semibold text-foreground">Команда Antigravity</p>
            <p className="text-sm text-muted-foreground">Архитекторы SyncPro Engine</p>
          </div>
        </div>

        <div className="z-10 flex items-center gap-6 text-xs text-muted-foreground">
          <span>CRDT Engine</span>
          <span>•</span>
          <span>Merkle-DAG</span>
          <span>•</span>
          <span>Offline-First</span>
        </div>

        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Right side form */}
      <div className="flex flex-col items-center justify-center p-6 sm:p-12 relative">
        <div className="lg:hidden absolute top-6 left-6">
          <Logo size="default" />
        </div>

        <div className="w-full max-w-md mx-auto pt-12 lg:pt-0">
          {children}
        </div>
      </div>
    </div>
  );
}
