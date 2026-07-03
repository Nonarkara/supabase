import { useParams } from 'common'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'ui'
import { Admonition } from 'ui-patterns/admonition'
import { ShimmeringLoader } from 'ui-patterns/ShimmeringLoader'

import { getHasInstalledObject } from '@/components/layouts/IntegrationsLayout/Integrations.utils'
import {
  InterstitialAccountRow,
  InterstitialLayout,
  LogoPair,
  PartnerLogo,
  SupabaseLogo,
} from '@/components/layouts/InterstitialLayout'
import { useIntegrationsQuery } from '@/data/integrations/integrations-query'
import { useVercelIntegrationCreateMutation } from '@/data/integrations/vercel-integration-create-mutation'
import { useOrganizationsQuery } from '@/data/organizations/organizations-query'
import { withAuth } from '@/hooks/misc/withAuth'
import { BASE_PATH } from '@/lib/constants'
import { buildStudioPageTitle } from '@/lib/page-title'
import { useProfileNameAndPicture } from '@/lib/profile'
import { useIntegrationInstallationSnapshot } from '@/state/integration-installation'
import type { NextPageWithLayout, Organization } from '@/types'

const PAGE_TITLE = buildStudioPageTitle({
  section: 'Install Vercel Integration',
  brand: 'Supabase',
})

const MOCK_ORGANIZATIONS = [
  { name: 'Acme Inc', slug: 'acme-inc', billing_email: 'billing@acme.test' },
  { name: 'Globex', slug: 'globex', billing_email: 'billing@globex.test' },
  { name: 'Installed Example', slug: 'installed-example', billing_email: 'billing@example.test' },
] as Organization[]

const MOCK_INSTALLED_ORGANIZATION_SLUG = MOCK_ORGANIZATIONS[0].slug

const MOCK_STATES = [
  'ready',
  'loading',
  'installing',
  'installed',
  'already-installed',
  'no-organizations',
  'missing-params',
  'error',
] as const

type MockState = (typeof MOCK_STATES)[number]

function getMockState(value: string | string[] | undefined): MockState | undefined {
  const mock = Array.isArray(value) ? value[0] : value
  return MOCK_STATES.includes(mock as MockState) ? (mock as MockState) : undefined
}

