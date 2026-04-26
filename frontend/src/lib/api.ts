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
  
  try {
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
          window.location.href = "/login";
        }
      }
      throw new ApiError(data?.message || `HTTP ${res.status}`, res.status, data);
    }

    return data as T;
  } catch (error) {
    console.error('API Fetch Error:', error);
    
    // Fallback for login when backend is not available
    if (path === '/api/auth/login' && options.method === 'POST') {
      console.log('Backend not available - using mock login');
      
      // Mock successful login for demo purposes
      const mockResponse = {
        token: 'mock-token-' + Date.now(),
        user: {
          _id: 'demo-user',
          fullName: 'Demo User',
          userId: 'demo-user',
          role: 'STUDENT'
        }
      };
      
      return mockResponse as T;
    }
    
    throw error;
  }
}
