import { useMemo } from 'react'
import { useSnapshot } from 'valtio'

import type { ConnectMode } from './Connect.types'
import { hasWarehouseTables, warehouseDemoStore } from '@/components/interfaces/Database/Warehouse/warehouseDemoStore'
import { useIsFeatureEnabled } from '@/hooks/misc/useIsFeatureEnabled'

export function useAvailableConnectModes(): ConnectMode[] {
  const {
    projectConnectionShowAppFrameworks: showAppFrameworks,
    projectConnectionShowMobileFrameworks: showMobileFrameworks,
    projectConnectionShowOrms: showOrms,
  } = useIsFeatureEnabled([
    'project_connection:show_app_frameworks',
    'project_connection:show_mobile_frameworks',
    'project_connection:show_orms',
  ])

  useSnapshot(warehouseDemoStore)
  const showCatalog = hasWarehouseTables()

  return useMemo(() => {
    const allModes: { id: ConnectMode; enabled: boolean }[] = [
      { id: 'framework', enabled: showAppFrameworks || showMobileFrameworks },
      { id: 'server', enabled: true },
      { id: 'direct', enabled: true },
      { id: 'orm', enabled: showOrms },
      { id: 'mcp', enabled: true },
      { id: 'catalog', enabled: showCatalog },
    ]
    return allModes.filter((m) => m.enabled).map((m) => m.id)
  }, [showAppFrameworks, showMobileFrameworks, showOrms, showCatalog])
}
