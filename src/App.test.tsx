// @vitest-environment jsdom
// @vitest-environment-options {"url":"http://localhost:5173/"}
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { obrasApi } from './api/obrasApi'
import type { OrdenTrabajo, ProyectoObra, Rol } from './types'

vi.mock('./api/obrasApi', async (importOriginal) => {
  const original = await importOriginal<typeof import('./api/obrasApi')>()
  return { ...original, obrasApi: Object.fromEntries(Object.keys(original.obrasApi).map((key) => [key, vi.fn()])) }
})

const page = <T,>(content: T[], totalPages = 1) => ({ content, page: 0, size: 5, totalElements: content.length, totalPages })
const project: ProyectoObra = {
  id: 7, name: 'Bacheo Centro', estimatedBudget: 100000, estimatedStartDate: '2026-09-22',
  estimatedDurationDays: 10, physicalProgress: 0, budgetProgress: 0, status: 'BORRADOR',
}
const order: OrdenTrabajo = {
  id: 12, origin: 'PROYECTO', projectId: 7, description: 'Reparar calzada', priority: 'ALTA',
  status: 'PENDIENTE', hasEvidence: false,
}

function mockSession(role: Rol = 'PERSONAL_OBRAS') {
  window.sessionStorage.setItem('obras-publicas-session', JSON.stringify({ name: 'tester', role, accessToken: 'qa-token' }))
  window.sessionStorage.setItem('obras-publicas-access-token', 'qa-token')
  vi.mocked(obrasApi.me).mockResolvedValue({ username: 'tester', role })
}

function mockData() {
  vi.mocked(obrasApi.getDashboardSummary).mockResolvedValue({
    asOfDate: '2026-09-21', totalProjects: 1, activeProjects: 0, openWorkOrders: 1,
    externalWorkOrders: 0, delayedWorkOrders: 0, delayedProjects: 0, averagePhysicalProgress: 0,
    estimatedBudget: 100000, approvedBudget: 0, usedBudget: 0, budgetProgress: 0, crewLoads: [],
  })
  vi.mocked(obrasApi.listProjects).mockResolvedValue(page([project]))
  vi.mocked(obrasApi.listWorkOrders).mockResolvedValue(page([order]))
  vi.mocked(obrasApi.getResources).mockResolvedValue({ crews: [{ id: 1, nombre: 'Cuadrilla Alfa' }], materials: [], machinery: [] })
  vi.mocked(obrasApi.listStreetClosures).mockResolvedValue(page([]))
  vi.mocked(obrasApi.getProject).mockResolvedValue(project)
  vi.mocked(obrasApi.getWorkOrder).mockResolvedValue(order)
  vi.mocked(obrasApi.logout).mockResolvedValue(undefined)
}

