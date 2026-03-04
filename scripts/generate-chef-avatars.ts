/**
 * Generates 12 multiavatar SVGs with fixed seeds (chef-1 … chef-12)
 * and writes them to public/images/avatars/chef-1.svg … chef-12.svg.
 * Run: npm run generate-avatars
 */

import { mkdir, writeFile } from "fs/promises";
import path from "path";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const multiavatar = require("@multiavatar/multiavatar");

const CHEF_COUNT = 12;
const OUT_DIR = path.join(process.cwd(), "public", "images", "avatars");

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  for (let i = 1; i <= CHEF_COUNT; i++) {
    const seed = `chef-${i}`;
    const svg = multiavatar(seed);
    const filePath = path.join(OUT_DIR, `chef-${i}.svg`);
    await writeFile(filePath, svg, "utf-8");
    console.log(`Wrote ${filePath}`);
  }

  console.log(`Done. Generated ${CHEF_COUNT} chef avatars.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
