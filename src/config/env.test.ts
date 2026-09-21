import { describe, expect, it } from 'vitest'
import { resolveAppEnv } from './env'

describe('resolveAppEnv', () => {
  it('shows the runtime Azure environment even when the promoted image was built for development', () => {
    expect(resolveAppEnv('ca-obras-publicas-tst-frontend.example.azurecontainerapps.io', 'development')).toBe('test')
    expect(resolveAppEnv('ca-obras-publicas-dev-frontend.example.azurecontainerapps.io', 'test')).toBe('development')
  })

  it('keeps the configured label outside the Azure environment hosts', () => {
    expect(resolveAppEnv('localhost', 'local')).toBe('local')
  })
})
