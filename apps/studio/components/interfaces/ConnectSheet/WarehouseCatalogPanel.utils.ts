export function shouldShowCatalogDisabledNotice({
  catalogEnabled,
  isPending = false,
  isError = false,
}: {
  catalogEnabled: boolean
  isPending?: boolean
  isError?: boolean
}): boolean {
  if (isPending || isError) return false
  return !catalogEnabled
}
