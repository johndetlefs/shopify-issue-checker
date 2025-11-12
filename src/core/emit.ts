/**
 * Pitch pack emitter
 *
 * Writes the complete pitch pack to disk:
 * summary, email, score.json, and per-issue folders with assets.
 */

import { Issue } from "../types";
import * as fs from "fs/promises";
import * as path from "path";

export async function emitPitchPack(
  clientName: string,
  issues: Issue[],
  outputDir: string
): Promise<string> {
  // TODO: Create /clients/{client-kebab}/pitch-pack/ directory
  // TODO: Write summary.md using templates
  // TODO: Write email.md using templates
  // TODO: Write score.json with machine-readable issue list
  // TODO: For each issue, create /issues/{NN}-{issue-slug}/ folder
  // TODO: Write finding.md, prompt.md, screenshot.png (if exists), raw.json
  // TODO: Return the pitch pack path

  const kebabName = clientName.toLowerCase().replace(/\s+/g, "-");
  const pitchPackPath = path.join(
    outputDir,
    "clients",
    kebabName,
    "pitch-pack"
  );

  console.log(`Would create pitch pack at: ${pitchPackPath}`);

  return pitchPackPath;
}
