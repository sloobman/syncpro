"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Collaborator {
  id: string;
  name: string;
  avatarUrl: string | null;
  color: string;
}

interface PresenceAvatarsProps {
  users: Collaborator[];
}

export function PresenceAvatars({ users }: PresenceAvatarsProps) {
  const visible = users.slice(0, 4);
  const overflow = users.length - visible.length;

  return (
    <TooltipProvider>
      <div className="flex items-center -space-x-2">
        {visible.map((u) => (
          <Tooltip key={u.id}>
            <TooltipTrigger asChild>
              <div
                className={`relative flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-sm ring-2 ring-background cursor-pointer select-none ${u.color}`}
              >
                {u.name.slice(0, 1)}
                <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-background" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <p>{u.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}

        {overflow > 0 && (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-background">
            +{overflow}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
