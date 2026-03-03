import { plainToHtml, sanitizeHtml } from "@/lib/html-utils";

export function getInitialHtml(content: string, imageUrls: string[]): string {
  if (imageUrls.length > 0) return sanitizeHtml(plainToHtml(content, imageUrls));
  if (/<[a-z][\s\S]*>/i.test(content)) return sanitizeHtml(content);
  return sanitizeHtml(plainToHtml(content, []));
}
