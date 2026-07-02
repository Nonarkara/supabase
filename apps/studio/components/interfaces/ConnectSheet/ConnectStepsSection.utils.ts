import type { ConnectMode } from './Connect.types'

export const DATA_API_DEPENDENT_CONNECT_MODES: ConnectMode[] = ['framework', 'server', 'mcp']

export function isDataApiDependentConnectMode(mode: ConnectMode): boolean {
  return DATA_API_DEPENDENT_CONNECT_MODES.includes(mode)
}

export function shouldShowDataApiDisabledNotice({
  mode,
  isDataApiEnabled,
  isPending,
}: {
  mode: ConnectMode
  isDataApiEnabled: boolean
  isPending: boolean
}): boolean {
  if (isPending) return false
  return isDataApiDependentConnectMode(mode) && !isDataApiEnabled
}

export function shouldShowDataApiConfigLoading({
  mode,
  isPending,
}: {
  mode: ConnectMode
  isPending: boolean
}): boolean {
  return isPending && isDataApiDependentConnectMode(mode)
}
