/** Supabase may return a many-to-one embed as an object or a one-item array. */
export function embedded<T extends object>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}
