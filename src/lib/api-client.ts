export const API_BASE = 'http://localhost:4000/api/v1/automation';

export async function fetcher(url: string) {
   const res = await fetch(`${API_BASE}${url}`);
   if (!res.ok) throw new Error('API Error');
   return res.json();
}

export async function poster(url: string, body: any) {
   const res = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
   });
   if (!res.ok) throw new Error('API Error');
   return res.json();
}
