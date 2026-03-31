import type {
  IntegrationConnector,
  IntegrationWebhookEvent,
} from '../../state/integrationDemoStore'
import {
  loadIntegrationConnectors,
  loadIntegrationWebhookLog,
  simulateConnectorSync as simulateLocalSync,
  appendWebhookDemo as appendLocalWebhook,
} from '../../state/integrationDemoStore'
import {
  liveListIntegrationConnectors,
  liveSyncIntegrationConnector,
  liveListIntegrationWebhooks,
  livePostIntegrationWebhook,
} from '../../api/live/client'

function frmsLiveApiEnabled(): boolean {
  return import.meta.env.VITE_USE_LIVE_API === 'true'
}

export async function getConnectors(): Promise<IntegrationConnector[]> {
  if (frmsLiveApiEnabled()) {
    try {
      return await liveListIntegrationConnectors()
    } catch (e) {
      console.error('Failed to load connectors from live API', e)
      return []
    }
  }
  return loadIntegrationConnectors()
}

export async function syncConnector(id: string): Promise<void> {
  if (frmsLiveApiEnabled()) {
    await liveSyncIntegrationConnector(id)
  } else {
    simulateLocalSync(id)
  }
}

export async function getWebhooks(): Promise<IntegrationWebhookEvent[]> {
  if (frmsLiveApiEnabled()) {
    try {
      return await liveListIntegrationWebhooks()
    } catch (e) {
      console.error('Failed to load webhooks from live API', e)
      return []
    }
  }
  return loadIntegrationWebhookLog()
}

export async function recordWebhook(
  connectorId: string,
  direction: 'inbound' | 'outbound',
  message: string
): Promise<void> {
  if (frmsLiveApiEnabled()) {
    await livePostIntegrationWebhook({ connectorId, direction, message })
  } else {
    appendLocalWebhook(connectorId, direction, message)
  }
}
