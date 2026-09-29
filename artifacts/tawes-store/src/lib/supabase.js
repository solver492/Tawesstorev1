const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://nfoefhwmgjatbqyibclp.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
export const hasSupabaseConfig = Boolean(SUPABASE_KEY);

async function readTable(table, params = "") {
  if (!SUPABASE_KEY) return [];
  try {
    const query = `?select=*&limit=100${params}`;
    const response = await fetch(SUPABASE_URL + "/rest/v1/" + table + query, {
      headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

export const getProducts = () =>
  readTable(
    "products_with_category",
    "&is_published_to_website=eq.true&active=eq.true&order=created_at.desc",
  );

export const getCategories = () =>
  readTable("categories", "&is_active=eq.true&order=display_order.asc");

// Un produit peut avoir plusieurs images (carousel) et une video Vimeo :
// ces Elements vivent dans product_media, pas dans products.
export const getProductMedia = (productIds) =>
  productIds.length
    ? readTable(
        "product_media",
        `&product_id=in.(${productIds.join(",")})&order=sort_order.asc&limit=1000`,
      )
    : Promise.resolve([]);

/** Regroupe les medias par produit : { [product_id]: media[] }. */
export function groupMediaByProduct(rows) {
  const out = {};
  for (const row of rows) {
    const key = String(row.product_id);
    (out[key] = out[key] || []).push(row);
  }
  for (const list of Object.values(out)) {
    list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }
  return out;
}
