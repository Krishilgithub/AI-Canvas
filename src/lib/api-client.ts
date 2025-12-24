import { createClient } from '@/lib/supabase/client';

export const API_BASE = 'http://localhost:4000/api/v1/automation';

async function getHeaders() {
   const supabase = createClient();
   const { data: { session } } = await supabase.auth.getSession();
   
   const headers: HeadersInit = {
      'Content-Type': 'application/json',
   };

   if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
   }

   return headers;
}

export async function fetcher(url: string) {
   const headers = await getHeaders();
   const res = await fetch(`${API_BASE}${url}`, { headers });
   
   if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      console.error(`[API Fetcher Error] ${url}:`, error);
      throw new Error(error.error || 'API Error');
   }
   return res.json();
}

export async function poster(url: string, body: any = {}) {
   const headers = await getHeaders();
   const res = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
   });
   
   if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      console.error(`[API Poster Error] ${url}:`, error);
      throw new Error(error.error || 'API Error');
   }
   return res.json();
}

export async function puter(url: string, body: any = {}) {
   const headers = await getHeaders();
   const res = await fetch(`${API_BASE}${url}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
   });
   
   if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'API Error');
   }
   return res.json();
}

export async function remover(url: string) {
   const headers = await getHeaders();
   const res = await fetch(`${API_BASE}${url}`, {
      method: 'DELETE',
      headers,
   });
   
   if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'API Error');
   }
   return res.json();
}
