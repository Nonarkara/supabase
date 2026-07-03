import { runAxeCheck } from '../utils/axe-helpers.js'
import { test } from '../utils/test.js'
import { toUrl } from '../utils/to-url.js'

// axe-core regression gate across core authenticated surfaces (FE-3781). Studio has a
// large amount of pre-existing a11y debt, so this doesn't require pages to be
// violation-free — it only fails when a checkpoint's violation count for a given rule
// grows past its file under e2e/studio/features/accessibility-baselines/, or a new rule
// fires that isn't in the baseline at all. After intentionally fixing (or knowingly
// adding) violations, regenerate the baseline with:
//   UPDATE_A11Y_BASELINE=1 pnpm run e2e:a11y-baseline
//
// This file only covers root-level routes at rest. Dialogs, side panels, and other
// interactive surfaces are checked inline in their owning spec via the same
// `runAxeCheck` helper, right where those tests already have them open.

const ROUTES: { name: string; path: (ref: string) => `/${string}` }[] = [
  { name: 'Project Home', path: (ref) => `/project/${ref}` },
  { name: 'Table Editor', path: (ref) => `/project/${ref}/editor?schema=public` },
  { name: 'SQL Editor', path: (ref) => `/project/${ref}/sql/new` },
  { name: 'Database Tables', path: (ref) => `/project/${ref}/database/tables?schema=public` },
  {
    name: 'Database Schema Visualizer',
    path: (ref) => `/project/${ref}/database/schemas?schema=public`,
  },
  { name: 'Auth Users', path: (ref) => `/project/${ref}/auth/users` },
  { name: 'Storage Buckets', path: (ref) => `/project/${ref}/storage/buckets` },
  { name: 'Cron Jobs', path: (ref) => `/project/${ref}/integrations/cron/jobs` },
  { name: 'Database Webhooks', path: (ref) => `/project/${ref}/integrations/webhooks/webhooks` },
  { name: 'Realtime Inspector', path: (ref) => `/project/${ref}/realtime/inspector` },
  { name: 'Logs Explorer', path: (ref) => `/project/${ref}/logs/explorer` },
]

test.describe('Accessibility (axe)', () => {
  for (const route of ROUTES) {
    test(`captures axe violations for ${route.name}`, async ({ page, ref }, testInfo) => {
      await page.goto(toUrl(route.path(ref)))
      // Pages vary too much for one shared "ready" selector; networkidle is an
      // acceptable stand-in here since this is a best-effort capture run, not
      // a flakiness-sensitive assertion.
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})

      await runAxeCheck(page, testInfo, route.name)
    })
  }
})
