import customContentRaw from '../../lib/custom-content/custom-content.json'

// Mirrors the config built in ~/components/McpCiConfigBlock.tsx
const mcpServers = (customContentRaw as Record<string, { local?: string; remote?: string }>)[
  'mcp:servers'
]

export const McpCiConfigBlock = (): string => {
  const config = {
    mcpServers: {
      supabase: {
        type: 'http',
        url: `${mcpServers?.remote}?project_ref=\${SUPABASE_PROJECT_REF}`,
        headers: {
          Authorization: 'Bearer ${SUPABASE_ACCESS_TOKEN}',
        },
      },
    },
  }

  return '```json\n' + JSON.stringify(config, null, 2) + '\n```'
}
