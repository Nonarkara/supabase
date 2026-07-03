export function getErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error) return error.message
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message
  }
  return undefined
}

type BuildVercelInstallRouteQueryArgs = {
  source?: string
  organizationSlug?: string
  configurationId?: string
  currentProjectId?: string
  externalId?: string
  next?: string
}

function removeUndefinedValues(query: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(query).filter((entry): entry is [string, string] => entry[1] !== undefined)
  )
}

export function buildVercelInstallRouteQuery({
  source,
  organizationSlug,
  configurationId,
  currentProjectId,
  externalId,
  next,
}: BuildVercelInstallRouteQueryArgs) {
  switch (source) {
    case 'deploy-button':
      return removeUndefinedValues({
        organizationSlug,
        currentProjectId,
        externalId,
        next,
      })
    case 'marketplace':
    case 'external':
      return removeUndefinedValues({
        organizationSlug,
        configurationId,
        next,
      })
    default:
      return removeUndefinedValues({ organizationSlug })
  }
}
