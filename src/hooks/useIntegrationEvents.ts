import { useCallback, useEffect, useState } from 'react'
import { obrasApi } from '../api/obrasApi'
import type { IntegrationEvent, PageResponse } from '../types'

export function startIntegrationPolling<T>(
  fetchEvents: (signal: AbortSignal) => Promise<T>,
  onSuccess: (data: T) => void,
  onError: (error: unknown) => void,
) {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  async function poll() {
    try {
      const data = await fetchEvents(controller.signal)
      if (!controller.signal.aborted) onSuccess(data)
    } catch (error) {
      if (!controller.signal.aborted) onError(error)
    } finally {
      // Schedule after completion so slow requests never overlap.
      if (!controller.signal.aborted) timer = setTimeout(poll, 5000)
    }
  }
  void poll()
  return () => {
    controller.abort()
    clearTimeout(timer)
  }
}

export function useIntegrationEvents(enabled: boolean, page: number, direction: 'ALL' | 'INCOMING' | 'OUTGOING') {
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<{
    status: 'loading' | 'success' | 'error'
    data?: PageResponse<IntegrationEvent>
    message?: string
    updatedAt?: Date
  }>({ status: 'loading' })
  const refresh = useCallback(() => setRevision(value => value + 1), [])

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'loading' })
      return
    }
    setState({ status: 'loading' })
    return startIntegrationPolling(
      signal => obrasApi.listIntegrationEvents({ page, size: 20, direction }, signal),
      data => setState({ status: 'success', data, updatedAt: new Date() }),
      error => setState(previous => ({
          ...previous, status: 'error',
          message: error instanceof Error ? error.message : 'No se pudieron cargar los eventos.',
      })),
    )
  }, [enabled, page, direction, revision])

  return { ...state, refresh }
}
