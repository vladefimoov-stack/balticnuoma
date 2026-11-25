"use client";

import { Bold, Eraser, Italic, Link2, List, ListOrdered } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Props = { id: string; label: string; value: string; onChange: (html: string) => void; placeholder?: string };

/**
 * Small rich-text editor for descriptions: bold, italic, lists, links. Paste is plain
 * text, so formatting from Word / websites never sneaks in. The server sanitizes the
 * HTML again before saving (lib/content/html.ts).
 */
export function RichTextEditor({ id, label, value, onChange, placeholder }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Record<string, boolean>>({});

  // Set the initial HTML once; afterwards the DOM is the source of truth (no caret jumps).
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value && document.activeElement !== ref.current) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  const refreshState = () =>
    setActive({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      insertOrderedList: document.queryCommandState("insertOrderedList"),
    });

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    onChange(ref.current?.innerHTML ?? "");
    refreshState();
  };

  const tool = (command: string, labelText: string, icon: ReactNode, run?: () => void) => (
    <button
      type="button"
      aria-label={labelText}
      title={labelText}
      aria-pressed={active[command] ?? undefined}
      onMouseDown={(e) => e.preventDefault()}
      onClick={run ?? (() => exec(command))}
      className={cn(
        "grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-white/5 hover:text-fg",
        active[command] && "bg-amber/15 text-amber",
      )}
    >
      {icon}
    </button>
  );

  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${id}-label`} className="text-xs font-medium tracking-wide text-muted">
        {label}
      </span>
      <div className="overflow-hidden rounded-xl border border-line-strong bg-bg/70 focus-within:border-amber">
        <div
          className="flex flex-wrap gap-0.5 border-b border-line px-1.5 py-1"
          role="toolbar"
          aria-label={`${label}: formatavimas`}
        >
          {tool("bold", "Paryškinti", <Bold className="size-4" aria-hidden />)}
          {tool("italic", "Kursyvas", <Italic className="size-4" aria-hidden />)}
          {tool("insertUnorderedList", "Sąrašas", <List className="size-4" aria-hidden />)}
          {tool("insertOrderedList", "Numeruotas sąrašas", <ListOrdered className="size-4" aria-hidden />)}
          {tool("createLink", "Nuoroda", <Link2 className="size-4" aria-hidden />, () => {
            const url = window.prompt("Nuorodos adresas (https://…)", "https://");
            if (url && /^(https:\/\/|mailto:|tel:)/.test(url)) exec("createLink", url);
          })}
          {tool("removeFormat", "Išvalyti formatavimą", <Eraser className="size-4" aria-hidden />)}
        </div>
        <div
          ref={ref}
          id={id}
          role="textbox"
          aria-multiline="true"
          aria-labelledby={`${id}-label`}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          onInput={() => onChange(ref.current?.innerHTML ?? "")}
          onKeyUp={refreshState}
          onMouseUp={refreshState}
          onPaste={(e) => {
            e.preventDefault();
            document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
          }}
          className="min-h-36 px-3.5 py-3 text-sm leading-relaxed text-fg outline-none empty:before:text-muted/60 empty:before:content-[attr(data-placeholder)] [&_a]:text-amber [&_a]:underline [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-2 [&_ul]:list-disc"
        />
      </div>
    </div>
  );
}
