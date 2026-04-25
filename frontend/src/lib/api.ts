const BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export class ApiError extends Error {
  status: number;
  code?: string;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;

    if (data && typeof data === "object" && "code" in data) {
      this.code = String((data as { code?: unknown }).code);
    }
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && token && typeof window !== "undefined") {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }

    const message = data?.message || data?.reply || "Request failed";
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}
