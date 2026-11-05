import { appendFileSync } from "node:fs";

// Uploads carry no prompt to tag, so tests record their ids here and the
// global teardown deletes them. Generations are found by their "[e2e]" prompt.
export const ASSET_LOG = ".e2e-assets.log";

export function trackAsset(id: string) {
  appendFileSync(ASSET_LOG, `${id}\n`);
}
