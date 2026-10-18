import Link from "next/link";
import { Star, GitBranch, MoreVertical, FileText } from "lucide-react";
import { Document } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRelativeTime } from "@/lib/format";

interface DocumentRowProps {
  document: Document;
}

export function DocumentRow({ document }: DocumentRowProps) {
  return (
    <div className="flex items-center justify-between p-3.5 hover:bg-muted/40 transition-colors group border-b border-border last:border-0">
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <button
          className="text-muted-foreground/60 hover:text-amber-500 transition-colors p-1"
          aria-label="В избранное"
        >
          <Star
            className={`h-4 w-4 ${
              document.isFavorite ? "fill-amber-500 text-amber-500" : ""
            }`}
          />
        </button>

        <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <FileText className="h-4 w-4" />
        </div>

        <Link
          href={`/doc/${document.id}`}
          className="min-w-0 flex-1 group-hover:text-primary transition-colors"
        >
          <p className="text-sm font-medium text-foreground truncate">
            {document.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {document.wordCount} слов • Обновлено {formatRelativeTime(document.updatedAt)}
          </p>
        </Link>
      </div>

      <div className="flex items-center gap-4 shrink-0 pl-4">
        <Badge variant="outline" className="gap-1 font-mono text-[11px] font-normal hidden sm:inline-flex">
          <GitBranch className="h-3 w-3 text-muted-foreground" />
          {document.defaultBranch}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground opacity-60 group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild>
              <Link href={`/doc/${document.id}`}>Открыть</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Переименовать</DropdownMenuItem>
            <DropdownMenuItem>Дублировать</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
