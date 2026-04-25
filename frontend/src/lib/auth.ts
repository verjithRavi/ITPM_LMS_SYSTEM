export function saveToken(token: string) {
  localStorage.setItem("token", token);
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function clearToken() {
  localStorage.removeItem("token");
}