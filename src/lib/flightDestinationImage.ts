/**
 * Phase 7G — client-side master-image processing (first version).
 *
 * Produces a single 800×600 (4:3) WebP master from an uploaded file using a
 * cover-crop honouring the chosen focal point. Browsers reliably ENCODE WebP via
 * <canvas>.toBlob; AVIF encoding is NOT reliably available in-browser, so the
 * AVIF/JPG/480 variants are produced later by a server-side pipeline (see
 * IMAGE_VARIANT_PHASE in flightDestinations.ts). This function never fabricates
 * output: if the runtime cannot decode the file or encode WebP, it rejects.
 */

import { MASTER_IMAGE_WIDTH, MASTER_IMAGE_HEIGHT, clampFocal } from "./flightDestinations";

export interface ProcessedMaster {
  blob: Blob;
  width: number;
  height: number;
  type: string;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode the selected image"));
    };
    img.src = url;
  });
}

/**
 * Cover-crop `file` to 800×600 WebP around the focal point (0..1).
 * Rejects if decoding or WebP encoding is unavailable.
 */
export async function processMasterImage(
  file: File,
  focalX = 0.5,
  focalY = 0.5,
): Promise<ProcessedMaster> {
  const img = await loadImage(file);

  const targetW = MASTER_IMAGE_WIDTH;
  const targetH = MASTER_IMAGE_HEIGHT;
  const targetRatio = targetW / targetH;
  const srcRatio = img.naturalWidth / img.naturalHeight;

  // Cover crop: pick the largest source rect matching the target ratio.
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  if (srcRatio > targetRatio) {
    sw = Math.round(img.naturalHeight * targetRatio);
  } else {
    sh = Math.round(img.naturalWidth / targetRatio);
  }
  const maxSx = img.naturalWidth - sw;
  const maxSy = img.naturalHeight - sh;
  const sx = Math.round(maxSx * clampFocal(focalX));
  const sy = Math.round(maxSy * clampFocal(focalY));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context is not available in this browser");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/webp", 0.82),
  );
  if (!blob || blob.type !== "image/webp") {
    throw new Error("This browser cannot encode WebP; upload a pre-optimised WebP instead");
  }

  return { blob, width: targetW, height: targetH, type: blob.type };
}
