/**
 * CLI entrypoint for Shopify A11y Sales Audit
 *
 * Parses command-line arguments (client name and URL) and invokes the runner.
 * Falls back to interactive prompts if arguments are missing.
 */

import { runAudit } from "./runner";

async function main() {
  // TODO: Parse arguments or prompt for client name and URL
  // TODO: Invoke runAudit with client name and base URL
  // TODO: Log the pitch-pack path and total issues found

  console.log("Shopify A11y Sales Audit - CLI not yet implemented");
  process.exit(1);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
