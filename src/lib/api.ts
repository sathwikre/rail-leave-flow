export const API_BASE =
  import.meta.env.VITE_API_BASE?.trim().replace(/\/$/, "") || "http://localhost:3000";

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
}
