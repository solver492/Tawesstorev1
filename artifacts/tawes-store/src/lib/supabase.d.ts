export type SupabaseProductRow = Record<string, unknown>;
export type SupabaseCategoryRow = string | Record<string, unknown>;

export const hasSupabaseConfig: boolean;
export function getProducts(): Promise<SupabaseProductRow[]>;
export function getCategories(): Promise<SupabaseCategoryRow[]>;