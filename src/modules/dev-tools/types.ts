import type { ComponentType } from 'react'

export interface DevScenarioActionProps {
  onAnnounce: (message: string) => void
}

export type DevScenarioSlotId = string

export interface DevScenarioDefinition {
  id: string
  name: string
  description: string
  keywords?: readonly string[]
  slot?: DevScenarioSlotId
  action?: ComponentType<DevScenarioActionProps>
}
