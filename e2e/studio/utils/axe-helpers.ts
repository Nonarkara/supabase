import fs from 'node:fs'
import path from 'node:path'
import { AxeBuilder } from '@axe-core/playwright'
import { expect } from '@playwright/test'
import type { Page, TestInfo } from '@playwright/test'
import type { Result } from 'axe-core'
import { createHtmlReport } from 'axe-html-reporter'

// WCAG 2.1 A/AA is the baseline most vendor VPATs are scored against.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

const IMPACTS = ['critical', 'serious', 'moderate', 'minor'] as const

const BASELINE_DIR = path.resolve(import.meta.dirname, '../features/accessibility-baselines')

function routeSlug(route: string) {
  return route
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function baselinePath(route: string) {
  return path.join(BASELINE_DIR, `${routeSlug(route)}.json`)
}

export interface AxeScanResult {
  route: string
  url: string
  // Kept as axe-core's native shape (not remapped) so nothing gets lost: each
  // violation's nodes carry `html` (the actual offending markup) and
  // `failureSummary` (axe's human-readable "what's wrong and how to fix it").
  violations: Result[]
}

export async function scanForA11yViolations(page: Page, route: string): Promise<AxeScanResult> {
  // setLegacyMode(): axe's default analyze() opens a fresh blank tab via
  // context.newPage() to assemble cross-frame results, which throws
  // "Please use browser.newContext()" on some Studio surfaces (e.g. the SQL
  // editor with its Monaco frames). Studio is a single-origin app whose dialogs
  // are React portals/sheets, not cross-origin iframes, so legacy in-page
  // assembly gives equivalent coverage without the extra tab. (Deprecated in
  // axe-core 5.x — revisit if we upgrade past 4.x.)
  const { violations } = await new AxeBuilder({ page })
    .setLegacyMode(true)
    .withTags(WCAG_TAGS)
    .analyze()
  return { route, url: page.url(), violations }
}

export async function attachA11yReport(testInfo: TestInfo, page: Page, result: AxeScanResult) {
  const slug = routeSlug(result.route)
  const totalNodes = result.violations.reduce((sum, v) => sum + v.nodes.length, 0)
  const summary = IMPACTS.map(
    (impact) => `${impact}: ${result.violations.filter((v) => v.impact === impact).length}`
  ).join(', ')

  console.log(
    `[a11y] ${result.route} (${result.url}) -> ${totalNodes} affected node(s) across ${result.violations.length} rule(s) [${summary}]`
  )

  await testInfo.attach(`axe-${slug}.json`, {
    body: JSON.stringify(result, null, 2),
    contentType: 'application/json',
  })

  const html = createHtmlReport({
    results: { violations: result.violations, url: result.url },
    options: { doNotCreateReportFile: true, projectKey: result.route },
  })
  await testInfo.attach(`axe-${slug}.html`, { body: html, contentType: 'text/html' })

  // Best-effort screenshot of one representative offending element per rule, so a
  // reviewer can see where the issue is without cross-referencing selectors by hand.
  for (const violation of result.violations) {
    const node = violation.nodes[0]
    if (!node || node.target.length !== 1) continue

    try {
      const locator = page.locator(node.target[0] as string).first()
      await locator.scrollIntoViewIfNeeded({ timeout: 2_000 })
      const screenshot = await locator.screenshot({ timeout: 2_000 })
      await testInfo.attach(`axe-${slug}-${violation.id}.png`, {
        body: screenshot,
        contentType: 'image/png',
      })
    } catch {
      // Element may be off-screen, inside a frame, or already gone — skip it.
    }
  }
}

// Baseline maps ruleId -> max known-affected-node-count for a route. A PR can only
// shrink these numbers (fixing violations) without failing; growing one, or adding a
// rule id that isn't in the baseline at all, means the PR made a11y worse.
export type AxeBaseline = Record<string, number>

export function readBaseline(route: string): AxeBaseline {
  try {
    return JSON.parse(fs.readFileSync(baselinePath(route), 'utf-8'))
  } catch {
    return {}
  }
}

export function writeBaseline(route: string, counts: AxeBaseline) {
  fs.mkdirSync(BASELINE_DIR, { recursive: true })
  fs.writeFileSync(baselinePath(route), `${JSON.stringify(counts, null, 2)}\n`)
}

export function countNodesByRule(result: AxeScanResult): AxeBaseline {
  const counts: AxeBaseline = {}
  for (const violation of result.violations) {
    counts[violation.id] = violation.nodes.length
  }
  return counts
}

export function diffAgainstBaseline(counts: AxeBaseline, baseline: AxeBaseline): string[] {
  const regressions: string[] = []
  for (const [ruleId, count] of Object.entries(counts)) {
    const allowed = baseline[ruleId] ?? 0
    if (count > allowed) {
      regressions.push(`${ruleId}: ${count} affected node(s), baseline allows ${allowed}`)
    }
  }
  return regressions
}

// Single entry point for a checkpoint: scan whatever's on screen right now (e.g. a
// dialog/panel a test just opened), attach the report, and gate on regressions vs its
// baseline. `checkpoint` must be a unique, descriptive name — it's slugified into the
// baseline filename and attachment names, so e.g. "Table Editor - New Table Panel", not
// just "New Table Panel" if another file also has a generically-named panel.
export async function runAxeCheck(page: Page, testInfo: TestInfo, checkpoint: string) {
  const result = await scanForA11yViolations(page, checkpoint)
  await attachA11yReport(testInfo, page, result)

  const counts = countNodesByRule(result)

  if (process.env.UPDATE_A11Y_BASELINE) {
    writeBaseline(checkpoint, counts)
    return
  }

  const regressions = diffAgainstBaseline(counts, readBaseline(checkpoint))
  expect(regressions, `New or worsened axe violations at checkpoint: ${checkpoint}`).toEqual([])
}
