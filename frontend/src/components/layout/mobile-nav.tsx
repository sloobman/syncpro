"use client";

import { X } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/lib/stores/ui-store";

export function MobileNav() {
  const { sidebarOpen, toggleSidebar } = useUIStore();

  if (!sidebarOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={toggleSidebar}
      />

      {/* Drawer */}
      <div className="relative flex flex-col w-72 max-w-[85vw] bg-card h-full shadow-2xl z-10 border-r border-border">
        <div className="absolute top-4 right-4 z-20">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleSidebar}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Sidebar />
      </div>
    </div>
  );
}
