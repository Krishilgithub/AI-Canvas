import { createClient } from "@/lib/supabase/client";

const isProd = process.env.NODE_ENV === "production";
export const API_BASE = isProd 
  ? "https://ai-canvass.vercel.app/api/v1/automation" 
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1/automation");

async function getHeaders() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  return headers;
}

export async function getAuthToken() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export async function fetcher(url: string, options: RequestInit = {}) {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> || {}) },
  });

  if (!res.ok) {
    let error: Record<string, string> = {};
    try {
      error = await res.json();
    } catch (e) {
      error = { error: await res.text() };
    }
    console.error(`[API Fetcher Error] ${url}:`, error);
    throw new Error(error.error || "API Error");
  }
  return res.json();
}

export async function poster(url: string, body: any = {}) {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}${url}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let error: any = {};
    try {
      error = await res.json();
    } catch (e) {
      const text = await res.text().catch(() => "");
      error = { error: text || res.statusText };
    }
    console.error(`[API Poster Error] ${url}:`, JSON.stringify(error) === '{}' ? 'Empty Error Object' : error);
    throw new Error(error.error || "API Error");
  }
  return res.json();
}

export async function puter(url: string, body: any = {}) {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}${url}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || "API Error");
  }
  return res.json();
}

export async function remover(url: string) {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}${url}`, {
    method: "DELETE",
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || "API Error");
  }
  return res.json();
}
