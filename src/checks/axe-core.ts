/**
 * Axe-core accessibility check
 *
 * Runs axe-core automated accessibility tests and returns
 * top violations with WCAG 2.1 AA tags.
 */

import { Check, CheckContext, Issue } from "../types";

export const axeCoreCheck: Check = {
  name: "axe-core",

  async run(context: CheckContext): Promise<Issue[]> {
    // TODO: Inject axe-core into the page
    // TODO: Run axe.run() and filter for wcag2a/aa/21aa tags
    // TODO: Convert violations to Issue[] format
    // TODO: Include WCAG criteria references

    return [];
  },
};
