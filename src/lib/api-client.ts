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
  if (url.startsWith("/api/v1/")) {
    return API_BASE.replace("/api/v1/automation", "") + url;
  }
  return `${API_BASE}${url}`;
}

export async function fetcher(url: string, options: RequestInit = {}) {
  const headers = await getHeaders();
  const res = await fetch(getFullUrl(url), {
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
    console.error(`[API Fetcher Error] ${url}:`, error);
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
    console.error(`[API Poster Error] ${url}:`, JSON.stringify(error) === '{}' ? 'Empty Error Object' : error);
    throw new Error(error.error || "API Error");
  }
  
  const text = await res.text().catch(() => "");
  try { return text ? JSON.parse(text) : {}; } catch(e) { return text; }
}

export async function puter(url: string, body: any = {}) {
  const headers = await getHeaders();
  const res = await fetch(getFullUrl(url), {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
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

export async function remover(url: string) {
  const headers = await getHeaders();
  const res = await fetch(getFullUrl(url), {
    method: "DELETE",
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
