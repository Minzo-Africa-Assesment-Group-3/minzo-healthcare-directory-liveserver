export function normalizeDirectoryName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function createDirectorySlug(value: string): string {
  const slug = normalizeDirectoryName(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) throw new Error("Directory names must contain at least one letter or number.");

  return slug.slice(0, 120);
}
