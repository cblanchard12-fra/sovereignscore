import { createClient } from "@supabase/supabase-js";

// Les variables sont injectées par Vercel au build (Settings > Environment Variables).
// Si elles sont absentes (ex. prévisualisation sans config), l'app fonctionne
// en mode prototype : les résultats s'affichent, rien n'est enregistré.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;
