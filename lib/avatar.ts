/**
 * Avatar URLs and multiavatar generation for new users.
 * Preset avatars: public/images/avatars/chef-1.svg … chef-12.svg.
 * User-generated multiavatar: public/uploads/avatars/{userId}.svg.
 */

import { mkdir, writeFile, access } from "fs/promises";
import path from "path";
import multiavatar from "@multiavatar/multiavatar";

const CHEF_COUNT = 12;
const AVATAR_BASE = "/images/avatars";
const UPLOADS_AVATARS_DIR = "public/uploads/avatars";

/** Pre-created chef avatar paths (1-based index). */
export const CHEF_AVATAR_URLS: string[] = Array.from(
  { length: CHEF_COUNT },
  (_, i) => `${AVATAR_BASE}/chef-${i + 1}.svg`
);

/**
 * Returns the path for a user's generated multiavatar file (no fs access).
 */
function getMultiavatarPath(userId: string): string {
  return `/uploads/avatars/${userId}.svg`;
}

/**
 * Server-only: ensures the user's multiavatar file exists (creates it if not),
 * then returns the public URL path.
 */
export async function getOrCreateMultiavatarUrl(userId: string): Promise<string> {
  const urlPath = getMultiavatarPath(userId);
  const absolutePath = path.join(process.cwd(), UPLOADS_AVATARS_DIR, `${userId}.svg`);

  try {
    await access(absolutePath);
    return urlPath;
  } catch {
    // File does not exist; generate and write
  }

  const svg = multiavatar(userId);
  await mkdir(path.join(process.cwd(), UPLOADS_AVATARS_DIR), { recursive: true });
  await writeFile(absolutePath, svg, "utf-8");
  return urlPath;
}
