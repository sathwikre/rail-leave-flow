export function apiUrl(path: string) {
  const apiBase = import.meta.env.VITE_API_BASE?.replace(/\/$/, "") ?? "";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return apiBase ? `${apiBase}${normalizedPath}` : normalizedPath;
}