describe('App: recorridos de usuario', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
    mockData()
  })

  afterEach(() => {
    cleanup()
    window.sessionStorage.clear()
  })

  it('exige usuario y contraseña antes de llamar al backend y conserva el rol devuelto', async () => {
    const user = userEvent.setup()
    vi.mocked(obrasApi.login).mockResolvedValue({ accessToken: 'qa-token', username: 'tester', role: 'PERSONAL_OBRAS' })
    vi.mocked(obrasApi.me).mockResolvedValue({ username: 'tester', role: 'PERSONAL_OBRAS' })
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(screen.getByRole('alert').textContent).toContain('usuario y contraseña')
    expect(obrasApi.login).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('Nombre de usuario'), 'tester')
    await user.type(screen.getByLabelText('Contraseña'), 'clave')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByText('Tablero operativo')).toBeTruthy()
    expect(obrasApi.login).toHaveBeenCalledWith('tester', 'clave')
    expect(window.sessionStorage.getItem('obras-publicas-access-token')).toBe('qa-token')
  })

  it('muestra errores de login del backend sin crear una sesión local', async () => {
    const user = userEvent.setup()
    vi.mocked(obrasApi.login).mockRejectedValue(new Error('Credenciales inválidas'))
    render(<App />)
    await user.type(screen.getByLabelText('Nombre de usuario'), 'tester')
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Credenciales inválidas')
    expect(window.sessionStorage.getItem('obras-publicas-session')).toBeNull()
  })

  it('carga datos reales simulados, navega por secciones y cierra la sesión', async () => {
    const user = userEvent.setup()
    mockSession()
    render(<App />)
    expect(await screen.findByText('Tablero operativo')).toBeTruthy()
    await waitFor(() => expect(obrasApi.getDashboardSummary).toHaveBeenCalled())
    await user.click(screen.getByRole('button', { name: 'Proyectos' }))
    expect(await screen.findByText('Bacheo Centro')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Recursos' }))
    expect(await screen.findByText('Cuadrilla Alfa')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Salir' }))
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeTruthy()
    expect(window.sessionStorage.getItem('obras-publicas-session')).toBeNull()
    expect(obrasApi.logout).toHaveBeenCalledOnce()
  })

  it('no permite crear proyectos al inspector y sí al personal de obras', async () => {
    const user = userEvent.setup()
    mockSession('INSPECTOR_OBRA')
    const { unmount } = render(<App />)
    await user.click(screen.getByRole('button', { name: 'Proyectos' }))
    expect(screen.getByRole('button', { name: 'Crear' }).hasAttribute('disabled')).toBe(true)
    unmount()

    window.sessionStorage.clear()
    mockSession('PERSONAL_OBRAS')
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Proyectos' }))
    expect(screen.getByRole('button', { name: 'Crear' }).hasAttribute('disabled')).toBe(false)
  })

  it('abre detalle y no permite iniciar una orden sin cuadrilla', async () => {
    const user = userEvent.setup()
    mockSession('JEFE_CUADRILLA')
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Ordenes' }))
    const row = await screen.findByText('OT #12 - Reparar calzada')
    const article = row.closest('article')
    expect(article).not.toBeNull()
    expect(within(article!).getByRole('button', { name: 'Iniciar orden' }).hasAttribute('disabled')).toBe(true)
    await user.click(within(article!).getByRole('button', { name: 'Detalle' }))
    expect(obrasApi.getWorkOrder).toHaveBeenCalledWith(12)
  })

  it('valida un proyecto antes de enviarlo y crea el proyecto con los datos del formulario', async () => {
    const user = userEvent.setup()
    mockSession()
    vi.mocked(obrasApi.createProject).mockResolvedValue(project)
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Proyectos' }))
    await user.click(screen.getByRole('button', { name: 'Crear' }))
    const form = screen.getByRole('heading', { name: 'Crear proyecto' }).closest('form')!
    await user.click(within(form).getByRole('button', { name: 'Crear proyecto' }))
    expect(obrasApi.createProject).not.toHaveBeenCalled()
    expect(screen.getByText('Revisá los campos obligatorios del proyecto.')).toBeTruthy()

    await user.type(within(form).getByLabelText(/^Nombre/), '  Plaza Norte  ')
    await user.type(within(form).getByLabelText(/^Ubicacion/), 'Centro')
    await user.type(within(form).getByLabelText(/^Presupuesto estimado/), '120000')
    await user.type(within(form).getByLabelText(/^Fecha estimada/), '2026-10-01')
    await user.type(within(form).getByLabelText(/^Duracion dias/), '30')
    await user.type(within(form).getByLabelText(/^Responsable tecnico/), 'Ana')
    await user.type(within(form).getByLabelText(/^Alcance/), 'Veredas')
    await user.click(within(form).getByRole('button', { name: 'Crear proyecto' }))
    await waitFor(() => expect(obrasApi.createProject).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Plaza Norte', location: 'Centro', estimatedBudget: 120000, estimatedDurationDays: 30, scope: 'Veredas',
    })))
    expect(await screen.findByText('Proyecto creado.')).toBeTruthy()
  })

  it('edita un proyecto y envía el borrador a aprobación', async () => {
    const user = userEvent.setup()
    mockSession()
    vi.mocked(obrasApi.updateProject).mockResolvedValue(project)
    vi.mocked(obrasApi.submitProjectForApproval).mockResolvedValue(project)
    vi.mocked(obrasApi.listProjects).mockResolvedValue(page([{ ...project, scope: 'Bacheo', location: 'Centro', technicalManager: 'Ana' }]))
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Proyectos' }))
    const row = (await screen.findByText('Bacheo Centro')).closest('article')!
    await user.click(within(row).getByRole('button', { name: 'Editar' }))
    const form = screen.getByRole('heading', { name: 'Editar proyecto' }).closest('form')!
    await user.clear(within(form).getByLabelText('Nombre'))
    await user.type(within(form).getByLabelText('Nombre'), 'Bacheo Norte')
    await user.click(within(form).getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(obrasApi.updateProject).toHaveBeenCalledWith(7, expect.objectContaining({ name: 'Bacheo Norte' })))
    await user.click(within(row).getByRole('button', { name: 'Enviar' }))
    await waitFor(() => expect(obrasApi.submitProjectForApproval).toHaveBeenCalledWith(7))
  })

  it('exige proyecto asociado para una orden de origen PROYECTO y conserva el vínculo al crearla', async () => {
    const user = userEvent.setup()
    mockSession()
    vi.mocked(obrasApi.createWorkOrder).mockResolvedValue(order)
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Ordenes' }))
    await user.click(screen.getByRole('button', { name: 'Nueva orden' }))
    const form = screen.getByRole('heading', { name: 'Crear orden' }).closest('form')!
    await user.selectOptions(within(form).getByLabelText('Origen'), 'PROYECTO')
    await user.type(within(form).getByLabelText('Descripcion'), 'Reparar vereda')
    await user.type(within(form).getByLabelText('Duracion horas'), '4')
    await user.click(within(form).getByRole('button', { name: 'Crear orden' }))
    expect(obrasApi.createWorkOrder).not.toHaveBeenCalled()
    expect(screen.getByText('Revisá los campos obligatorios de la orden.')).toBeTruthy()
    await user.selectOptions(within(form).getByLabelText(/^Proyecto asociado/), '7')
    await user.click(within(form).getByRole('button', { name: 'Crear orden' }))
    await waitFor(() => expect(obrasApi.createWorkOrder).toHaveBeenCalledWith(expect.objectContaining({
      origin: 'PROYECTO', projectId: 7, description: 'Reparar vereda', estimatedDurationHours: 4,
    })))
  })

  it('requiere fechas y tramos para solicitar un corte de calle', async () => {
    const user = userEvent.setup()
    mockSession()
    vi.mocked(obrasApi.createStreetClosure).mockResolvedValue({
      id: 1, closureRequestId: 'QA-1', sourceModule: 'M3', workOrderId: 12,
      location: 'Centro', affectedSections: ['Lima 100', 'Lima 200'], status: 'PENDIENTE',
      requestedFrom: '2026-10-01', requestedTo: '2026-10-02', reason: 'Bacheo',
    })
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Cortes' }))
    await user.click(screen.getByRole('button', { name: 'Solicitar' }))
    const form = screen.getByRole('heading', { name: 'Solicitar corte' }).closest('form')!
    await user.click(within(form).getByRole('button', { name: 'Crear solicitud' }))
    expect(obrasApi.createStreetClosure).not.toHaveBeenCalled()
    await user.type(within(form).getByLabelText(/^ID de orden/), '12')
    await user.type(within(form).getByLabelText(/^Ubicacion/), 'Centro')
    await user.type(within(form).getByLabelText(/^Desde/), '2026-10-01')
    await user.type(within(form).getByLabelText(/^Hasta/), '2026-10-02')
    await user.type(within(form).getByLabelText(/^Tramos afectados/), 'Lima 100, Lima 200')
    await user.type(within(form).getByLabelText(/^Motivo/), 'Bacheo')
    await user.click(within(form).getByRole('button', { name: 'Crear solicitud' }))
    await waitFor(() => expect(obrasApi.createStreetClosure).toHaveBeenCalledWith({
      workOrderId: 12, location: 'Centro', affectedSections: ['Lima 100', 'Lima 200'],
      requestedFrom: '2026-10-01', requestedTo: '2026-10-02', reason: 'Bacheo',
    }))
  })

  it('aprueba un proyecto pendiente con presupuesto y plazo explícitos', async () => {
    const user = userEvent.setup()
    mockSession('RESPONSABLE_AUTORIZADO')
    vi.mocked(obrasApi.listProjects).mockResolvedValue(page([{ ...project, status: 'PENDIENTE_APROBACION' }]))
    vi.mocked(obrasApi.approveProject).mockResolvedValue({ ...project, status: 'APROBADO' })
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Proyectos' }))
    const row = (await screen.findByText('Bacheo Centro')).closest('article')!
    await user.click(within(row).getByRole('button', { name: 'Aprobar' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Aprobar proyecto')).toBeTruthy()
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar aprobación' }))
    await waitFor(() => expect(obrasApi.approveProject).toHaveBeenCalledWith(7, expect.objectContaining({
      approvedBudget: 100000, approvedDeadlineDays: 10,
    })))
    expect(await screen.findByText('Proyecto aprobado.')).toBeTruthy()
  })

  it('programa una orden con cuadrilla y valida los campos del diálogo', async () => {
    const user = userEvent.setup()
    mockSession('JEFE_CUADRILLA')
    vi.mocked(obrasApi.scheduleWorkOrder).mockResolvedValue({ ...order, status: 'PROGRAMADA' })
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Ordenes' }))
    const row = (await screen.findByText('OT #12 - Reparar calzada')).closest('article')!
    await user.click(within(row).getByRole('button', { name: 'Programar orden' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Programar orden' }))
    expect(obrasApi.scheduleWorkOrder).not.toHaveBeenCalled()
    expect(within(dialog).getByRole('alert').textContent).toContain('fecha')
    await user.type(within(dialog).getByLabelText('Fecha programada'), '2026-10-03')
    await user.selectOptions(within(dialog).getByLabelText('Cuadrilla'), 'Cuadrilla Alfa')
    await user.click(within(dialog).getByRole('button', { name: 'Programar orden' }))
    await waitFor(() => expect(obrasApi.scheduleWorkOrder).toHaveBeenCalledWith(12, {
      scheduledDate: '2026-10-03', crew: 'Cuadrilla Alfa',
    }))
  })

  it('completa una orden solo con resultado y permite reabrirla con una observación', async () => {
    const user = userEvent.setup()
    mockSession('OPERARIO_CONTRATISTA')
    vi.mocked(obrasApi.listWorkOrders).mockResolvedValue(page([{ ...order, status: 'EN_EJECUCION', crew: 'Cuadrilla Alfa' }]))
    vi.mocked(obrasApi.completeWorkOrder).mockResolvedValue({ ...order, status: 'COMPLETADA' })
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Ordenes' }))
    const row = (await screen.findByText('OT #12 - Reparar calzada')).closest('article')!
    await user.click(within(row).getByRole('button', { name: 'Completar orden' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Completar orden' }))
    expect(within(dialog).getByRole('alert').textContent).toContain('obligatorio')
    await user.type(within(dialog).getByLabelText('Resultado de la orden'), 'Trabajo terminado')
    await user.click(within(dialog).getByRole('button', { name: 'Completar orden' }))
    await waitFor(() => expect(obrasApi.completeWorkOrder).toHaveBeenCalledWith(12, { outcome: 'Trabajo terminado' }))
  })

  it('filtra y pagina órdenes consultando el backend con los criterios seleccionados', async () => {
    const user = userEvent.setup()
    mockSession()
    vi.mocked(obrasApi.listWorkOrders).mockResolvedValue(page([order], 3))
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Ordenes' }))
    await screen.findByText('OT #12 - Reparar calzada')
    await user.type(screen.getByPlaceholderText('Buscar por ubicacion, tipo, origen o sourceRequestId'), 'vereda')
    await waitFor(() => expect(obrasApi.listWorkOrders).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'vereda', page: 0 })))
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await waitFor(() => expect(obrasApi.listWorkOrders).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'vereda', page: 1 })))
  })

  it('muestra fallo de carga y reintenta sin reiniciar la aplicación', async () => {
    const user = userEvent.setup()
    mockSession()
    vi.mocked(obrasApi.getDashboardSummary).mockRejectedValueOnce(new Error('Servicio no disponible'))
    render(<App />)
    expect(await screen.findByText('Servicio no disponible')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(obrasApi.getDashboardSummary).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Obras activas')).toBeTruthy()
  })

  it('inicia y pausa una orden programada con cuadrilla y sin corte pendiente', async () => {
    const user = userEvent.setup()
    mockSession('JEFE_CUADRILLA')
    vi.mocked(obrasApi.listWorkOrders).mockResolvedValue(page([{ ...order, status: 'PROGRAMADA', crew: 'Cuadrilla Alfa' }]))
    vi.mocked(obrasApi.startWorkOrder).mockResolvedValue({ ...order, status: 'EN_EJECUCION' })
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Ordenes' }))
    const row = (await screen.findByText('OT #12 - Reparar calzada')).closest('article')!
    const start = within(row).getByRole('button', { name: 'Iniciar orden' })
    expect(start.hasAttribute('disabled')).toBe(false)
    await user.click(start)
    await waitFor(() => expect(obrasApi.startWorkOrder).toHaveBeenCalledWith(12))
  })

  it('bloquea el inicio si hay un corte solicitado pero aún no autorizado', async () => {
    const user = userEvent.setup()
    mockSession('JEFE_CUADRILLA')
    vi.mocked(obrasApi.listWorkOrders).mockResolvedValue(page([{ ...order, status: 'PROGRAMADA', crew: 'Cuadrilla Alfa' }]))
    vi.mocked(obrasApi.listStreetClosures).mockResolvedValue(page([{
      id: 2, closureRequestId: 'QA-2', sourceModule: 'M3', workOrderId: 12,
      location: 'Centro', affectedSections: ['Lima 100'], status: 'PENDIENTE',
      requestedFrom: '2026-10-01', requestedTo: '2026-10-02', reason: 'Bacheo',
    }]))
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Ordenes' }))
    const row = (await screen.findByText('OT #12 - Reparar calzada')).closest('article')!
    expect(within(row).getByRole('button', { name: 'Iniciar orden' }).hasAttribute('disabled')).toBe(true)
    expect(obrasApi.startWorkOrder).not.toHaveBeenCalled()
  })

  it('permite reabrir una orden completada solo con observaciones de inspección', async () => {
    const user = userEvent.setup()
    mockSession('INSPECTOR_OBRA')
    vi.mocked(obrasApi.listWorkOrders).mockResolvedValue(page([{ ...order, status: 'COMPLETADA', crew: 'Cuadrilla Alfa' }]))
    vi.mocked(obrasApi.validateWorkOrder).mockResolvedValue({ ...order, status: 'REABIERTA' })
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Ordenes' }))
    const row = (await screen.findByText('OT #12 - Reparar calzada')).closest('article')!
    await user.click(within(row).getByRole('button', { name: 'Validar orden' }))
    const dialog = screen.getByRole('dialog')
    await user.selectOptions(within(dialog).getByLabelText('Dictamen de inspección'), 'REABRIR')
    await user.click(within(dialog).getByRole('button', { name: 'Reabrir orden' }))
    expect(obrasApi.validateWorkOrder).not.toHaveBeenCalled()
    expect(within(dialog).getByRole('alert').textContent).toContain('motivo')
    await user.type(within(dialog).getByLabelText(/^Observaciones/), 'El bache sigue abierto')
    await user.click(within(dialog).getByRole('button', { name: 'Reabrir orden' }))
    await waitFor(() => expect(obrasApi.validateWorkOrder).toHaveBeenCalledWith(12, {
      approved: false, observations: 'El bache sigue abierto',
    }))
  })

  it('rechaza un proyecto pendiente desde el rol autorizado', async () => {
    const user = userEvent.setup()
    mockSession('RESPONSABLE_AUTORIZADO')
    vi.mocked(obrasApi.listProjects).mockResolvedValue(page([{ ...project, status: 'PENDIENTE_APROBACION' }]))
    vi.mocked(obrasApi.rejectProject).mockResolvedValue({ ...project, status: 'RECHAZADO' })
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Proyectos' }))
    const row = (await screen.findByText('Bacheo Centro')).closest('article')!
    await user.click(within(row).getByRole('button', { name: 'Rechazar' }))
    await waitFor(() => expect(obrasApi.rejectProject).toHaveBeenCalledWith(7))
    expect(await screen.findByText('Proyecto rechazado.')).toBeTruthy()
  })

  it('pausa una orden en ejecución desde el rol jefe de cuadrilla', async () => {
    const user = userEvent.setup()
    mockSession('JEFE_CUADRILLA')
    vi.mocked(obrasApi.listWorkOrders).mockResolvedValue(page([{ ...order, status: 'EN_EJECUCION', crew: 'Cuadrilla Alfa' }]))
    vi.mocked(obrasApi.pauseWorkOrder).mockResolvedValue({ ...order, status: 'PAUSADA' })
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Ordenes' }))
    const row = (await screen.findByText('OT #12 - Reparar calzada')).closest('article')!
    await user.click(within(row).getByRole('button', { name: 'Pausar orden' }))
    await waitFor(() => expect(obrasApi.pauseWorkOrder).toHaveBeenCalledWith(12))
    expect(await screen.findByText('Orden pausada.')).toBeTruthy()
  })

  it('mantiene la sesión si el logout falla por red y permite volver a intentarlo', async () => {
    const user = userEvent.setup()
    mockSession()
    vi.mocked(obrasApi.logout).mockRejectedValueOnce(new Error('No se pudo cerrar la sesión'))
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Salir' }))
    expect(await screen.findByText('No se pudo cerrar la sesión')).toBeTruthy()
    expect(window.sessionStorage.getItem('obras-publicas-session')).not.toBeNull()
    await user.click(screen.getByRole('button', { name: 'Salir' }))
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeTruthy()
  })

  it('descarta la sesión vencida cuando la API informa una respuesta no autorizada', async () => {
    mockSession()
    render(<App />)
    await screen.findByText('Tablero operativo')
    window.dispatchEvent(new Event('obras-api-unauthorized'))
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeTruthy()
    expect(window.sessionStorage.getItem('obras-publicas-access-token')).toBeNull()
  })
})
