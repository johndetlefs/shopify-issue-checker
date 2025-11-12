/**
 * Pitch pack emission
 *
 * Writes the pitch pack files to disk with all audit findings and recommendations.
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { Issue } from "../types";
import { logger } from "./logger";
import {
  generateSummary,
  generateEmail,
  generateFinding,
  generatePrompt,
} from "./templates";

function kebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function emitPitchPack(
  clientName: string,
  baseUrl: string,
  issues: Issue[]
): string {
  const clientSlug = kebabCase(clientName);
  const packPath = join(process.cwd(), "clients", clientSlug, "pitch-pack");

  try {
    // Create directory structure
    mkdirSync(packPath, { recursive: true });
    logger.info("Created pitch pack directory", { packPath });

    // Write summary.md
    const summaryPath = join(packPath, "summary.md");
    writeFileSync(summaryPath, generateSummary(clientName, issues), "utf-8");
    logger.info("Wrote summary.md");

    // Write email.md
    const emailPath = join(packPath, "email.md");
    writeFileSync(emailPath, generateEmail(clientName, issues), "utf-8");
    logger.info("Wrote email.md");

    // Write score.json
    const scorePath = join(packPath, "score.json");
    writeFileSync(
      scorePath,
      JSON.stringify(
        { clientName, baseUrl, issues, timestamp: new Date() },
        null,
        2
      ),
      "utf-8"
    );
    logger.info("Wrote score.json");

    // Write individual issue folders
    const issuesDir = join(packPath, "issues");
    mkdirSync(issuesDir, { recursive: true });

    issues.forEach((issue, index) => {
      const issueSlug = `${String(index + 1).padStart(2, "0")}-${kebabCase(
        issue.title
      )}`;
      const issueDir = join(issuesDir, issueSlug);
      mkdirSync(issueDir, { recursive: true });

      // Write finding.md
      writeFileSync(
        join(issueDir, "finding.md"),
        generateFinding(issue),
        "utf-8"
      );

      // Write prompt.md
      writeFileSync(
        join(issueDir, "prompt.md"),
        generatePrompt(issue),
        "utf-8"
      );

      // Write raw.json
      if (issue.rawData) {
        writeFileSync(
          join(issueDir, "raw.json"),
          JSON.stringify(issue.rawData, null, 2),
          "utf-8"
        );
      }

      // Copy screenshot if present
      if (issue.screenshot) {
        // Screenshot path is already written by the check, just log it
        logger.info(`Screenshot available: ${issue.screenshot}`);
      }
    });

    logger.info(`Pitch pack emitted successfully for ${clientName}`, {
      issueCount: issues.length,
    });
    return packPath;
  } catch (error) {
    logger.error("Failed to emit pitch pack", error);
    throw error;
  }
}
