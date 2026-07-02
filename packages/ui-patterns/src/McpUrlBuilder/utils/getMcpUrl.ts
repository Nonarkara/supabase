import { DEFAULT_MCP_URL_NON_PLATFORM, DEFAULT_MCP_URL_PLATFORM } from '../constants'
import type { McpClient, McpClientConfig } from '../types'

interface GetMcpUrlOptions {
  projectRef?: string
  readonly?: boolean
  features?: string[]
  selectedClient?: McpClient
  isPlatform: boolean
  apiUrl?: string
  /** Overrides the NEXT_PUBLIC_MCP_URL/DEFAULT_MCP_URL_PLATFORM fallback for the hosted MCP server */
  platformUrl?: string
  /** Overrides the DEFAULT_MCP_URL_NON_PLATFORM fallback for the self-hosted MCP server (used when apiUrl is unset) */
  nonPlatformUrl?: string
}

interface GetMcpUrlReturn {
  mcpUrl: string
  clientConfig: McpClientConfig
}

export function getMcpUrl({
  projectRef,
  isPlatform,
  apiUrl,
  platformUrl,
  nonPlatformUrl,
  readonly = false,
  features = [],
  selectedClient,
}: GetMcpUrlOptions): GetMcpUrlReturn {
  // Generate the MCP URL based on current configuration
  const url = new URL(getMcpUrlBase({ isPlatform, apiUrl, platformUrl, nonPlatformUrl }))
  if (projectRef && isPlatform) {
    url.searchParams.set('project_ref', projectRef)
  }
  if (readonly) {
    url.searchParams.set('read_only', 'true')
  }
  if (features.length > 0) {
    url.searchParams.set('features', features.join(','))
  }
  const mcpUrl = url.toString()

  let clientConfig: McpClientConfig = {
    mcpServers: {
      supabase: {
        url: mcpUrl,
      },
    },
  }
  // Apply client-specific transformation if available
  if (selectedClient?.transformConfig) {
    clientConfig = selectedClient.transformConfig(clientConfig)
  }

  return {
    mcpUrl,
    clientConfig,
  }
}

/**
 * Assembles base `/mcp` endpoint URL for the given environment
 */
function getMcpUrlBase({
  isPlatform,
  apiUrl,
  platformUrl,
  nonPlatformUrl,
}: {
  isPlatform: boolean
  apiUrl?: string
  platformUrl?: string
  nonPlatformUrl?: string
}) {
  // Hosted platform uses an explicit override, then environment variable, with fallback
  if (isPlatform) {
    return platformUrl ?? process.env.NEXT_PUBLIC_MCP_URL ?? DEFAULT_MCP_URL_PLATFORM
  }

  // Self-hosted uses API URL, then an explicit override, with fallback
  return apiUrl ? `${apiUrl}/mcp` : (nonPlatformUrl ?? DEFAULT_MCP_URL_NON_PLATFORM)
}