function getErrorMessage(error: unknown): string | undefined {
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

/**
 * Variations of the Vercel integration flow.
 * They require different UI and logic.
 *
 * Deploy Button - the flow that starts from the Deploy Button - https://vercel.com/docs/integrations#deploy-button
 * Marketplace - the flow that starts from the Marketplace - https://vercel.com/integrations
 *
 */
export type VercelIntegrationFlow = 'deploy-button' | 'marketing'

const VercelIntegration: NextPageWithLayout = () => {
  const router = useRouter()
  const { code, configurationId, teamId, source } = useParams()
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const { username, primaryEmail, avatarUrl } = useProfileNameAndPicture()

  const snapshot = useIntegrationInstallationSnapshot()
  const mockState = getMockState(router.query.mock)
  const isMockState = mockState !== undefined
  const isMissingParamsMockState = mockState === 'missing-params'
  const codeValue = isMissingParamsMockState ? undefined : isMockState ? 'mock-vercel-code' : code
  const configurationIdValue = isMissingParamsMockState
    ? undefined
    : isMockState
      ? 'mock-vercel-configuration-id'
      : configurationId
  const sourceValue = isMissingParamsMockState ? undefined : isMockState ? 'marketplace' : source
  const displayName = primaryEmail ?? username ?? ''

  /**
   * Fetch the list of organization based integration installations for Vercel.
   *
   * Array of integrations installed on all
   */
  const {
    data: integrationData,
    isPending: isLoadingIntegrationsQuery,
    isError: isIntegrationsError,
    error: integrationsError,
  } = useIntegrationsQuery({ enabled: !isMockState })

  const {
    data: organizationsQueryData,
    isPending: isLoadingOrganizationsQuery,
    isSuccess: isOrganizationsDataSuccess,
    isError: isOrganizationsError,
    error: organizationsError,
  } = useOrganizationsQuery({ enabled: !isMockState })

  const mockOrganizationsData =
    mockState === 'loading' || mockState === 'error'
      ? undefined
      : mockState === 'no-organizations'
        ? []
        : MOCK_ORGANIZATIONS
  const organizationsData = isMockState ? mockOrganizationsData : organizationsQueryData
  const isLoadingOrganizations = isMockState ? mockState === 'loading' : isLoadingOrganizationsQuery
  const isLoadingIntegrations = isMockState ? mockState === 'loading' : isLoadingIntegrationsQuery

  useEffect(() => {
    if (organizationsData !== undefined && (integrationData !== undefined || isMockState)) {
      const firstOrg = organizationsData[0]

      if (firstOrg && selectedOrg === null) {
        setSelectedOrg(firstOrg)
      }
    }
  }, [organizationsData, integrationData, isMockState, selectedOrg])

  /**
   * Organizations with extra `installationInstalled` attribute
   *
   * Used to show label/badge and allow/disallow installing
   *
   */
  const installed = useMemo(
    () =>
      isMockState
        ? mockState === 'already-installed'
          ? { [MOCK_INSTALLED_ORGANIZATION_SLUG]: true }
          : {}
        : integrationData && organizationsData
          ? getHasInstalledObject({
              integrationName: 'Vercel',
              integrationData,
              organizationsData,
              installationId: configurationIdValue,
            })
          : {},
    [configurationIdValue, integrationData, isMockState, mockState, organizationsData]
  )

  /**
   * Handle the correct route change based on whether the vercel integration
   * is following the 'marketplace/external' flow or 'deploy button' flow.
   * See:
   * - https://vercel.com/docs/integrations/create-integration/submit-integration#query-parameters-for-marketplace
   * - https://vercel.com/docs/integrations/create-integration/submit-integration#query-parameters-for-external-flow
   * - https://vercel.com/docs/integrations/create-integration/submit-integration#query-parameters-for-deploy-button
   */
  function handleRouteChange() {
    const orgSlug = selectedOrg?.slug

    switch (sourceValue) {
      case 'deploy-button': {
        router.push({
          pathname: `/integrations/vercel/${orgSlug}/deploy-button/new-project`,
          query: { ...router.query, organizationSlug: orgSlug },
        })
        break
      }
      case 'marketplace':
      case 'external': {
        router.push({
          pathname: `/integrations/vercel/${orgSlug}/marketplace/choose-project`,
          query: { ...router.query, organizationSlug: orgSlug },
        })
        break
      }
      default:
        toast.error(
          `Unsupported Vercel installation source: ${sourceValue}. Please contact support if this error persists.`
        )
    }
  }

  const { mutate, isPending: isLoadingVercelIntegrationCreateMutation } =
    useVercelIntegrationCreateMutation({
      onMutate() {
        snapshot.setLoading(true)
      },
      onSuccess() {
        handleRouteChange()
        snapshot.setLoading(false)
      },
      onError(error) {
        snapshot.setLoading(false)
        toast.error(`Creating Vercel integration failed: ${error.message}`)
      },
    })

  function onInstall() {
    const orgSlug = selectedOrg?.slug
    const installCode = codeValue
    const installConfigurationId = configurationIdValue
    const installSource = sourceValue

    const isIntegrationInstalled = orgSlug ? installed[orgSlug] : false

    if (!orgSlug) {
      return toast.error('Please select an organization')
    }

    if (!installCode) {
      return toast.error('Vercel code missing')
    }

    if (!installConfigurationId) {
      return toast.error('Vercel Configuration ID missing')
    }

    if (!installSource) {
      return toast.error('Vercel Configuration source missing')
    }

    if (isMockState) {
      return toast.success('Mock Vercel installation completed')
    }

    /**
     * Only install if integration hasn't already been installed
     */
    if (!isIntegrationInstalled) {
      mutate({
        code: installCode,
        configurationId: installConfigurationId,
        orgSlug,
        metadata: {},
        source: installSource,
        teamId: teamId,
      })
    } else {
      handleRouteChange()
    }
  }

  const dataLoading =
    isLoadingVercelIntegrationCreateMutation ||
    isLoadingOrganizations ||
    isLoadingIntegrations ||
    mockState === 'installing'

  const noOrganizations = useMemo(() => {
    const organizationsLoaded = isMockState || isOrganizationsDataSuccess
    return organizationsLoaded && organizationsData?.length === 0 ? true : false
  }, [isMockState, isOrganizationsDataSuccess, organizationsData])

  const alreadyInstalled = useMemo(() => {
    return selectedOrg &&
      installed[selectedOrg.slug] &&
      sourceValue === 'marketplace' &&
      !dataLoading
      ? true
      : false
  }, [dataLoading, installed, selectedOrg, sourceValue])

  const missingParams = [
    !codeValue ? 'code' : undefined,
    !configurationIdValue ? 'configurationId' : undefined,
    !sourceValue ? 'source' : undefined,
  ].filter(Boolean) as string[]

  const isError =
    mockState === 'error' || (!isMockState && (isOrganizationsError || isIntegrationsError))
  const errorMessage =
    mockState === 'error'
      ? 'Unable to retrieve Vercel installation details.'
      : (getErrorMessage(organizationsError) ?? getErrorMessage(integrationsError))
  const showLoadingState =
    mockState === 'loading' || (!isMockState && (isLoadingOrganizations || isLoadingIntegrations))

  const disableInstallationForm =
    dataLoading ||
    // disables installation button if integration is already installed and it is Marketplace flow
    alreadyInstalled ||
    noOrganizations ||
    !selectedOrg ||
    missingParams.length > 0 ||
    isError

  const isLoading = useMemo(() => {
    return (
      isLoadingVercelIntegrationCreateMutation ||
      isLoadingOrganizations ||
      isLoadingIntegrations ||
      mockState === 'installing'
    )
  }, [
    isLoadingVercelIntegrationCreateMutation,
    isLoadingIntegrations,
    isLoadingOrganizations,
    mockState,
  ])

  return (
    <>
      <Head>
        <title>{PAGE_TITLE}</title>
      </Head>

      <InterstitialLayout
        logo={
          <LogoPair
            left={
              <PartnerLogo
                src={`${BASE_PATH}/img/icons/vercel-icon.svg`}
                alt="Vercel"
                className="bg-surface-75"
                imageClassName="size-7 object-contain dark:invert"
              />
            }
            right={<SupabaseLogo />}
          />
        }
        title="Install Vercel Integration"
        description="Choose the Supabase organization Vercel can connect to"
        footer={
          <p className="text-xs text-foreground-lighter">
            You can remove this integration at any time from Vercel or the Supabase dashboard.
          </p>
        }
      >
        <div className="px-6 pb-6">
          {showLoadingState ? (
            <InstallationLoadingState />
          ) : isError ? (
            <InstallationErrorState errorMessage={errorMessage} />
          ) : mockState === 'installed' ? (
            <InstallationSuccessState />
          ) : (
            <div className="flex flex-col gap-5">
              <InterstitialAccountRow avatarUrl={avatarUrl} displayName={displayName} />

              <OrganizationSelect
                organizations={organizationsData ?? []}
                selectedOrg={selectedOrg}
                disabled={noOrganizations || isLoading}
                installed={installed}
                onSelectedOrgChange={setSelectedOrg}
              />

              {missingParams.length > 0 && (
                <Admonition
                  type="warning"
                  title="Missing Vercel installation details"
                  description={`Retry from Vercel. The installation URL is missing: ${missingParams.join(
                    ', '
                  )}.`}
                />
              )}

              {alreadyInstalled && (
                <Admonition
                  type="warning"
                  title="Vercel integration is already installed"
                  description="Choose another organization to install this marketplace integration."
                />
              )}

              {noOrganizations && (
                <Admonition
                  type="warning"
                  title="No Supabase organizations found"
                  description={
                    <>
                      Create a Supabase organization before installing the Vercel integration. You
                      can create a new organization{' '}
                      <Link href="https://supabase.com/dashboard/new" target="_blank">
                        here
                      </Link>
                      .
                    </>
                  }
                />
              )}

              <div className="flex flex-col gap-2">
                <Button
                  block
                  variant="primary"
                  disabled={disableInstallationForm}
                  loading={dataLoading}
                  onClick={onInstall}
                >
                  Install integration
                </Button>
              </div>
            </div>
          )}
        </div>
      </InterstitialLayout>
    </>
  )
}

const InstallationLoadingState = () => (
  <div className="flex flex-col gap-5">
    <Card className="shadow-none">
      <CardContent className="flex items-center gap-3 border-none px-4 py-3">
        <ShimmeringLoader className="size-8 flex-shrink-0 rounded-full py-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <ShimmeringLoader className="h-3 w-20 py-0" />
          <ShimmeringLoader className="h-4 w-40 max-w-full py-0" />
        </div>
      </CardContent>
    </Card>
    <section className="space-y-2" aria-label="Organization loading">
      <ShimmeringLoader className="h-3 w-24 py-0" />
      <ShimmeringLoader className="h-[34px] w-full rounded-md py-0" />
    </section>
    <ShimmeringLoader className="h-10 w-full rounded-md py-0" />
  </div>
)

const InstallationErrorState = ({ errorMessage }: { errorMessage?: string }) => (
  <div className="flex flex-col gap-3">
    <Admonition
      type="warning"
      title="Unable to load installation"
      description={
        <>
          Retry the installation request from Vercel.
          {errorMessage && (
            <span className="mt-1 block text-foreground-lighter">Error: {errorMessage}</span>
          )}
        </>
      }
    />
    <Button variant="default" block asChild>
      <Link href="/">Back to dashboard</Link>
    </Button>
  </div>
)

const InstallationSuccessState = () => (
  <div className="flex flex-col gap-4">
    <Admonition
      type="success"
      title="Vercel integration installed"
      description="You can continue setting up project connections for this integration."
    />
    <p className="text-center text-xs text-foreground-lighter text-balance">
      In the live flow, Supabase redirects to the next Vercel setup step automatically.
    </p>
  </div>
)

interface OrganizationSelectProps {
  organizations: Organization[]
  selectedOrg: Organization | null
  disabled?: boolean
  installed: Record<string, boolean>
  onSelectedOrgChange: (organization: Organization) => void
}

function OrganizationSelect({
  organizations,
  selectedOrg,
  disabled,
  installed,
  onSelectedOrgChange,
}: OrganizationSelectProps) {
  return (
    <section className="space-y-2" aria-label="Organization">
      <p className="text-xs font-medium uppercase tracking-wider text-foreground-light">
        Organization
      </p>
      <Select
        value={selectedOrg?.slug ?? ''}
        disabled={disabled}
        onValueChange={(slug) => {
          const org = organizations.find((org) => org.slug === slug)
          if (org) onSelectedOrgChange(org)
        }}
      >
        <SelectTrigger size="small" aria-label="Supabase organization to install Vercel into">
          <SelectValue placeholder="Choose an organization" />
        </SelectTrigger>
        <SelectContent>
          {organizations.map((org) => (
            <SelectItem key={org.slug} value={org.slug} className="text-xs">
              <div className="flex items-center gap-2">
                <span className="truncate">{org.name}</span>
                {installed[org.slug] && <Badge className="flex-none!">Installed</Badge>}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </section>
  )
}

export default withAuth(VercelIntegration)
