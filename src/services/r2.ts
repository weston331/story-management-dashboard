import { getSupabaseClient } from './supabase';
import logger from './logger';

const WORKER_URL = import.meta.env.VITE_R2_UPLOAD_WORKER_URL ?? '';

/**
 * Uploads a file to Cloudflare R2 using the Cloudflare Worker as a secure proxy.
 * Resolves with the public URL of the uploaded file.
 */
export async function uploadImageToR2(file: File): Promise<string> {
  if (!WORKER_URL) {
    throw new Error(
      navigator.language.startsWith('ar')
        ? 'عنوان خادم الرفع (VITE_R2_UPLOAD_WORKER_URL) غير مكوّن في ملف البيئة .env'
        : 'Upload Worker URL (VITE_R2_UPLOAD_WORKER_URL) is not configured in .env'
    );
  }

  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client not initialized');
  }

  // Get active session to retrieve the JWT Token
  const { data: { session }, error: sessionError } = await client.auth.getSession();
  if (sessionError || !session) {
    throw new Error(
      navigator.language.startsWith('ar')
        ? 'يرجى تسجيل الدخول أولاً للمتابعة.'
        : 'Please sign in to upload images.'
    );
  }

  const token = session.access_token;

  logger.info('Uploading file to Cloudflare R2...', { name: file.name, size: file.size, type: file.type });

  const response = await fetch(`${WORKER_URL.replace(/\/+$/, '')}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': file.type || 'image/png',
    },
    body: file,
  });

  if (!response.ok) {
    let errMsg = `Server returned status: ${response.status}`;
    try {
      const errText = await response.text();
      if (errText) errMsg = errText;
    } catch {
      // Ignore
    }
    throw new Error(errMsg);
  }

  const result = await response.json();
  if (!result || !result.url) {
    throw new Error('Invalid response structure from upload server');
  }

  logger.info('R2 upload succeeded:', { url: result.url });
  return result.url;
}

/**
 * Deletes a file from Cloudflare R2 using the Cloudflare Worker.
 * 
 * @param url The public URL of the image to delete
 */
export async function deleteImageFromR2(url: string): Promise<void> {
  if (!WORKER_URL || !url) return;

  const client = getSupabaseClient();
  if (!client) return;

  try {
    const { data: { session } } = await client.auth.getSession();
    if (!session) return;

    logger.info('Requesting R2 file deletion...', { url });

    const response = await fetch(`${WORKER_URL.replace(/\/+$/, '')}/upload`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      logger.warn('R2 file deletion returned non-200 response:', { status: response.status });
    } else {
      logger.info('R2 file successfully deleted:', { url });
    }
  } catch (err) {
    logger.error('Failed deleting image from R2:', err);
  }
}
