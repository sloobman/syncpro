import { Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Suspense fallback={<div className="w-64 border-r border-border bg-card" />}>
          <Sidebar />
        </Suspense>
      </div>

      {/* Mobile drawer */}
      <Suspense fallback={null}>
        <MobileNav />
      </Suspense>

      {/* Main content wrapper */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-muted/20">
          <div className="max-w-6xl mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
