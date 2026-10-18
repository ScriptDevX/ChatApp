/**
 * ====================================================================
 *                 FunChat - Central Configuration File
 * ====================================================================
 *
 * HOW TO CONFIGURE YOUR APP:
 *
 * OPTION 1 (Recommended for Vercel):
 * Set environment variables in your Vercel Dashboard:
 * Settings -> Environment Variables (e.g. VITE_FIREBASE_API_KEY).
 *
 * OPTION 2 (Direct Edit):
 * Simply replace the placeholder values below directly in this file.
 */

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_FIREBASE_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID",
};

/**
 * Image Upload Endpoint
 * Compresses and uploads user profile pictures and group avatars.
 * Falls back safely to base64 Data URLs if this service is ever unreachable.
 */
export const IMAGE_UPLOAD_API_URL =
  import.meta.env.VITE_IMAGE_UPLOAD_API_URL || "https://img-to-url-five.vercel.app/api/upload";

/**
 * Application Base URL
 * Dynamically resolves to the current domain (e.g. your-app.vercel.app or localhost).
 */
export const APP_BASE_URL =
  typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : (import.meta.env.VITE_APP_URL || 'https://your-funchat-app.vercel.app');

/**
 * Group Invite Link Base URL
 */
export const INVITE_LINK_BASE = `${APP_BASE_URL}/?join=`;
