import { IMAGE_UPLOAD_API_URL } from '../config';

/**
 * Fast Client-Side Image Compression & Direct Upload API Service
 * Compresses images like Telegram / WhatsApp before uploading to https://img-to-url-five.vercel.app/api/upload
 */

/**
 * Compresses an image file using an offscreen HTML Canvas (Telegram/WhatsApp style)
 * Max resolution: 1440px, quality: 0.82 JPEG
 * This reduces 5MB-10MB mobile photos to ~100KB-250KB in under 50ms.
 */
export async function compressImage(file: File | Blob, maxWidth = 1440, quality = 0.82): Promise<Blob> {
  // If it's already a tiny image or gif (preserve animation), don't compress
  if (file.type === 'image/gif' || file.size < 60 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width > maxWidth || height > maxWidth) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxWidth) / height);
          height = maxWidth;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve(blob);
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

/**
 * Uploads image silently to the direct URL endpoint without any user popup/alerts.
 */
export async function uploadImageApi(fileOrBlob: File | Blob): Promise<string> {
  try {
    // 1. Compress image client-side first
    const compressedBlob = await compressImage(fileOrBlob);

    // 2. Prepare FormData
    const formData = new FormData();
    const fileName = (fileOrBlob as File).name ? (fileOrBlob as File).name.replace(/\.[^/.]+$/, '.jpg') : 'image.jpg';
    formData.append('image', compressedBlob, fileName);

    // 3. Post to direct API
    const response = await fetch(IMAGE_UPLOAD_API_URL, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (response.ok && data?.ok && data?.url) {
      return data.url;
    }
    if (data?.results?.[0]?.url) {
      return data.results[0].url;
    }
  } catch (err) {
    console.warn('Background image upload api warning:', err);
  }

  // Fallback to base64 Data URL so communication is never broken
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read image'));
      }
    };
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsDataURL(fileOrBlob);
  });
}
