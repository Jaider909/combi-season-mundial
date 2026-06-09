import { supabaseConfig } from "../config/supabase-config.js";

let clientPromise = null;

export function isSupabaseConfigured() {
  return Boolean(supabaseConfig.url && supabaseConfig.anonKey);
}

export async function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!clientPromise) {
    clientPromise = import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm").then(
      ({ createClient }) => createClient(supabaseConfig.url, supabaseConfig.anonKey)
    );
  }

  return clientPromise;
}
