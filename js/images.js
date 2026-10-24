const MAX_INPUT_BYTES = 15 * 1024 * 1024;

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({
      image,
      release: () => URL.revokeObjectURL(url)
    });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This image could not be opened. Please choose a JPG, PNG, or WebP image."));
    };
    image.src = url;
  });
}

function dataUrlBytes(dataUrl) {
  const base64 = dataUrl.split(",")[1] || "";
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/**
 * Compresses an image to a JPEG data URL, keeping it small enough for one Firestore document.
 * Covers should use maxWidth: 600 and maxBytes: 400 * 1024.
 * Sample pages should use maxWidth: 900 and maxBytes: 280 * 1024.
 */
export async function compressImage(file, options = {}) {
  if (!(file instanceof File)) throw new Error("Choose an image file first.");
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
    throw new Error("Please use a JPG, PNG, or WebP image.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("This image is larger than 15 MB. Please choose a smaller file.");
  }

  const maxWidth = Math.max(320, Number(options.maxWidth) || 900);
  const maxHeight = Math.max(320, Number(options.maxHeight) || 1200);
  const maxBytes = Math.max(80 * 1024, Number(options.maxBytes) || 280 * 1024);
  const initialQuality = Math.min(0.85, Math.max(0.5, Number(options.quality) || 0.75));
  const loaded = await fileToImage(file);

  try {
    const source = loaded.image;
    let scale = Math.min(1, maxWidth / source.naturalWidth, maxHeight / source.naturalHeight);
    let quality = initialQuality;

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const width = Math.max(1, Math.round(source.naturalWidth * scale));
      const height = Math.max(1, Math.round(source.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Your browser could not prepare the image.");

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(source, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (dataUrlBytes(dataUrl) <= maxBytes) {
        canvas.width = 0;
        canvas.height = 0;
        return dataUrl;
      }
      canvas.width = 0;
      canvas.height = 0;

      if (quality > 0.58) {
        quality = Math.max(0.58, quality - 0.07);
      } else {
        scale *= 0.84;
        quality = initialQuality;
      }
      if (scale < 0.2) break;
    }
    throw new Error("The image could not be compressed below the Firestore size limit. Try a simpler or smaller image.");
  } finally {
    loaded.release();
  }
}

export async function compressCover(file) {
  return compressImage(file, { maxWidth: 600, maxHeight: 900, maxBytes: 400 * 1024, quality: 0.75 });
}

export async function compressSamplePage(file) {
  return compressImage(file, { maxWidth: 900, maxHeight: 1400, maxBytes: 280 * 1024, quality: 0.75 });
}

export async function compressAuthorPhoto(file) {
  return compressImage(file, { maxWidth: 600, maxHeight: 600, maxBytes: 250 * 1024, quality: 0.75 });
}
