// @vitest-environment jsdom
// @vitest-environment-options {"url":"http://localhost:5173/"}
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, obrasApi } from './obrasApi'

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
})

describe('obrasApi: contrato HTTP del frontend', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    window.history.replaceState({}, '', 'http://localhost:5173/')
    window.sessionStorage.clear()
    fetchMock = vi.fn().mockImplementation(async () => jsonResponse({}))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    window.sessionStorage.clear()
  })

  it('envía el login por /api en el mismo origen sin credenciales de base de datos', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ accessToken: 'token-qa', username: 'personal.obras', role: 'PERSONAL_OBRAS' }))

    await expect(obrasApi.login('personal.obras', 'clave-qa')).resolves.toMatchObject({ accessToken: 'token-qa' })
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:5173/api/auth/login')
    expect(options.method).toBe('POST')
    expect(JSON.parse(String(options.body))).toEqual({ username: 'personal.obras', password: 'clave-qa' })
    expect(new Headers(options.headers).has('Authorization')).toBe(false)
  })

  it('adjunta el token y serializa filtros sin incluir valores vacíos', async () => {
    window.sessionStorage.setItem('obras-publicas-access-token', 'token-qa')
    await obrasApi.listWorkOrders({ search: 'bache', origin: 'PROYECTO', page: 2, size: 5 })
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:5173/api/public-works/work-orders?search=bache&origin=PROYECTO&page=2&size=5')
    expect(new Headers(options.headers).get('Authorization')).toBe('Bearer token-qa')

    await obrasApi.listProjects({ search: '', status: 'APROBADO', page: 0 })
    expect(fetchMock.mock.calls[1][0]).toBe('http://localhost:5173/api/public-works/projects?status=APROBADO&page=0')
  })

  it('acepta respuestas 204 y rechaza HTML inesperado del proxy', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
    await expect(obrasApi.logout()).resolves.toBeUndefined()
    fetchMock.mockResolvedValueOnce(new Response('<html>proxy roto</html>', { status: 200, headers: { 'Content-Type': 'text/html' } }))
    await expect(obrasApi.me()).rejects.toMatchObject({ status: 200, message: expect.stringContaining('no es JSON') })
  })

  it('propaga el mensaje y detalles de negocio del backend', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'Falta projectId', code: 'INVALID_REQUEST', details: ['projectId'] }, 400))
    await expect(obrasApi.createWorkOrder({ origin: 'PROYECTO', description: 'QA', priority: 'MEDIA' })).rejects.toMatchObject({
      name: 'ApiError', status: 400, code: 'INVALID_REQUEST', details: ['projectId'], message: 'Falta projectId',
    })
  })

  it('invalida la sesión local cuando el backend responde 401', async () => {
    const unauthorized = vi.fn()
    window.addEventListener('obras-api-unauthorized', unauthorized, { once: true })
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'Token vencido' }, 401))
    await expect(obrasApi.getProject(1)).rejects.toMatchObject({ status: 401, message: 'Token vencido' })
    expect(unauthorized).toHaveBeenCalledOnce()
  })

  it('usa un error legible si la respuesta de error no contiene JSON válido', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{', { status: 502, headers: { 'Content-Type': 'application/json' } }))
    await expect(obrasApi.getWorkOrder(1)).rejects.toEqual(new ApiError('Error 502 al comunicarse con la API', 502))
  })

  it.each([
    ['usuario actual', () => obrasApi.me(), '/auth/me', 'GET'],
    ['proyecto', () => obrasApi.getProject(7), '/public-works/projects/7', 'GET'],
    ['crear proyecto', () => obrasApi.createProject({ name: 'QA', estimatedBudget: 1, estimatedStartDate: '2026-09-22', estimatedDurationDays: 1 }), '/public-works/projects', 'POST'],
    ['editar proyecto', () => obrasApi.updateProject(7, { name: 'QA', estimatedBudget: 1, estimatedStartDate: '2026-09-22', estimatedDurationDays: 1 }), '/public-works/projects/7', 'PUT'],
    ['presentar proyecto', () => obrasApi.submitProjectForApproval(7), '/public-works/projects/7/submit-approval', 'PATCH'],
    ['aprobar proyecto', () => obrasApi.approveProject(7, { approvedBudget: 1, approvedDeadlineDays: 1, approvedAt: '2026-09-22' }), '/public-works/projects/7/approve', 'PATCH'],
    ['rechazar proyecto', () => obrasApi.rejectProject(7), '/public-works/projects/7/reject', 'PATCH'],
    ['orden', () => obrasApi.getWorkOrder(4), '/public-works/work-orders/4', 'GET'],
    ['crear orden', () => obrasApi.createWorkOrder({ origin: 'MANUAL', description: 'QA', priority: 'MEDIA' }), '/public-works/work-orders', 'POST'],
    ['editar orden', () => obrasApi.updateWorkOrder(4, { origin: 'MANUAL', description: 'QA', priority: 'MEDIA' }), '/public-works/work-orders/4', 'PUT'],
    ['programar orden', () => obrasApi.scheduleWorkOrder(4, { scheduledDate: '2026-09-22', crew: 'QA' }), '/public-works/work-orders/4/schedule', 'PATCH'],
    ['iniciar orden', () => obrasApi.startWorkOrder(4), '/public-works/work-orders/4/start', 'PATCH'],
    ['pausar orden', () => obrasApi.pauseWorkOrder(4), '/public-works/work-orders/4/pause', 'PATCH'],
    ['completar orden', () => obrasApi.completeWorkOrder(4, { outcome: 'QA' }), '/public-works/work-orders/4/complete', 'PATCH'],
    ['validar orden', () => obrasApi.validateWorkOrder(4, { approved: true }), '/public-works/work-orders/4/validate', 'PATCH'],
    ['tablero', () => obrasApi.getDashboardSummary(), '/public-works/dashboard/summary', 'GET'],
    ['recursos', () => obrasApi.getResources(), '/public-works/resources', 'GET'],
    ['cortes', () => obrasApi.listStreetClosures({ page: 1 }), '/public-works/street-closures?page=1', 'GET'],
    ['crear corte', () => obrasApi.createStreetClosure({ workOrderId: 4, location: 'QA', affectedSections: 'QA', requestedFrom: '2026-09-22', requestedTo: '2026-09-23', reason: 'QA' }), '/public-works/street-closures', 'POST'],
  ] as const)('usa la ruta y método de %s', async (_name, call, path, method) => {
    await call()
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`http://localhost:5173/api${path}`)
    expect(options.method ?? 'GET').toBe(method)
  })
})
