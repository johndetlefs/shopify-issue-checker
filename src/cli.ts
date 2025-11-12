/**
 * CLI entrypoint for Shopify A11y Sales Audit
 *
 * Parses command-line arguments (client name and URL) and invokes the runner.
 * Falls back to interactive prompts if arguments are missing.
 */

import * as readline from "readline";
import { runAudit } from "./runner";
import { logger } from "./core/logger";

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log("╔════════════════════════════════════════════════╗");
  console.log("║  Shopify Accessibility & Usability Audit Tool  ║");
  console.log("║  Sales Pitch Pack Generator                    ║");
  console.log("╚════════════════════════════════════════════════╝\n");

  let clientName = process.argv[2];
  let baseUrl = process.argv[3];

  // Interactive prompts if args not provided
  if (!clientName) {
    clientName = await prompt('Client name (e.g., "Acme Gifts"): ');
  }

  if (!baseUrl) {
    baseUrl = await prompt(
      'Shopify store URL (e.g., "https://example.myshopify.com"): '
    );
  }

  // Validate inputs
  if (!clientName || !baseUrl) {
    logger.error("Client name and URL are required");
    process.exit(1);
  }

  // Normalize URL
  try {
    const url = new URL(baseUrl);
    baseUrl = url.origin; // Ensure we have just the origin
  } catch (error) {
    logger.error("Invalid URL provided", error);
    process.exit(1);
  }

  logger.info("Starting audit", { clientName, baseUrl });

  try {
    const pitchPackPath = await runAudit(clientName, baseUrl);

    console.log("\n✅ Audit Complete!");
    console.log(`📁 Pitch pack generated at: ${pitchPackPath}`);
    console.log("\nNext steps:");
    console.log("1. Review the summary.md file");
    console.log("2. Customize the email.md draft");
    console.log("3. Review individual issues in the /issues folder");
  } catch (error) {
    logger.error("Audit failed", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
