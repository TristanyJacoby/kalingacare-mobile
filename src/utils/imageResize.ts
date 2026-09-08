// Shrinks and compresses an image file down to something small enough to
// safely store as a Firestore text field (base64), and returns it as a
// base64 string ready to save directly to the user's profile.
export function resizeImageToBase64(
  file: File,
  maxSize = 300,
  quality = 0.7,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        // Figure out new width/height, keeping things square-ish and
        // capped at maxSize (300px is plenty for a small avatar circle).
        const canvas = document.createElement("canvas");
        canvas.width = maxSize;
        canvas.height = maxSize;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not process image."));
          return;
        }

        // Crop to a centered square before resizing, so the avatar
        // doesn't come out stretched or squished.
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;

        ctx.drawImage(img, sx, sy, side, side, 0, 0, maxSize, maxSize);

        // Convert the canvas into a compressed JPEG base64 string.
        const base64 = canvas.toDataURL("image/jpeg", quality);
        resolve(base64);
      };

      img.onerror = () => reject(new Error("Could not load image."));
      img.src = reader.result as string;
    };

    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}
