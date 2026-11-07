"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
              <div className="relative cursor-pointer select-none">
                <Avatar className={`h-7 w-7 ring-2 ring-background text-[11px] font-bold text-white shadow-sm ${u.color}`}>
                  {u.avatarUrl ? (
                    <AvatarImage src={u.avatarUrl} alt={u.name} className="object-cover" />
                  ) : null}
                  <AvatarFallback className={`${u.color} text-white text-[11px] font-bold`}>
                    {u.name.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
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
