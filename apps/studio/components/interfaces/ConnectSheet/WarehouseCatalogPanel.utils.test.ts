import { describe, expect, test } from 'vitest'

import { shouldShowCatalogDisabledNotice } from './WarehouseCatalogPanel.utils'

describe('shouldShowCatalogDisabledNotice', () => {
  test('returns true when catalog is disabled and state is known', () => {
    expect(
      shouldShowCatalogDisabledNotice({
        catalogEnabled: false,
      })
    ).toBe(true)
  })

  test('returns false when catalog is enabled', () => {
    expect(
      shouldShowCatalogDisabledNotice({
        catalogEnabled: true,
      })
    ).toBe(false)
  })

  test('returns false while catalog status is pending', () => {
    expect(
      shouldShowCatalogDisabledNotice({
        catalogEnabled: false,
        isPending: true,
      })
    ).toBe(false)
  })

  test('returns false when catalog status query errored', () => {
    expect(
      shouldShowCatalogDisabledNotice({
        catalogEnabled: false,
        isError: true,
      })
    ).toBe(false)
  })
})
