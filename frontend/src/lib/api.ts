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
      if (res.status === 401) {
        console.log('401 Unauthorized - using fallback data for:', path);
        
        // For user endpoints
        if (path.includes('/user') || path.includes('/me')) {
          const mockUser = {
            _id: 'mock-user-student',
            fullName: 'Student User',
            userId: 'mock-user-student',
            role: 'STUDENT'
          };
          return { user: mockUser } as T;
        }
        
        // For chat endpoints
        if (path.includes('/chat')) {
          return { chats: [], messages: [], unreadCount: 0 } as T;
        }
        
        // For notifications
        if (path.includes('/notifications')) {
          return { notifications: [], unreadCount: 0 } as T;
        }
        
        // For events
        if (path.includes('/events')) {
          return { events: [], alertCount: 0 } as T;
        }
        
        // For other protected endpoints, return empty data
        return [] as T;
      }
      
      console.error('HTTP Error:', res.status, res.statusText);
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json().catch(() => ({}));

    return data as T;
  } catch (error) {
    // Only log errors for critical operations, reduce console noise for development
    if (path !== '/api/auth/login' && !path.includes('/chat') && !path.includes('/notifications') && !path.includes('/events')) {
      console.log('Backend not available for:', path, '- using mock mode');
    }
    
    // Fallback for login when backend is not available
    if (path === '/api/auth/login' && options.method === 'POST') {
      console.log('Backend not available - using mock login');
      
      // Parse login data to determine role
      let role = 'STUDENT';
      try {
        const bodyStr = typeof options.body === 'string' ? options.body : '{}';
        const loginData = JSON.parse(bodyStr);
        if (loginData.email && loginData.email.includes('admin')) {
          role = 'ADMIN';
        } else if (loginData.email && loginData.email.includes('tutor')) {
          role = 'TUTOR';
        }
      } catch (e) {
        // Default to STUDENT if parsing fails
      }
      
      // Mock successful login for demo purposes
      const mockResponse = {
        token: 'mock-token-' + Date.now(),
        user: {
          _id: 'mock-user-' + role.toLowerCase(),
          fullName: role === 'ADMIN' ? 'Admin User' : role === 'TUTOR' ? 'Tutor User' : 'Student User',
          userId: 'mock-user-' + role.toLowerCase(),
          role: role
        }
      };
      
      return mockResponse as T;
    }
    
    // Handle 401 errors with fallback data
    if (error instanceof Error && error.message && error.message.includes('401')) {
      console.log('401 Unauthorized - using fallback data for:', path);
      
      // For user endpoints
      if (path.includes('/user') || path.includes('/me')) {
        const mockUser = {
          _id: 'mock-user-student',
          fullName: 'Student User',
          userId: 'mock-user-student',
          role: 'STUDENT'
        };
        return { user: mockUser } as T;
      }
      
      // For chat endpoints
      if (path.includes('/chat')) {
        return {
          chats: [],
          messages: [],
          unreadCount: 0
        } as T;
      }
      
      // For notifications
      if (path.includes('/notifications')) {
        return { notifications: [], unreadCount: 0 } as T;
      }
      
      // For events
      if (path.includes('/events')) {
        return { events: [], alertCount: 0 } as T;
      }
      
      // For other protected endpoints, return empty data
      return [] as T;
    }
    
    // For other endpoints, return empty data to prevent errors
    if (path.includes('/user')) {
      return { user: null } as T;
    }
    
    if (path.includes('/chat')) {
      return { chats: [], messages: [] } as T;
    }
    
    if (path.includes('/notifications')) {
      return { notifications: [], unreadCount: 0 } as T;
    }
    
    if (path.includes('/events')) {
      return { events: [], alertCount: 0 } as T;
    }
    
    // For other endpoints, re-throw the error
    throw error;
  }
}
