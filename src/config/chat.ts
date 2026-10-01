// Kali chatbot config. The backend lives in the web repo (Vercel) and holds
// the Gemini key — nothing secret belongs in this file.
export const CHAT_API_URL = 'https://kalingacare-drab.vercel.app/api/chat';

export const CHAT_MAX_USER_MESSAGES = 30;
export const CHAT_MIN_SEND_INTERVAL_MS = 1500;
export const CHAT_INPUT_MAX_LENGTH = 400;
export const CHAT_HISTORY_WINDOW = 12;
export const CHAT_CATALOG_MAX_ITEMS = 80;
