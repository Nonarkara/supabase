import { describe, expect, test } from 'vitest'

import type { ConnectMode } from './Connect.types'
import {
  DATA_API_DEPENDENT_CONNECT_MODES,
  isDataApiDependentConnectMode,
  shouldShowDataApiConfigLoading,
  shouldShowDataApiDisabledNotice,
} from './ConnectStepsSection.utils'

const ALL_MODES: ConnectMode[] = ['framework', 'direct', 'orm', 'mcp', 'server']

describe('DATA_API_DEPENDENT_CONNECT_MODES', () => {
  test('includes framework, server, and mcp only', () => {
    expect(DATA_API_DEPENDENT_CONNECT_MODES).toEqual(['framework', 'server', 'mcp'])
  })
})

describe('isDataApiDependentConnectMode', () => {
  test.each([
    ['framework', true],
    ['server', true],
    ['mcp', true],
    ['direct', false],
    ['orm', false],
  ] as const)('returns %s for %s mode', (mode, expected) => {
    expect(isDataApiDependentConnectMode(mode)).toBe(expected)
  })
})

describe('shouldShowDataApiDisabledNotice', () => {
  test.each(ALL_MODES)('returns false while pending for %s mode', (mode) => {
    expect(
      shouldShowDataApiDisabledNotice({
        mode,
        isDataApiEnabled: false,
        isPending: true,
      })
    ).toBe(false)
  })

  test.each(['framework', 'server', 'mcp'] as const)(
    'returns true when %s mode has Data API disabled',
    (mode) => {
      expect(
        shouldShowDataApiDisabledNotice({
          mode,
          isDataApiEnabled: false,
          isPending: false,
        })
      ).toBe(true)
    }
  )

  test.each(['framework', 'server', 'mcp'] as const)(
    'returns false when %s mode has Data API enabled',
    (mode) => {
      expect(
        shouldShowDataApiDisabledNotice({
          mode,
          isDataApiEnabled: true,
          isPending: false,
        })
      ).toBe(false)
    }
  )

  test.each(['direct', 'orm'] as const)(
    'returns false when %s mode has Data API disabled',
    (mode) => {
      expect(
        shouldShowDataApiDisabledNotice({
          mode,
          isDataApiEnabled: false,
          isPending: false,
        })
      ).toBe(false)
    }
  )
})

describe('shouldShowDataApiConfigLoading', () => {
  test.each(['framework', 'server', 'mcp'] as const)(
    'returns true while pending for %s mode',
    (mode) => {
      expect(
        shouldShowDataApiConfigLoading({
          mode,
          isPending: true,
        })
      ).toBe(true)
    }
  )

  test.each(['direct', 'orm'] as const)('returns false while pending for %s mode', (mode) => {
    expect(
      shouldShowDataApiConfigLoading({
        mode,
        isPending: true,
      })
    ).toBe(false)
  })

  test.each(ALL_MODES)('returns false when not pending for %s mode', (mode) => {
    expect(
      shouldShowDataApiConfigLoading({
        mode,
        isPending: false,
      })
    ).toBe(false)
  })
})
