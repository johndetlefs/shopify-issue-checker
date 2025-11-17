import fs from "node:fs/promises";
import path from "node:path";
import { chromium, type Browser, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { findMainNavigation } from "../src/core/find-navigation";
import { findFooter } from "../src/core/find-footer";
import { findMobileNav } from "../src/core/find-mobile-nav";

interface NavigationExpectation {
  shouldFind: boolean;
  minLinks?: number;
  maxLinks?: number;
  notes?: string;
}

interface FooterExpectation {
  shouldFind: boolean;
}

interface MobileNavigationExpectation {
  shouldFind: boolean;
  notes?: string;
}

interface AxeCoreExpectation {
  enabled?: boolean;
  tags?: string[];
  maxViolations?: number;
}

interface FixtureDefinition {
  name: string;
  slug: string;
  baseUrl: string;
  desktopHtml: string;
  mobileHtml?: string;
  expectations: {
    navigation?: NavigationExpectation;
    footer?: FooterExpectation;
    "mobile-navigation"?: MobileNavigationExpectation;
    "axe-core"?: AxeCoreExpectation;
    [key: string]: unknown;
  };
}

type ViewportKind = "desktop" | "mobile";

type CheckName = "navigation" | "footer" | "mobile-navigation" | "axe-core";

interface CheckResult {
  fixture: string;
  slug: string;
  check: CheckName;
  viewport: ViewportKind;
  status: "pass" | "fail" | "skip";
  details: string[];
  screenshot?: string;
  artifact?: string;
}

interface CheckContextPayload {
  fixture: FixtureDefinition;
  viewport: ViewportKind;
  runDir: string;
}

interface CheckConfig<TExpectation = unknown> {
  name: CheckName;
  viewports: ViewportKind[];
  handler: (
    page: Page,
    expectation: TExpectation | undefined,
    context: CheckContextPayload
  ) => Promise<CheckResult>;
}

const ROOT = path.resolve(__dirname, "..");
const FIXTURE_MATRIX = path.join(ROOT, "fixtures", "benchmark-matrix.json");
const ARTIFACT_ROOT = path.join(ROOT, "artifacts", "fixture-audit");
const VIEWPORTS: Record<ViewportKind, { width: number; height: number }> = {
  desktop: { width: 1280, height: 840 },
  mobile: { width: 390, height: 844 },
};

async function loadFixtures(): Promise<FixtureDefinition[]> {
  const raw = await fs.readFile(FIXTURE_MATRIX, "utf-8");
  const parsed = JSON.parse(raw) as FixtureDefinition[];
  return parsed;
}

function filterFixtures(
  fixtures: FixtureDefinition[],
  filters: string[]
): FixtureDefinition[] {
  if (!filters.length) return fixtures;

  const normalized = filters.map((filter) => filter.toLowerCase());
  const result = fixtures.filter((fixture) =>
    normalized.some(
      (needle) =>
        fixture.slug.toLowerCase().includes(needle) ||
        fixture.name.toLowerCase().includes(needle)
    )
  );

  if (!result.length) {
    throw new Error(
      `No fixtures matched filters: ${filters.join(", ")}. Check slug/name.`
    );
  }

  return result;
}

async function preparePage(
  browser: Browser,
  htmlPath: string,
  baseUrl: string,
  viewport: ViewportKind
): Promise<Page> {
  const resolvedPath = path.isAbsolute(htmlPath)
    ? htmlPath
    : path.join(ROOT, htmlPath);

  const html = await fs.readFile(resolvedPath, "utf-8");

  const context = await browser.newContext({ viewport: VIEWPORTS[viewport] });
  const page = await context.newPage();
  await page.setContent(html, { waitUntil: "load" });

  return page;
}

async function runNavigationCheck(
  page: Page,
  expectation: NavigationExpectation | undefined,
  _context: CheckContextPayload
): Promise<CheckResult> {
  if (!expectation) {
    return {
      fixture: "",
      slug: "",
      check: "navigation",
      viewport: "desktop",
      status: "skip",
      details: ["No navigation expectation provided"],
    };
  }

  const details: string[] = [];
  const nav = await findMainNavigation(page);

  if (expectation.shouldFind) {
    if (!nav) {
      details.push("Expected navigation to be detected but none was found.");
      return {
        fixture: "",
        slug: "",
        check: "navigation",
        viewport: "desktop",
        status: "fail",
        details,
      };
    }

    const classes = (await nav.getAttribute("class")) ?? "(no classes)";
    details.push(`Detected navigation classes: ${classes}`);

    const linkCount = await nav.locator("a:visible").count();
    details.push(`Link count: ${linkCount}`);

    if (expectation.minLinks && linkCount < expectation.minLinks) {
      details.push(
        `Link count ${linkCount} below minimum ${expectation.minLinks}`
      );
      return {
        fixture: "",
        slug: "",
        check: "navigation",
        viewport: "desktop",
        status: "fail",
        details,
      };
    }

    if (expectation.maxLinks && linkCount > expectation.maxLinks) {
      details.push(
        `Link count ${linkCount} above maximum ${expectation.maxLinks}`
      );
      return {
        fixture: "",
        slug: "",
        check: "navigation",
        viewport: "desktop",
        status: "fail",
        details,
      };
    }

    if (expectation.notes) {
      details.push(`Notes: ${expectation.notes}`);
    }

    return {
      fixture: "",
      slug: "",
      check: "navigation",
      viewport: "desktop",
      status: "pass",
      details,
    };
  }

  if (nav) {
    const classes = (await nav.getAttribute("class")) ?? "(no classes)";
    details.push(`Navigation was detected unexpectedly (classes: ${classes}).`);
    return {
      fixture: "",
      slug: "",
      check: "navigation",
      viewport: "desktop",
      status: "fail",
      details,
    };
  }

  details.push("Navigation correctly not detected.");
  return {
    fixture: "",
    slug: "",
    check: "navigation",
    viewport: "desktop",
    status: "pass",
    details,
  };
}

async function runFooterCheck(
  page: Page,
  expectation: FooterExpectation | undefined,
  _context: CheckContextPayload
): Promise<CheckResult> {
  if (!expectation) {
    return {
      fixture: "",
      slug: "",
      check: "footer",
      viewport: "desktop",
      status: "skip",
      details: ["No footer expectation provided"],
    };
  }

  const footer = await findFooter(page);
  const details: string[] = [];

  if (expectation.shouldFind) {
    if (!footer) {
      details.push("Expected footer detection but nothing matched.");
      return {
        fixture: "",
        slug: "",
        check: "footer",
        viewport: "desktop",
        status: "fail",
        details,
      };
    }

    const tagName = await footer.evaluate((el) => el.tagName.toLowerCase());
    details.push(`Detected footer tag: <${tagName}>`);
    const classNames = (await footer.getAttribute("class")) ?? "(no classes)";
    details.push(`Classes: ${classNames}`);

    return {
      fixture: "",
      slug: "",
      check: "footer",
      viewport: "desktop",
      status: "pass",
      details,
    };
  }

  if (footer) {
    const tagName = await footer.evaluate((el) => el.tagName.toLowerCase());
    details.push(
      `Footer detected unexpectedly (tag <${tagName}>). Expectation said it should be absent.`
    );
    return {
      fixture: "",
      slug: "",
      check: "footer",
      viewport: "desktop",
      status: "fail",
      details,
    };
  }

  details.push("Footer correctly not detected.");
  return {
    fixture: "",
    slug: "",
    check: "footer",
    viewport: "desktop",
    status: "pass",
    details,
  };
}

async function runMobileNavigationCheck(
  page: Page,
  expectation: MobileNavigationExpectation | undefined,
  _context: CheckContextPayload
): Promise<CheckResult> {
  if (!expectation) {
    return {
      fixture: "",
      slug: "",
      check: "mobile-navigation",
      viewport: "mobile",
      status: "skip",
      details: ["No mobile navigation expectation provided"],
    };
  }

  const details: string[] = [];
  const mobileNav = await findMobileNav(page);

  if (expectation.shouldFind) {
    if (!mobileNav) {
      details.push(
        "Expected mobile navigation detection but finder returned null."
      );
      return {
        fixture: "",
        slug: "",
        check: "mobile-navigation",
        viewport: "mobile",
        status: "fail",
        details,
      };
    }

    details.push(`Pattern: ${mobileNav.pattern}`);
    details.push(`Score: ${mobileNav.score}`);
    if (mobileNav.reason?.length) {
      details.push(`Reason: ${mobileNav.reason.join("; ")}`);
    }

    const triggerClasses =
      (await mobileNav.trigger.getAttribute("class")) ?? "(no classes)";
    details.push(`Trigger classes: ${triggerClasses}`);

    const drawerClasses =
      (await mobileNav.drawer.getAttribute("class")) ?? "(no classes)";
    details.push(`Drawer classes: ${drawerClasses}`);

    const linkCount = await mobileNav.drawer.locator("a:visible").count();
    details.push(`Mobile nav link count: ${linkCount}`);

    if (expectation.notes) {
      details.push(`Notes: ${expectation.notes}`);
    }

    return {
      fixture: "",
      slug: "",
      check: "mobile-navigation",
      viewport: "mobile",
      status: "pass",
      details,
    };
  }

  if (mobileNav) {
    details.push(
      `Mobile navigation detected unexpectedly (pattern: ${mobileNav.pattern}).`
    );
    return {
      fixture: "",
      slug: "",
      check: "mobile-navigation",
      viewport: "mobile",
      status: "fail",
      details,
    };
  }

  details.push("Mobile navigation correctly not detected.");
  return {
    fixture: "",
    slug: "",
    check: "mobile-navigation",
    viewport: "mobile",
    status: "pass",
    details,
  };
}

async function runAxeCoreCheck(
  page: Page,
  expectation: AxeCoreExpectation | undefined,
  context: CheckContextPayload
): Promise<CheckResult> {
  if (expectation && expectation.enabled === false) {
    return {
      fixture: "",
      slug: "",
      check: "axe-core",
      viewport: context.viewport,
      status: "skip",
      details: ["Axe-core snapshot disabled via expectation"],
    };
  }

  const details: string[] = [];
  const tags = expectation?.tags?.length
    ? expectation.tags
    : ["wcag2a", "wcag2aa", "wcag21aa"];

  const builder = new AxeBuilder({ page });
  if (tags.length) {
    builder.withTags(tags);
  }

  const axeResults = await builder.analyze();
  const violationCount = axeResults.violations.length;
  const incompleteCount = axeResults.incomplete.length;

  details.push(`Violations: ${violationCount}`);
  details.push(`Incomplete: ${incompleteCount}`);
  details.push(`Tags: ${tags.join(", ")}`);

  const axeDir = path.join(context.runDir, "axe", context.fixture.slug);
  await fs.mkdir(axeDir, { recursive: true });
  const axeFilePath = path.join(axeDir, `${context.viewport}.json`);
  await fs.writeFile(axeFilePath, JSON.stringify(axeResults, null, 2), "utf-8");

  const relativePath = path.relative(ROOT, axeFilePath);
  details.push(`Snapshot: ${relativePath}`);

  const maxViolations = expectation?.maxViolations;
  const status: "pass" | "fail" =
    typeof maxViolations === "number" && violationCount > maxViolations
      ? "fail"
      : "pass";

  if (status === "fail" && typeof maxViolations === "number") {
    details.push(
      `Violation count ${violationCount} exceeds max ${maxViolations}`
    );
  }

  return {
    fixture: "",
    slug: "",
    check: "axe-core",
    viewport: context.viewport,
    status,
    details,
    artifact: relativePath,
  };
}

function decorateResult(
  result: CheckResult,
  fixture: FixtureDefinition,
  viewport: ViewportKind
): CheckResult {
  return {
    ...result,
    fixture: fixture.name,
    slug: fixture.slug,
    viewport,
  };
}

async function captureFailureScreenshot(
  page: Page,
  fixture: FixtureDefinition,
  check: CheckName,
  viewport: ViewportKind,
  runDir: string
): Promise<string | undefined> {
  const fileName = `${fixture.slug}-${check}-${viewport}.png`;
  const screenshotPath = path.join(runDir, fileName);
  try {
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      animations: "disabled",
      timeout: 10000,
    });
    return path.relative(ROOT, screenshotPath);
  } catch (error) {
    console.warn(
      `⚠️  Failed to capture screenshot for ${
        fixture.slug
      } ${check} ${viewport}: ${error instanceof Error ? error.message : error}`
    );
    return undefined;
  }
}

