"use client";

import { ArrowLeft, ArrowRight, GripVertical, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type DragEvent } from "react";
import { deleteImage, registerImage, reorderImages, setCoverImage, updateImageAlt } from "@/lib/admin/car-actions";
import type { EditorImage } from "@/lib/admin/cars";
import { prepareImage } from "@/lib/admin/image";
import { getBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { adminInput, adminLabel, Notice } from "../ui";

type Upload = { name: string; state: "working" | "done" | "error"; error?: string };

const UPLOAD_ERRORS: Record<string, string> = {
  not_image: "tai ne nuotrauka",
  too_large: "per didelė net ir suspaudus",
  encode_failed: "nepavyko suspausti",
};

export function PhotosStep({ carId, images }: { carId: string; images: EditorImage[] }) {
  const router = useRouter();
  const [order, setOrder] = useState(images);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  // Server data wins after every refresh (upload, delete, cover…).
  useEffect(() => setOrder(images), [images]);

  async function upload(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    setMessage(null);
    setUploads(list.map((f) => ({ name: f.name, state: "working" })));
    const supabase = getBrowserClient();

    for (const [index, file] of list.entries()) {
      const mark = (patch: Partial<Upload>) =>
        setUploads((u) => u.map((item, i) => (i === index ? { ...item, ...patch } : item)));
      try {
        const prepared = await prepareImage(file);
        const path = `cars/${carId}/${crypto.randomUUID()}.${prepared.extension}`;
        const { error } = await supabase.storage
          .from("car-images")
          .upload(path, prepared.blob, { contentType: prepared.blob.type, cacheControl: "31536000", upsert: false });
        if (error) throw new Error(error.message);
        const res = await registerImage(carId, {
          path,
          width: prepared.width,
          height: prepared.height,
          blurDataUrl: prepared.blurDataUrl,
        });
        if (!res.ok) throw new Error(res.error);
        mark({ state: "done" });
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        mark({ state: "error", error: UPLOAD_ERRORS[code] ?? (code || "nepavyko įkelti") });
      }
    }
    router.refresh();
  }

  const act = (action: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const res = await action();
      setMessage({ ok: res.ok, text: (res.ok ? res.message : res.error) ?? "" });
      router.refresh();
    });

  function move(from: number, to: number) {
    if (to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setOrder(next);
    act(() =>
      reorderImages(
        carId,
        next.map((i) => i.id),
      ),
    );
  }

  const onDropZone = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
  };

  return (
    <div className="flex flex-col gap-5">
      <label
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setOver(true);
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDropZone}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-3 rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors",
          over ? "border-amber bg-amber/5" : "border-line-strong hover:border-amber/50",
        )}
      >
        <ImagePlus className="size-8 text-amber" aria-hidden />
        <span className="font-medium">Nutempkite nuotraukas čia arba spauskite ir pasirinkite</span>
        <span className="text-sm text-muted">
          Galima kelias iš karto. Nuotraukos automatiškai sumažinamos ir suspaudžiamos (WebP). Rekomenduojama: visas
          automobilis kadre, priekis, šonas, galas, 3/4 ir salonas.
        </span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) void upload(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {uploads.length > 0 && (
        <ul className="flex flex-col gap-1.5 text-sm" aria-live="polite">
          {uploads.map((u, i) => (
            <li key={i} className="flex items-center gap-2">
              {u.state === "working" && <Loader2 className="size-4 animate-spin text-muted" aria-hidden />}
              {u.state === "done" && <span className="size-2 rounded-full bg-free" aria-hidden />}
              {u.state === "error" && <span className="size-2 rounded-full bg-busy" aria-hidden />}
              <span className="truncate">{u.name}</span>
              <span className="text-muted">
                {u.state === "working" ? "įkeliama…" : u.state === "done" ? "įkelta" : `klaida: ${u.error}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      {message && <Notice tone={message.ok ? "success" : "error"}>{message.text}</Notice>}

      {order.length === 0 ? (
        <p className="text-sm text-muted">Nuotraukų dar nėra — svetainėje rodomas automobilio siluetas.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {order.map((img, index) => (
            <li
              key={img.id}
              draggable
              onDragStart={(e) => {
                setDragging(img.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={() => setDragging(null)}
              onDragOver={(e) => {
                if (dragging) e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (!dragging) return;
                move(
                  order.findIndex((i) => i.id === dragging),
                  index,
                );
                setDragging(null);
              }}
              className={cn(
                "flex flex-col overflow-hidden rounded-card border bg-surface",
                img.isCover ? "border-amber/50" : "border-line",
                dragging === img.id && "opacity-50",
              )}
            >
              <div className="relative aspect-[4/3] bg-surface-2">
                <Image
                  src={img.url}
                  alt={img.altLt || "Automobilio nuotrauka"}
                  fill
                  sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"
                  className="object-cover"
                />
                <span className="absolute top-2 left-2 flex items-center gap-1 rounded-pill bg-black/60 px-2 py-1 text-xs text-white">
                  <GripVertical className="size-3.5" aria-hidden /> {index + 1}
                </span>
                {img.isCover && (
                  <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-pill bg-amber px-2 py-1 text-xs font-semibold text-on-amber">
                    <Star className="size-3.5" aria-hidden /> Viršelis
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2.5 p-3">
                <AltField
                  label="Aprašymas LT (alt)"
                  initial={img.altLt}
                  onSave={(v) => act(() => updateImageAlt(img.id, v, img.altEn))}
                />
                <AltField
                  label="Aprašymas EN (alt)"
                  initial={img.altEn}
                  onSave={(v) => act(() => updateImageAlt(img.id, img.altLt, v))}
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={pending || index === 0}
                    onClick={() => move(index, index - 1)}
                    aria-label="Perkelti į kairę"
                    className="grid size-9 place-items-center rounded-lg border border-line text-muted hover:text-fg disabled:opacity-30"
                  >
                    <ArrowLeft className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    disabled={pending || index === order.length - 1}
                    onClick={() => move(index, index + 1)}
                    aria-label="Perkelti į dešinę"
                    className="grid size-9 place-items-center rounded-lg border border-line text-muted hover:text-fg disabled:opacity-30"
                  >
                    <ArrowRight className="size-4" aria-hidden />
                  </button>
                  {!img.isCover && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => act(() => setCoverImage(carId, img.id))}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-xs hover:border-amber/50 hover:text-amber"
                    >
                      <Star className="size-3.5" aria-hidden /> Viršelis
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm("Ištrinti šią nuotrauką?")) act(() => deleteImage(img.id));
                    }}
                    aria-label="Ištrinti nuotrauką"
                    className="ml-auto grid size-9 place-items-center rounded-lg border border-line text-muted hover:border-busy/50 hover:text-busy"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AltField({ label, initial, onSave }: { label: string; initial: string; onSave: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <label className="flex flex-col gap-1">
      <span className={adminLabel}>{label}</span>
      <input
        value={value}
        maxLength={200}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => value !== initial && onSave(value)}
        className={cn(adminInput, "h-9 text-xs")}
      />
    </label>
  );
}
