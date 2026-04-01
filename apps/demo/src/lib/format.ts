/** Shared formatting utilities for Carbon Design components. */

type StatusColor = "blue" | "warm-gray" | "gray";
type RoleColor = "blue" | "teal" | "gray";

export function statusColor(status: string | undefined): StatusColor {
  if (status === "published") return "blue";
  if (status === "archived") return "warm-gray";
  return "gray";
}

export function roleColor(role: string | undefined): RoleColor {
  if (role === "staff") return "blue";
  if (role === "contributor") return "teal";
  return "gray";
}

export function formatDate(
  dateStr: string | null | undefined,
  month: "short" | "long" = "short",
): string {
  if (!dateStr) return "---";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month,
    day: "numeric",
  });
}

export function formatPrice(price: number): string {
  return price === 0 ? "Free" : `$${price}`;
}

export function truncate(text: string | null | undefined, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "...";
}
