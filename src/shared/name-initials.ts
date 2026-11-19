export function getNameInitials(name: string, limit = 1): string {
  const initials = name
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, limit)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase();

  return initials || "?";
}
