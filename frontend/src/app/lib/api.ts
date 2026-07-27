'use client';

export type ProjectStatus = 'cloning' | 'ready' | 'error' | 'indexing';

export type Project = {
  id?: number;
  uuid: string;
  name: string;
  status: ProjectStatus;
  statusDetail?: string | null;
  repoUrl?: string;
  framework?: string | null;
  lastSyncedAt?: string | null;
  branch?: string;
};

export type Agent = {
  uuid: string;
  name: string;
  persona?: string | null;
  provider?: string | null;
  model?: string | null;
  temperature?: number;
  isActive?: boolean;
};

export type Client = {
  uuid: string;
  name: string;
  company?: string | null;
  email?: string | null;
  whatsappNumber: string;
  status: 'active' | 'suspended' | 'archived';
  activeProjectId?: number | null;
  requestBalance?: number;
  requestsUsed?: number;
  projects?: Project[];
  agent?: Agent | null;
};

export type MemoryItem = {
  id: number;
  key: string;
  value: string | null;
  type: 'preference' | 'knowledge' | 'context' | 'system';
  updatedAt: string;
};

const TOKEN_KEY = 'noonight_token';

export const auth = {
  get: () => (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T = any>(path: string, options?: RequestInit): Promise<T> {
  const token = auth.get();
  const res = await fetch(`/api/v1/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg = data?.message
      ? Array.isArray(data.message)
        ? data.message.join(', ')
        : data.message
      : `Request failed (${res.status})`;
    throw new ApiError(res.status, msg);
  }
  return data as T;
}
