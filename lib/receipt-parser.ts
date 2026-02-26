/**
 * Parse raw receipt/OCR text into grocery items (name + quantity).
 * Skips totals, headers, and empty lines; extracts optional leading quantity and strips trailing prices.
 */

const SKIP_WORDS = new Set(
  [
    "total",
    "subtotal",
    "tax",
    "vat",
    "date",
    "receipt",
    "thank",
    "you",
    "welcome",
    "cash",
    "card",
    "change",
    "discount",
    "amount",
    "due",
    "paid",
    "balance",
    "store",
    "address",
    "phone",
    "item",
    "price",
    "qty",
    "quantity",
  ].map((s) => s.toLowerCase())
);

function isOnlyNumbersAndPunctuation(line: string): boolean {
  return /^[\d\s.,$€£¥\-]+$/.test(line.trim());
}

function isSkipWord(line: string): boolean {
  const t = line.trim().toLowerCase();
  if (!t) return true;
  const words = t.split(/\s+/);
  if (words.length === 1 && SKIP_WORDS.has(words[0])) return true;
  if (words.length <= 2 && words.every((w) => SKIP_WORDS.has(w))) return true;
  return false;
}

/**
 * Strip only when the trailing token looks like a price: $ amount or decimal (e.g. 2.99).
 * Avoids stripping plain numbers that are part of the name (e.g. "Product 5", "Room 101").
 */
function stripTrailingPrice(line: string): string {
  return line
    .replace(/\s+\$[\d,]+(?:\.\d{1,2})?\s*$/, "") // $5 or $2.99
    .replace(/\s+[\d,]+\.\d{1,2}\s*$/, "") // 2.99 or 10.50 (decimal price)
    .trim();
}

function parseLine(line: string): { name: string; quantity: number } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (isOnlyNumbersAndPunctuation(trimmed)) return null;
  if (isSkipWord(trimmed)) return null;

  const leadingQtyMatch = trimmed.match(/^\s*(\d+(?:\.\d+)?)\s+(.+)$/);
  let name: string;
  let quantity: number;
  if (leadingQtyMatch) {
    const parsed = parseFloat(leadingQtyMatch[1]);
    quantity = Number.isFinite(parsed) ? Math.max(0, parsed) : 1;
    name = leadingQtyMatch[2];
  } else {
    quantity = 1;
    name = trimmed;
  }

  name = stripTrailingPrice(name);
  name = name.replace(/\s+/g, " ").trim();
  if (!name) return null;

  return { name, quantity };
}

export type ReceiptItem = { name: string; quantity: number };

export function parseReceiptText(raw: string): ReceiptItem[] {
  const lines = raw.split(/\r?\n/);
  const merged = new Map<string, { name: string; quantity: number }>();

  for (const line of lines) {
    const parsed = parseLine(line);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += parsed.quantity;
    } else {
      merged.set(key, { name: parsed.name, quantity: parsed.quantity });
    }
  }

  return Array.from(merged.values());
}
