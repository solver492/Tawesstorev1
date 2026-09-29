export type SupabaseProductRow = Record<string, unknown>;
export type SupabaseCategoryRow = string | Record<string, unknown>;
export type SupabaseMediaRow = {
  product_id: number | string;
  media_url: string;
  media_type: string;
  sort_order?: number | null;
};

export const hasSupabaseConfig: boolean;
export function getProducts(): Promise<SupabaseProductRow[]>;
export function getCategories(): Promise<SupabaseCategoryRow[]>;
export function getProductMedia(productIds: string[]): Promise<SupabaseMediaRow[]>;
export function groupMediaByProduct(
  rows: SupabaseMediaRow[],
): Record<string, SupabaseMediaRow[]>;