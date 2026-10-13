import { createClient } from "@supabase/supabase-js";

// Credenciais vêm exclusivamente de variáveis de ambiente (Vercel / .env local).
// Nunca colocar valores reais neste arquivo nem no repositório.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigurado = Boolean(url && key);

export const supabase = supabaseConfigurado
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;
