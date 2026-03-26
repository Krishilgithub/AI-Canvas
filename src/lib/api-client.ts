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

function getFullUrl(url: string) {
  const isProd = process.env.NODE_ENV === "production";
  const BACKEND_URL = isProd 
    ? "https://ai-canvass.vercel.app" 
    : (process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1/automation", "") || "http://localhost:4000");

  if (url.startsWith("http")) return url;
  if (url.startsWith("/api/")) return `${BACKEND_URL}${url}`;
  
  if (
    url.startsWith("/user/") || 
    url.startsWith("/keys/") || 
    url.startsWith("/analytics/") || 
    url.startsWith("/automation/")
  ) {
    return `${BACKEND_URL}/api/v1${url}`;
  }

  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${BACKEND_URL}/api/v1/automation${cleanUrl}`;
}

export async function fetcher(url: string, options: RequestInit = {}) {
  const headers = await getHeaders();
  const res = await fetch(getFullUrl(url), {
    cache: "no-store",
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> || {}) },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let error: any = {};
    try {
      error = text ? JSON.parse(text) : {};
    } catch (e) {
      error = { error: text || res.statusText };
    }
    throw new Error(error.error || "API Error");
  }
  
  // Also fix the success case reading if needed, though it's fine 
  // since it's the only read on the success path.
  const text = await res.text().catch(() => "");
  try {
     return text ? JSON.parse(text) : {};
  } catch(e) {
     return text;
  }
}

export async function poster(url: string, body: any = {}) {
  const headers = await getHeaders();
  const res = await fetch(getFullUrl(url), {
    method: "POST",
    cache: "no-store",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let error: any = {};
    try {
      error = text ? JSON.parse(text) : {};
    } catch (e) {
      error = { error: text || res.statusText };
    }
    throw new Error(error.error || "API Error");
  }
  
  const text = await res.text().catch(() => "");
  try { return text ? JSON.parse(text) : {}; } catch(e) { return text; }
}

export async function puter(url: string, body: any = {}) {
  const headers = await getHeaders();
  const res = await fetch(getFullUrl(url), {
    method: "PUT",
    cache: "no-store",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let error: any = {};
    try {
      error = text ? JSON.parse(text) : {};
    } catch (e) {
      error = { error: text || res.statusText };
    }
    throw new Error(error.error || "API Error");
  }
  
  const text = await res.text().catch(() => "");
  try { return text ? JSON.parse(text) : {}; } catch(e) { return text; }
}

export async function deleter(url: string, body: any = {}) {
  const headers = await getHeaders();
  const res = await fetch(getFullUrl(url), {
    method: "DELETE",
    cache: "no-store",
    headers,
    body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let error: any = {};
    try {
      error = text ? JSON.parse(text) : {};
    } catch (e) {
      error = { error: text || res.statusText };
    }
    throw new Error(error.error || "API Error");
  }

  const text = await res.text().catch(() => "");
  try { return text ? JSON.parse(text) : {}; } catch(e) { return text; }
}

export async function remover(url: string) {
  const headers = await getHeaders();
  const res = await fetch(getFullUrl(url), {
    method: "DELETE",
    cache: "no-store",
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let error: any = {};
    try { error = text ? JSON.parse(text) : {}; } catch(e) { error = { error: text || res.statusText }; }
    throw new Error(error.error || "API Error");
  }
  const text = await res.text().catch(() => "");
  try { return text ? JSON.parse(text) : {}; } catch(e) { return text; }
}
