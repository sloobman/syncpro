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
  Minus,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Table,
  Undo2,
  Redo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function EditorToolbar() {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-10 border-b border-border bg-card/60 backdrop-blur-sm px-3 flex items-center gap-1 overflow-x-auto no-scrollbar select-none z-10">
        {/* Undo / Redo */}
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Отменить (Cmd+Z)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <Redo2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Повторить (Cmd+Shift+Z)</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-4 mx-1" />

        {/* Text styling */}
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <Bold className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Полужирный (Cmd+B)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <Italic className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Курсив (Cmd+I)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <Underline className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Подчеркнутый (Cmd+U)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <Strikethrough className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Зачеркнутый</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-4 mx-1" />

        {/* Headings */}
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <Heading1 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Заголовок H1</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <Heading2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Заголовок H2</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <Heading3 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Заголовок H3</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-4 mx-1" />

        {/* Lists */}
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <List className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Маркированный список</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <ListOrdered className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Нумерованный список</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <ListTodo className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Чек-лист задач</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-4 mx-1" />

        {/* Blocks & Media */}
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <Quote className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Цитата</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <Code className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Блок кода</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <LinkIcon className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Вставить ссылку</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <ImageIcon className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Изображение</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <Table className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Таблица</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
