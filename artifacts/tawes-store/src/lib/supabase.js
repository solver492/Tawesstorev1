const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://nfoefhwmgjatbqyibclp.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_MqgDM0Iyhrr4RCw1xEOr0g_2mg62du7";
export const hasSupabaseConfig = Boolean(SUPABASE_KEY);
async function readTable(table) { if (!SUPABASE_KEY) return []; try { const response = await fetch(SUPABASE_URL + "/rest/v1/" + table + "?select=*&limit=100", { headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY } }); if (!response.ok) return []; const data = await response.json(); return Array.isArray(data) ? data : []; } catch (error) { return []; } }
export const getProducts = () => readTable("products");
export const getCategories = () => readTable("categories");
