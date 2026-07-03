import type { ContentListingGroup } from '~/lib/content-listings.schema'

import {
  authGetStarted,
  authHooksAvailable,
  authNextSteps,
  authOauthServerSetup,
  authPricing,
  authServerSideFrameworks,
} from './auth.data'
import { databaseGetStarted, databaseNextSteps, databaseServerlessDrivers } from './database.data'
import {
  functionsExamplesAiMedia,
  functionsExamplesMessaging,
  functionsExamplesOperations,
  functionsExamplesSupabase,
  functionsExamplesWebhooksPayments,
  functionsGetStarted,
} from './functions.data'
import { gettingStartedGetStarted } from './getting-started.data'
import { realtimeExamples, realtimeGetStarted, realtimeResources } from './realtime.data'
import { storageExamples, storageGetStarted, storageResources } from './storage.data'

const ALL_GROUPS: readonly ContentListingGroup[] = [
  authGetStarted,
  authPricing,
  authNextSteps,
  authServerSideFrameworks,
  authHooksAvailable,
  authOauthServerSetup,
  databaseGetStarted,
  databaseNextSteps,
  databaseServerlessDrivers,
  functionsGetStarted,
  functionsExamplesSupabase,
  functionsExamplesWebhooksPayments,
  functionsExamplesAiMedia,
  functionsExamplesMessaging,
  functionsExamplesOperations,
  gettingStartedGetStarted,
  realtimeGetStarted,
  realtimeExamples,
  realtimeResources,
  storageGetStarted,
  storageExamples,
  storageResources,
]

export const CONTENT_LISTINGS: Readonly<Record<string, ContentListingGroup>> = Object.fromEntries(
  ALL_GROUPS.map((group) => [group.id, group])
)
