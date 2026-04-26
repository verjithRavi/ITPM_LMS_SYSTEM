const getBaseUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  
  // Debug environment variable loading
  if (typeof window !== 'undefined') {
    console.log('Environment Debug:');
    console.log('NEXT_PUBLIC_API_BASE_URL:', process.env.NEXT_PUBLIC_API_BASE_URL);
    console.log('BASE after processing:', baseUrl);
  }
  
  console.log('Final BASE URL being returned:', baseUrl || 'http://localhost:5001');
  return baseUrl || 'http://localhost:5001';
};

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
  console.log('=== API Fetch Debug ===');
  const baseUrl = getBaseUrl();
  console.log('BASE URL:', baseUrl);
  console.log('Path:', path);
  console.log('Token exists:', !!token);
  
  if (!baseUrl) {
    throw new Error('API base URL is not configured');
  }
  
  const fullUrl = `${baseUrl}${path}`;
  console.log('Full URL:', fullUrl);
  
  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!res.ok) {
    console.error('HTTP Error:', res.status, res.statusText);
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

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
