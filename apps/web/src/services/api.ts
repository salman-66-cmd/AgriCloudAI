const API_BASE = '/api/v1';

export class ApiError extends Error {
  statusCode: number;
  code?: string;
  details?: any;

  constructor(message: string, statusCode = 400, code?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem('agricloud_access_token'),
  setAccessToken: (token: string) => localStorage.setItem('agricloud_access_token', token),
  getRefreshToken: () => localStorage.getItem('agricloud_refresh_token'),
  setRefreshToken: (token: string) => localStorage.setItem('agricloud_refresh_token', token),
  clear: () => {
    localStorage.removeItem('agricloud_access_token');
    localStorage.removeItem('agricloud_refresh_token');
    localStorage.removeItem('agricloud_user');
  },
};

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStorage.getAccessToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const response = await fetch(url, { ...options, headers });

  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    // Attempt automatic token refresh
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          tokenStorage.setAccessToken(data.data.accessToken);

          // Retry original request with fresh access token
          headers.set('Authorization', `Bearer ${data.data.accessToken}`);
          const retryRes = await fetch(url, { ...options, headers });
          if (retryRes.ok) {
            const json = await retryRes.json();
            return json.data !== undefined ? json.data : json;
          }
        }
      } catch (e) {
        // Refresh failed -> clear session
      }
    }

    tokenStorage.clear();
    if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
      window.location.href = '/login';
    }
  }

  if (!response.ok) {
    let errMessage = `HTTP error ${response.status}`;
    let errCode = 'HTTP_ERROR';
    let details: any = null;

    try {
      const errJson = await response.json();
      if (errJson.error) {
        errMessage = errJson.error.message || errMessage;
        errCode = errJson.error.code || errCode;
        details = errJson.error.details;
      }
    } catch {
      // Body not JSON
    }

    throw new ApiError(errMessage, response.status, errCode, details);
  }

  const json = await response.json();
  return json.data !== undefined ? json.data : json;
}

export const api = {
  // Auth
  auth: {
    login: (credentials: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    register: (data: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    logout: () => {
      const refreshToken = tokenStorage.getRefreshToken();
      tokenStorage.clear();
      return request<any>('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) });
    },
    me: () => request<{ user: any }>('/auth/me'),
  },

  // Farms
  farms: {
    list: () => request<{ farms: any[] }>('/farms'),
    get: (id: string) => request<{ farm: any }>(`/farms/${id}`),
    create: (data: any) => request<{ farm: any }>('/farms', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<{ farm: any }>(`/farms/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/farms/${id}`, { method: 'DELETE' }),
  },

  // Fields
  fields: {
    listByFarm: (farmId: string) => request<{ fields: any[] }>(`/farms/${farmId}/fields`),
    get: (id: string) => request<{ field: any }>(`/fields/${id}`),
    create: (farmId: string, data: any) =>
      request<{ field: any }>(`/farms/${farmId}/fields`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<{ field: any }>(`/fields/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/fields/${id}`, { method: 'DELETE' }),
  },

  // Crops
  crops: {
    list: () => request<{ crops: any[] }>('/crops'),
    get: (id: string) => request<{ crop: any }>(`/crops/${id}`),
    create: (data: any) => request<{ crop: any }>('/crops', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Sensors
  sensors: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<{ sensors: any[] }>(`/sensors${qs}`);
    },
    listByField: (fieldId: string) => request<{ sensors: any[] }>(`/fields/${fieldId}/sensors`),
    get: (id: string) => request<{ sensor: any }>(`/sensors/${id}`),
    register: (data: any) => request<{ sensor: any }>('/sensors', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<{ sensor: any }>(`/sensors/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/sensors/${id}`, { method: 'DELETE' }),
    readings: (id: string, params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<{ readings: any[] }>(`/sensors/${id}/readings${qs}`);
    },
    ingest: (id: string, data: any) =>
      request<{ reading: any }>(`/sensors/${id}/readings`, { method: 'POST', body: JSON.stringify(data) }),
  },

  // Telemetry Readings
  readings: {
    latest: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<{ fields: any[] }>(`/readings/latest${qs}`);
    },
    history: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<{ readings: any[] }>(`/readings/history${qs}`);
    },
    ingest: (data: any) => request<{ reading: any }>('/readings/ingest', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Irrigation
  irrigation: {
    getField: (fieldId: string) => request<any>(`/fields/${fieldId}/irrigation`),
    start: (fieldId: string, data: { durationSeconds?: number; reason?: string }) =>
      request<any>(`/fields/${fieldId}/irrigation/start`, { method: 'POST', body: JSON.stringify(data) }),
    stop: (fieldId: string, data?: { reason?: string }) =>
      request<any>(`/fields/${fieldId}/irrigation/stop`, { method: 'POST', body: JSON.stringify(data || {}) }),
    updateSettings: (fieldId: string, settings: any) =>
      request<any>(`/fields/${fieldId}/irrigation/settings`, { method: 'PATCH', body: JSON.stringify(settings) }),
    listEvents: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<{ events: any[] }>(`/irrigation/events${qs}`);
    },
  },

  // Alerts
  alerts: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<{ alerts: any[]; counts: any[] }>(`/alerts${qs}`);
    },
    get: (id: string) => request<{ alert: any }>(`/alerts/${id}`),
    acknowledge: (id: string) => request<{ alert: any }>(`/alerts/${id}/acknowledge`, { method: 'PATCH' }),
    resolve: (id: string, note?: string) =>
      request<{ alert: any }>(`/alerts/${id}/resolve`, { method: 'PATCH', body: JSON.stringify({ note }) }),
  },

  // Analytics
  analytics: {
    overview: () => request<any>('/analytics/overview'),
    irrigation: () => request<any>('/analytics/irrigation'),
    sensors: () => request<any>('/analytics/sensors'),
    exportCsvUrl: (type: 'readings' | 'irrigation' | 'alerts', fieldId?: string) => {
      const params = new URLSearchParams({ type });
      if (fieldId) params.append('fieldId', fieldId);
      return `${API_BASE}/analytics/export/csv?${params.toString()}`;
    },
  },

  // Admin
  admin: {
    users: () => request<{ users: any[] }>('/admin/users'),
    updateUserRole: (id: string, role: string) =>
      request<{ user: any }>(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
    deleteUser: (id: string) => request<any>(`/admin/users/${id}`, { method: 'DELETE' }),
    metrics: () => request<any>('/admin/metrics'),
    auditLogs: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<{ logs: any[] }>(`/admin/audit-logs${qs}`);
    },
    simulator: () => request<{ simulator: any }>('/admin/simulator'),
    controlSimulator: (data: { action?: string; intervalSeconds?: number }) =>
      request<any>('/admin/simulator/control', { method: 'POST', body: JSON.stringify(data) }),
  },
};
