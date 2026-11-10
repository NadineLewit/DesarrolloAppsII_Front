import { afterEach, expect, it, vi } from 'vitest'
import { startIntegrationPolling } from './useIntegrationEvents'

afterEach(() => vi.useRealTimers())

it('refreshes automatically without overlapping slow requests and cancels on cleanup', async () => {
  vi.useFakeTimers()
  let finish!: (value: string) => void
  let signal!: AbortSignal
  const fetchEvents = vi.fn((currentSignal: AbortSignal) => {
    signal = currentSignal
    return new Promise<string>(resolve => { finish = resolve })
  })
  const success = vi.fn()
  const failure = vi.fn()
  const stop = startIntegrationPolling(fetchEvents, success, failure)
  await vi.advanceTimersByTimeAsync(15000)
  expect(fetchEvents).toHaveBeenCalledTimes(1)
  finish('first event')
  await vi.advanceTimersByTimeAsync(5000)
  expect(success).toHaveBeenCalledWith('first event')
  expect(fetchEvents).toHaveBeenCalledTimes(2)
  stop()
  expect(signal.aborted).toBe(true)
  finish('obsolete event')
  await vi.advanceTimersByTimeAsync(15000)
  expect(success).toHaveBeenCalledTimes(1)
  expect(failure).not.toHaveBeenCalled()
  expect(fetchEvents).toHaveBeenCalledTimes(2)
})

it('recovers automatically after a temporary failure', async () => {
  vi.useFakeTimers()
  const error = new Error('Connection lost')
  const fetchEvents = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('recovered')
  const success = vi.fn()
  const failure = vi.fn()
  const stop = startIntegrationPolling(fetchEvents, success, failure)
  await vi.advanceTimersByTimeAsync(5000)
  expect(failure).toHaveBeenCalledWith(error)
  expect(success).toHaveBeenCalledWith('recovered')
  stop()
})
