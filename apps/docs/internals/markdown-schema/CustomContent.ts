import { resolveSharedDataPath } from '../../components/SharedData.utils'
import customContentRaw from '../../lib/custom-content/custom-content.json'

const customContent = customContentRaw as Record<string, unknown>

export const CustomContent = ({
  props,
  children,
}: {
  props: Record<string, unknown>
  children: string
}): string => {
  const value = customContent[String(props.data ?? '')]
  if (value === undefined) return ''

  const path = children.trim()
  if (!path) return typeof value === 'string' ? value : JSON.stringify(value)

  const resolved = resolveSharedDataPath(value, path)
  return resolved != null ? String(resolved) : ''
}
