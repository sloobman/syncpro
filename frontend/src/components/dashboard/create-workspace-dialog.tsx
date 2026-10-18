"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const emojiOptions = ["📁", "🚀", "⚡", "💡", "📝", "🔬", "🎨", "💼"];

export function CreateWorkspaceDialog({
  children,
}: {
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("📁");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setOpen(false);
      setName("");
      setDescription("");
    }, 600);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Создать пространство
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Новое рабочее пространство</DialogTitle>
            <DialogDescription>
              Создайте общее пространство для документов вашей команды или проекта
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Emoji Selector */}
            <div className="space-y-2">
              <Label>Иконка</Label>
              <div className="flex gap-2">
                {emojiOptions.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedEmoji(emoji)}
                    className={`h-9 w-9 text-lg rounded-lg border flex items-center justify-center transition-all ${
                      selectedEmoji === emoji
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="ws-name">Название</Label>
              <Input
                id="ws-name"
                placeholder="Например, Инженерия или Продукт"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="ws-desc">Описание (опционально)</Label>
              <Textarea
                id="ws-desc"
                placeholder="Опишите назначение этого рабочего пространства"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Создание..." : "Создать пространство"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
