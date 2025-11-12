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

    // Create individual issue folders first and update screenshot/video filenames
    const issuesDir = join(packPath, "issues");
    mkdirSync(issuesDir, { recursive: true });

    issues.forEach((issue, index) => {
      const issueSlug = `${String(index + 1).padStart(2, "0")}-${kebabCase(
        issue.title
      )}`;
      const issueDir = join(issuesDir, issueSlug);
      mkdirSync(issueDir, { recursive: true });

      // Process screenshot/video BEFORE generating any templates
      // This ensures all filenames are updated for use in summary, email, etc.
      if (issue.rawData?.screenshotBuffer) {
        // Generate unique screenshot name based on issue ID
        // Extract the descriptive part (remove timestamp suffix like -1234567890)
        const issueIdBase = issue.id.replace(/-\d+$/, "");
        const screenshotName = `${issueIdBase}.png`;
        const screenshotPath = join(issueDir, screenshotName);
        writeFileSync(screenshotPath, issue.rawData.screenshotBuffer);
        logger.info(`Screenshot saved for issue ${index + 1}`);
        // Update the issue's screenshot field to reference the correct filename
        issue.screenshot = screenshotName;
        // Remove buffer from rawData before saving JSON
        delete issue.rawData.screenshotBuffer;
      }

      // Save video from buffer if present in rawData
      if (issue.rawData?.videoBuffer) {
        // Generate unique video name based on issue ID
        const issueIdBase = issue.id.replace(/-\d+$/, "");
        const videoName = `${issueIdBase}.webm`;
        const videoPath = join(issueDir, videoName);
        writeFileSync(videoPath, issue.rawData.videoBuffer);
        logger.info(`Video saved for issue ${index + 1}`);
        // Update the issue's video field to reference the correct filename
        issue.video = videoName;
        // Remove buffer from rawData before saving JSON
        delete issue.rawData.videoBuffer;
      }
    });

    // NOW write summary.md (after all screenshots are processed and filenames updated)
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

    // Write finding.md and prompt.md for each issue (screenshots already processed above)
    issues.forEach((issue, index) => {
      const issueSlug = `${String(index + 1).padStart(2, "0")}-${kebabCase(
        issue.title
      )}`;
      const issueDir = join(issuesDir, issueSlug);

      // Write finding.md (after screenshot/video processing so filenames are correct)
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

      // Write code snippet if present
      if (issue.codeSnippet) {
        writeFileSync(
          join(issueDir, "code-snippet.html"),
          issue.codeSnippet,
          "utf-8"
        );
      }

      // Re-write raw.json after removing buffers
      if (issue.rawData && Object.keys(issue.rawData).length > 0) {
        writeFileSync(
          join(issueDir, "raw.json"),
          JSON.stringify(issue.rawData, null, 2),
          "utf-8"
        );
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
