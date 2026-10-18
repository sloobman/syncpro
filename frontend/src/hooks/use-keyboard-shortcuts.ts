'use client';

import { useEffect } from 'react';

interface ShortcutModifiers {
  ctrlOrMeta?: boolean;
  shift?: boolean;
  alt?: boolean;
}

interface ShortcutDefinition {
  key: string;
  modifiers?: ShortcutModifiers;
  handler: (event: KeyboardEvent) => void;
}

type ShortcutMap = Record<string, (event: KeyboardEvent) => void>;

function parseShortcutString(shortcut: string): {
  key: string;
  modifiers: ShortcutModifiers;
} {
  const parts = shortcut.toLowerCase().split('+').map((p) => p.trim());
  const modifiers: ShortcutModifiers = {};
  let key = '';

  for (const part of parts) {
    switch (part) {
      case 'cmd':
      case 'ctrl':
      case 'mod':
        modifiers.ctrlOrMeta = true;
        break;
      case 'shift':
        modifiers.shift = true;
        break;
      case 'alt':
        modifiers.alt = true;
        break;
      default:
        key = part;
    }
  }

  return { key, modifiers };
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap): void {
  useEffect(() => {
    const definitions: ShortcutDefinition[] = Object.entries(shortcuts).map(
      ([combo, handler]) => {
        const { key, modifiers } = parseShortcutString(combo);
        return { key, modifiers, handler };
      },
    );

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      for (const def of definitions) {
        const keyMatch = event.key.toLowerCase() === def.key;
        const ctrlOrMeta = def.modifiers?.ctrlOrMeta
          ? event.metaKey || event.ctrlKey
          : !event.metaKey && !event.ctrlKey;
        const shift = def.modifiers?.shift ? event.shiftKey : !event.shiftKey;
        const alt = def.modifiers?.alt ? event.altKey : !event.altKey;

        if (keyMatch && ctrlOrMeta && shift && alt) {
          // Allow shortcuts with modifiers even in inputs
          if (isInput && !def.modifiers?.ctrlOrMeta) {
            continue;
          }
          event.preventDefault();
          event.stopPropagation();
          def.handler(event);
          return;
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
}
