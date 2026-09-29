const base = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase não configurado na Vercel.");
  return { url: url.replace(/\/$/, ""), key };
};

export function requireAccess(req) {
  const expected = process.env.APP_ACCESS_KEY;
  if (!expected) return true;
  return req.headers["x-junior-key"] === expected;
}

export async function db(path, options = {}) {
  const { url, key } = base();
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  const res = await fetch(`${url}/rest/v1/${path}`, { ...options, headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

export function noStore(res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
}
