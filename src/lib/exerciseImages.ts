// Auto-loaded exercise illustrations. Falls back to undefined if missing.
const modules = import.meta.glob("@/assets/exercises/*.png", { eager: true, query: "?url", import: "default" }) as Record<string, string>;

const map: Record<string, string> = {};
for (const [path, url] of Object.entries(modules)) {
  const name = path.split("/").pop()!.replace(".png", "");
  map[name] = url;
}

export function exerciseImage(name: string): string | undefined {
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[()]/g, "").replace(/\//g, "-");
  return map[slug];
}
