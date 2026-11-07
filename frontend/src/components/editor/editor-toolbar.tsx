"use client";

import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Table,
  Undo2,
  Redo2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface EditorToolbarProps {
  onAction?: (action: string) => void;
  disabled?: boolean;
}

export function EditorToolbar({ onAction, disabled = false }: EditorToolbarProps) {
  if (disabled) {
    return (
      <div className="h-10 border-b border-border bg-muted/40 backdrop-blur-md px-4 flex items-center justify-between text-xs text-muted-foreground select-none z-10">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary shrink-0" />
          <span className="font-medium text-foreground">Режим только для чтения</span>
          <span className="hidden sm:inline">— у вас роль «Читатель». Редактирование текста и структуры документа отключено.</span>
        </div>
      </div>
    );
  }

  const trigger = (action: string) => {
    if (onAction) {
      onAction(action);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-10 border-b border-border bg-card/75 backdrop-blur-md px-3 flex items-center gap-1 overflow-x-auto no-scrollbar select-none z-10">
        {/* Undo / Redo */}
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => trigger("undo")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Отменить (Cmd+Z)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => trigger("redo")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Повторить (Cmd+Shift+Z)</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-4 mx-1" />

        {/* Headings */}
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => trigger("h1")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Heading1 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Заголовок 1</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => trigger("h2")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Heading2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Заголовок 2</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => trigger("h3")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Heading3 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Заголовок 3</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-4 mx-1" />

        {/* Text formatting */}
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => trigger("bold")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Bold className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Жирный (Cmd+B)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => trigger("italic")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Italic className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Курсив (Cmd+I)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => trigger("underline")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Underline className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Подчёркнутый (Cmd+U)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => trigger("strike")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Strikethrough className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Зачёркнутый</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-4 mx-1" />

        {/* Lists & Tasks */}
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => trigger("bullet-list")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Маркированный список</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => trigger("numbered-list")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ListOrdered className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Нумерованный список</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => trigger("todo-list")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ListTodo className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Список задач</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-4 mx-1" />

        {/* Blocks & Rich items */}
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => trigger("quote")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Quote className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Цитата</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => trigger("code")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Code className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Блок кода</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => trigger("table")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Table className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Таблица</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-4 mx-1" />

        {/* Media / Links */}
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => trigger("link")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <LinkIcon className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Вставить ссылку</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => trigger("image")}
                className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ImageIcon className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Изображение</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