async function writeArtifacts(
  runDir: string,
  results: CheckResult[]
): Promise<void> {
  const totals = results.reduce(
    (acc, result) => {
      acc[result.status]++;
      return acc;
    },
    { pass: 0, fail: 0, skip: 0 } as Record<CheckResult["status"], number>
  );

  const payload = {
    generatedAt: new Date().toISOString(),
    totals,
    results,
  };

  await fs.writeFile(
    path.join(runDir, "results.json"),
    JSON.stringify(payload, null, 2),
    "utf-8"
  );

  const mdLines: string[] = [
    `# Fixture Audit Summary`,
    "",
    `Generated: ${payload.generatedAt}`,
    "",
    `Totals: ✅ ${totals.pass}  ⚠️ ${totals.fail}  ↪️ ${totals.skip}`,
    "",
    "| Fixture | Check | Viewport | Status |",
    "| --- | --- | --- | --- |",
  ];

  for (const result of results) {
    mdLines.push(
      `| ${result.fixture} | ${result.check} | ${
        result.viewport
      } | ${result.status.toUpperCase()} |`
    );
  }

  await fs.writeFile(
    path.join(runDir, "summary.md"),
    mdLines.join("\n"),
    "utf-8"
  );
}

async function main() {
  const fixtures = await loadFixtures();

  const filters: string[] = [];
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--slug" && args[i + 1]) {
      filters.push(args[i + 1]);
      i++;
      continue;
    }
    if (arg.startsWith("--slug=")) {
      filters.push(arg.split("=")[1]);
      continue;
    }
  }

  const fixturesToRun = filterFixtures(fixtures, filters);

  const runId = new Date().toISOString().replace(/[:]/g, "-");
  const runDir = path.join(ARTIFACT_ROOT, runId);
  await fs.mkdir(runDir, { recursive: true });

  console.log(
    `Running fixture audit for ${fixturesToRun.length} fixture(s)...`
  );
  if (filters.length) {
    console.log(`Filters: ${filters.join(", ")}`);
  }

  const browser = await chromium.launch({ headless: true });
  const results: CheckResult[] = [];
  const checks: CheckConfig[] = [
    {
      name: "navigation",
      viewports: ["desktop"],
      handler: (page, expectation, context) =>
        runNavigationCheck(
          page,
          expectation as NavigationExpectation | undefined,
          context
        ),
    },
    {
      name: "footer",
      viewports: ["desktop", "mobile"],
      handler: (page, expectation, context) =>
        runFooterCheck(
          page,
          expectation as FooterExpectation | undefined,
          context
        ),
    },
    {
      name: "mobile-navigation",
      viewports: ["mobile"],
      handler: (page, expectation, context) =>
        runMobileNavigationCheck(
          page,
          expectation as MobileNavigationExpectation | undefined,
          context
        ),
    },
    {
      name: "axe-core",
      viewports: ["desktop", "mobile"],
      handler: (page, expectation, context) =>
        runAxeCoreCheck(
          page,
          expectation as AxeCoreExpectation | undefined,
          context
        ),
    },
  ];

  try {
    for (const fixture of fixturesToRun) {
      console.log(`\n=== ${fixture.name} (${fixture.slug}) ===`);
      const pageCache = new Map<ViewportKind, Page>();

      const getPage = async (viewport: ViewportKind): Promise<Page | null> => {
        const htmlPath =
          viewport === "desktop" ? fixture.desktopHtml : fixture.mobileHtml;
        if (!htmlPath) {
          return null;
        }

        if (!pageCache.has(viewport)) {
          const page = await preparePage(
            browser,
            htmlPath,
            fixture.baseUrl,
            viewport
          );
          pageCache.set(viewport, page);
        }

        return pageCache.get(viewport)!;
      };

      for (const check of checks) {
        const expectation = fixture.expectations[check.name];
        for (const viewport of check.viewports) {
          const page = await getPage(viewport);
          if (!page) {
            console.log(
              ` - ${check.name} [${viewport}]: SKIP (no ${viewport} HTML snapshot)`
            );
            results.push({
              fixture: fixture.name,
              slug: fixture.slug,
              check: check.name,
              viewport,
              status: "skip",
              details: [`No ${viewport} HTML snapshot configured`],
            });
            continue;
          }

          const rawResult = await check.handler(page, expectation as any, {
            fixture,
            viewport,
            runDir,
          });
          const decorated = decorateResult(rawResult, fixture, viewport);
          if (decorated.status === "fail") {
            decorated.screenshot = await captureFailureScreenshot(
              page,
              fixture,
              check.name,
              viewport,
              runDir
            );
          }
          results.push(decorated);
          console.log(
            ` - ${check.name} [${viewport}]: ${decorated.status.toUpperCase()}`
          );
        }
      }

      for (const page of pageCache.values()) {
        await page.context().close();
      }
    }
  } finally {
    await browser.close();
  }

  await writeArtifacts(runDir, results);

  const failures = results.filter((result) => result.status === "fail");
  if (failures.length) {
    console.error(
      `\n${failures.length} check(s) failed. See ${path.relative(
        ROOT,
        runDir
      )} for artifacts.`
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `\nAll checks passed. Artifacts available at ${path.relative(ROOT, runDir)}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
