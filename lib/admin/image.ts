/**
 * Browser-side photo preparation before upload: scale down to 2400 px on the long
 * side, encode as WebP (JPEG where the browser can't encode WebP) and build a tiny
 * blurred placeholder for next/image. EXIF orientation is applied by createImageBitmap.
 */

export const MAX_SIDE = 2400;
export const MAX_UPLOAD_BYTES = 9.5 * 1024 * 1024;

export type PreparedImage = {
  blob: Blob;
  extension: "webp" | "jpg";
  width: number;
  height: number;
  blurDataUrl: string | null;
};

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) throw new Error("not_image");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no_canvas");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);

    let blob = await canvasToBlob(canvas, "image/webp", 0.85);
    let extension: PreparedImage["extension"] = "webp";
    if (!blob || blob.type !== "image/webp") {
      blob = await canvasToBlob(canvas, "image/jpeg", 0.86);
      extension = "jpg";
    }
    if (!blob) throw new Error("encode_failed");
    if (blob.size > MAX_UPLOAD_BYTES) throw new Error("too_large");

    // ~16 px wide placeholder (well under the 2 KB column limit).
    const tiny = document.createElement("canvas");
    tiny.width = 16;
    tiny.height = Math.max(1, Math.round((16 * height) / width));
    tiny.getContext("2d")?.drawImage(bitmap, 0, 0, tiny.width, tiny.height);
    let blurDataUrl: string | null = tiny.toDataURL("image/webp", 0.5);
    if (!blurDataUrl.startsWith("data:image/webp")) blurDataUrl = tiny.toDataURL("image/jpeg", 0.6);
    if (blurDataUrl.length > 2000) blurDataUrl = null;

    return { blob, extension, width, height, blurDataUrl };
  } finally {
    bitmap.close();
  }
}
