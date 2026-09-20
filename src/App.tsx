import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Construction,
  FileText,
  Gauge,
  Hammer,
  LogOut,
  Network,
  PauseCircle,
  PlayCircle,
  Plus,
  Search,
  ShieldCheck,
  Truck,
  Users,
} from 'lucide-react'
import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, obrasApi } from './api/obrasApi'
import { env } from './config/env'
import { eventosIntegracion, modulosIntegracion } from './contracts/integrations'
import { originLabels, permisosPorRol, projectStatusLabels, workOrderStatusLabels } from './constants/ui'
import type {
  CorteCalle,
  DashboardSummary,
  OrdenTrabajo,
  PageResponse,
  Prioridad,
  ProyectoObra,
  ProyectoObraPayload,
  ProjectApprovalPayload,
  ResourcesSummary,
  Rol,
  Seccion,
  WorkOrderOrigin,
  WorkOrderPriority,
  WorkOrderStatus,
} from './types'
import { formatMoney } from './utils/formatters'
import { hasErrors, type FormErrors, validateProject, validateProjectApproval, validateStreetClosure, validateWorkOrder } from './utils/validation'
import './App.css'

const ORDER_PAGE_SIZE = 5
const LIST_PAGE_SIZE = 20

type RemoteState<T> = {
  status: 'loading' | 'success' | 'error'
  data?: T
  message?: string
}

type Feedback = {
  type: 'success' | 'error'
  message: string
}

type AuthSession = {
  name: string
  role: Rol
  accessToken: string
}

type ProjectFormState = {
  name: string
  description: string
  scope: string
  location: string
  estimatedBudget: string
  approvedBudget: string
  usedBudget: string
  estimatedStartDate: string
  estimatedDurationDays: string
  approvedDeadlineDays: string
  physicalProgress: string
  technicalManager: string
  contractor: string
}

type OrderFormState = {
  sourceRequestId: string
  origin: WorkOrderOrigin
  projectId: string
  description: string
  interventionType: string
  location: string
  priority: WorkOrderPriority
  estimatedDurationHours: string
  crew: string
}

type ClosureFormState = {
  workOrderId: string
  location: string
  affectedSections: string
  requestedFrom: string
  requestedTo: string
  reason: string
}

function App() {
  const [seccionActiva, setSeccionActiva] = useState<Seccion>('dashboard')
  const [session, setSession] = useState<AuthSession | null>(() => restoreSession())
  const [busqueda, setBusqueda] = useState('')
  const [estadoOrden, setEstadoOrden] = useState<'TODOS' | WorkOrderStatus>('TODOS')
  const [origenOrden, setOrigenOrden] = useState<'TODOS' | WorkOrderOrigin>('TODOS')
  const [pagina, setPagina] = useState(1)
  const [dashboard, setDashboard] = useState<RemoteState<DashboardSummary>>({ status: 'loading' })
  const [projects, setProjects] = useState<RemoteState<PageResponse<ProyectoObra>>>({ status: 'loading' })
  const [orders, setOrders] = useState<RemoteState<PageResponse<OrdenTrabajo>>>({ status: 'loading' })
  const [resources, setResources] = useState<RemoteState<ResourcesSummary>>({ status: 'loading' })
  const [closures, setClosures] = useState<RemoteState<PageResponse<CorteCalle>>>({ status: 'loading' })
  const [projectDetail, setProjectDetail] = useState<RemoteState<ProyectoObra> | null>(null)
  const [orderDetail, setOrderDetail] = useState<RemoteState<OrdenTrabajo> | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [actionPending, setActionPending] = useState<string | null>(null)
  const [projectFormMode, setProjectFormMode] = useState<'closed' | 'create' | 'edit'>('closed')
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null)
  const [projectForm, setProjectForm] = useState<ProjectFormState>(emptyProjectForm)
  const [projectErrors, setProjectErrors] = useState<FormErrors>({})
  const [orderFormMode, setOrderFormMode] = useState<'closed' | 'create' | 'edit'>('closed')
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null)
  const [orderForm, setOrderForm] = useState<OrderFormState>(emptyOrderForm)
  const [orderErrors, setOrderErrors] = useState<FormErrors>({})
  const [closureFormOpen, setClosureFormOpen] = useState(false)
  const [closureForm, setClosureForm] = useState<ClosureFormState>(emptyClosureForm)
  const [closureErrors, setClosureErrors] = useState<FormErrors>({})
  const [approvalProject, setApprovalProject] = useState<ProyectoObra | null>(null)

  const rol = session?.role ?? 'PERSONAL_OBRAS'
  const accessToken = session?.accessToken
  const permisos = permisosPorRol[rol]

  const crews = useMemo(() => resources.data?.crews ?? [], [resources.data?.crews])
  const crewNames = useMemo(() => {
    const names = new Set(crews.map((crew) => crew.nombre))
    if (orderForm.crew) {
      names.add(orderForm.crew)
    }
    return Array.from(names).sort()
  }, [crews, orderForm.crew])

  const resourceCards = useMemo(() => {
    const data = resources.data
    if (!data) {
      return []
    }

    return [
      ...data.crews.map((crew) => ({
        id: `crew-${crew.id}`,
        name: crew.nombre,
        type: 'Cuadrilla',
        detail: 'Asignable a ordenes',
      })),
      ...data.materials.map((material) => ({
        id: `material-${material.id}`,
        name: material.nombre,
        type: material.unidad ? `Material - ${material.unidad}` : 'Material',
        detail: 'Catalogo backend',
      })),
      ...data.machinery.map((machine) => ({
        id: `machine-${machine.id}`,
        name: machine.nombre,
        type: 'Maquinaria',
        detail: 'Catalogo backend',
      })),
    ]
  }, [resources.data])

  const totalPaginas = Math.max(1, orders.data?.totalPages ?? 1)
  const busy = actionPending !== null
  const pendingClosuresByOrder = useMemo(() => new Set(
    (closures.data?.content ?? [])
      .filter((closure) => !isClosureAuthorized(closure.status))
      .map((closure) => closure.workOrderId),
  ), [closures.data?.content])

  const loadDashboard = useCallback(async () => {
    setDashboard({ status: 'loading' })
    try {
      setDashboard({ status: 'success', data: await obrasApi.getDashboardSummary() })
    } catch (error) {
      setDashboard({ status: 'error', message: getErrorMessage(error) })
    }
  }, [])

  const loadProjects = useCallback(async () => {
    setProjects({ status: 'loading' })
    try {
      setProjects({
        status: 'success',
        data: await obrasApi.listProjects({ page: 0, size: LIST_PAGE_SIZE, sort: 'id,asc' }),
      })
    } catch (error) {
      setProjects({ status: 'error', message: getErrorMessage(error) })
    }
  }, [])

  const loadOrders = useCallback(async () => {
    setOrders({ status: 'loading' })
    try {
      setOrders({
        status: 'success',
        data: await obrasApi.listWorkOrders({
          search: busqueda,
          status: estadoOrden === 'TODOS' ? undefined : estadoOrden,
          origin: origenOrden === 'TODOS' ? undefined : origenOrden,
          page: pagina - 1,
          size: ORDER_PAGE_SIZE,
          sort: 'id,asc',
        }),
      })
    } catch (error) {
      setOrders({ status: 'error', message: getErrorMessage(error) })
    }
  }, [busqueda, estadoOrden, origenOrden, pagina])

  const loadResources = useCallback(async () => {
    setResources({ status: 'loading' })
    try {
      setResources({ status: 'success', data: await obrasApi.getResources() })
    } catch (error) {
      setResources({ status: 'error', message: getErrorMessage(error) })
    }
  }, [])

  const loadClosures = useCallback(async () => {
    setClosures({ status: 'loading' })
    try {
      setClosures({
        status: 'success',
        data: await obrasApi.listStreetClosures({ page: 0, size: LIST_PAGE_SIZE, sort: 'id,asc' }),
      })
    } catch (error) {
      setClosures({ status: 'error', message: getErrorMessage(error) })
    }
  }, [])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  useEffect(() => {
    void loadResources()
  }, [loadResources])

  useEffect(() => {
    void loadClosures()
  }, [loadClosures])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  useEffect(() => {
    const onUnauthorized = () => {
      window.sessionStorage.removeItem('obras-publicas-session')
      window.sessionStorage.removeItem('obras-publicas-access-token')
      setSession(null)
    }
    window.addEventListener('obras-api-unauthorized', onUnauthorized)
    return () => window.removeEventListener('obras-api-unauthorized', onUnauthorized)
  }, [])

  useEffect(() => {
    if (!accessToken) return
    void obrasApi.me().then(({ username, role }) => {
      setSession((current) => current ? { ...current, name: username, role } : current)
    }).catch(() => {
      // A 401 already clears local session through the shared API handler.
    })
  }, [accessToken])

  async function refreshCoreData() {
    await Promise.all([loadDashboard(), loadProjects(), loadOrders()])
  }

  async function runAction(key: string, successMessage: string, action: () => Promise<unknown>) {
    setActionPending(key)
    setFeedback(null)
    try {
      await action()
      await refreshCoreData()
      setFeedback({ type: 'success', message: successMessage })
      return true
    } catch (error) {
      setFeedback({ type: 'error', message: getErrorMessage(error) })
      return false
    } finally {
      setActionPending(null)
    }
  }

  function openCreateProjectForm() {
    setEditingProjectId(null)
    setProjectForm(emptyProjectForm())
    setProjectErrors({})
    setProjectFormMode('create')
  }

  function openEditProjectForm(project: ProyectoObra) {
    setEditingProjectId(project.id)
    setProjectForm(projectToForm(project))
    setProjectErrors({})
    setProjectFormMode('edit')
  }

  async function handleProjectSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors = validateProject(projectForm)
    setProjectErrors(errors)
    if (hasErrors(errors)) {
      setFeedback({ type: 'error', message: 'Revisá los campos obligatorios del proyecto.' })
      return
    }

    const payload = buildProjectPayload(projectForm)
    const succeeded = await runAction(
      'project-form',
      projectFormMode === 'edit' ? 'Proyecto actualizado.' : 'Proyecto creado.',
      () => editingProjectId ? obrasApi.updateProject(editingProjectId, payload) : obrasApi.createProject(payload),
    )
    if (!succeeded) {
      return
    }
    setProjectFormMode('closed')
    setEditingProjectId(null)
    setProjectForm(emptyProjectForm())
    setProjectErrors({})
  }

  function openCreateOrderForm() {
    setEditingOrderId(null)
    setOrderForm(emptyOrderForm())
    setOrderErrors({})
    setOrderFormMode('create')
  }

  function openEditOrderForm(order: OrdenTrabajo) {
    setEditingOrderId(order.id)
    setOrderForm(orderToForm(order))
    setOrderErrors({})
    setOrderFormMode('edit')
  }

  async function handleOrderSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors = validateWorkOrder(orderForm)
    setOrderErrors(errors)
    if (hasErrors(errors)) {
      setFeedback({ type: 'error', message: 'Revisá los campos obligatorios de la orden.' })
      return
    }

    const payload = buildOrderPayload(orderForm)
    const succeeded = await runAction(
      'order-form',
      orderFormMode === 'edit' ? 'Orden actualizada.' : 'Orden creada.',
      () => editingOrderId ? obrasApi.updateWorkOrder(editingOrderId, payload) : obrasApi.createWorkOrder(payload),
    )
    if (!succeeded) {
      return
    }
    setOrderFormMode('closed')
    setEditingOrderId(null)
    setOrderForm(emptyOrderForm())
    setOrderErrors({})
  }

  async function handleClosureSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors = validateStreetClosure(closureForm)
    setClosureErrors(errors)
    if (hasErrors(errors)) {
      setFeedback({ type: 'error', message: 'Revisá los datos de la solicitud de corte.' })
      return
    }

    const succeeded = await runAction(
      'closure-form',
      'Solicitud de corte creada.',
      () => obrasApi.createStreetClosure(buildClosurePayload(closureForm)),
    )
    if (!succeeded) {
      return
    }
    await loadClosures()
    setClosureFormOpen(false)
    setClosureForm(emptyClosureForm())
    setClosureErrors({})
  }

  async function loadProjectDetail(id: number) {
    setProjectDetail({ status: 'loading' })
    try {
      setProjectDetail({ status: 'success', data: await obrasApi.getProject(id) })
    } catch (error) {
      setProjectDetail({ status: 'error', message: getErrorMessage(error) })
    }
  }

  async function loadOrderDetail(id: number) {
    setOrderDetail({ status: 'loading' })
    try {
      setOrderDetail({ status: 'success', data: await obrasApi.getWorkOrder(id) })
    } catch (error) {
      setOrderDetail({ status: 'error', message: getErrorMessage(error) })
    }
  }

  async function handleScheduleOrder(order: OrdenTrabajo) {
    const scheduledDate = window.prompt('Fecha programada (YYYY-MM-DD)', order.scheduledDate ?? '')
    if (!scheduledDate) {
      return
    }

    const crew = window.prompt('Cuadrilla existente (obligatoria).', order.crew ?? '')
    if (crew === null || !crew.trim()) {
      setFeedback({ type: 'error', message: 'No se puede programar ni iniciar una orden sin cuadrilla.' })
      return
    }

    await runAction(`schedule-${order.id}`, 'Orden programada.', () =>
      obrasApi.scheduleWorkOrder(order.id, {
        scheduledDate,
        crew: crew.trim(),
      }),
    )
  }

  async function handleCompleteOrder(order: OrdenTrabajo) {
    const outcome = window.prompt('Resultado de la orden', order.outcome ?? '')
    if (outcome === null) {
      return
    }

    if (!outcome.trim()) {
      setFeedback({ type: 'error', message: 'El resultado de la orden es obligatorio para completarla.' })
      return
    }

    await runAction(`complete-${order.id}`, 'Orden completada.', () =>
      obrasApi.completeWorkOrder(order.id, optionalText(outcome) ? { outcome: outcome.trim() } : {}),
    )
  }

  async function handleValidateOrder(order: OrdenTrabajo) {
    const decision = window.prompt('Escribi APROBAR para validar o REABRIR para devolver la orden', 'APROBAR')
    if (decision === null) {
      return
    }

    const normalizedDecision = decision.trim().toUpperCase()
    if (normalizedDecision !== 'APROBAR' && normalizedDecision !== 'REABRIR') {
      setFeedback({ type: 'error', message: 'La decision debe ser APROBAR o REABRIR.' })
      return
    }

    const observations = window.prompt('Observaciones', '')
    if (observations === null) {
      return
    }

    if (normalizedDecision === 'REABRIR' && !observations.trim()) {
      setFeedback({ type: 'error', message: 'El motivo es obligatorio para reabrir una orden.' })
      return
    }

    await runAction(`validate-${order.id}`, 'Orden validada.', () =>
      obrasApi.validateWorkOrder(order.id, {
        approved: normalizedDecision === 'APROBAR',
        ...(optionalText(observations) ? { observations: observations.trim() } : {}),
      }),
    )
  }

  async function handleApproveProject(project: ProyectoObra, payload: ProjectApprovalPayload) {
    const succeeded = await runAction(`approve-project-${project.id}`, 'Proyecto aprobado.', () => obrasApi.approveProject(project.id, payload))
    if (succeeded) {
      setApprovalProject(null)
    }
  }

  function handleLogin(nextSession: AuthSession) {
    window.sessionStorage.setItem('obras-publicas-session', JSON.stringify(nextSession))
    window.sessionStorage.setItem('obras-publicas-access-token', nextSession.accessToken)
    setSession(nextSession)
  }

  async function handleLogout() {
    try {
      await obrasApi.logout()
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        setFeedback({ type: 'error', message: getErrorMessage(error) })
        return
      }
    }
    window.sessionStorage.removeItem('obras-publicas-session')
    window.sessionStorage.removeItem('obras-publicas-access-token')
    setSession(null)
  }

  if (!session) {
    return <LoginScreen onLogin={handleLogin} />
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navegacion principal">
        <div className="brand">
          <Construction aria-hidden="true" />
          <div>
            <strong>Municipalidad UADE</strong>
            <span>Modulo 3 - Obras</span>
          </div>
        </div>

        <nav className="nav-list">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { id: 'obras', label: 'Proyectos', icon: Building2 },
            { id: 'ordenes', label: 'Ordenes', icon: ClipboardList },
            { id: 'recursos', label: 'Recursos', icon: Truck },
            { id: 'cortes', label: 'Cortes', icon: ShieldCheck },
            { id: 'integraciones', label: 'Integraciones', icon: Network },
          ].map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                className={seccionActiva === item.id ? 'active' : ''}
                type="button"
                onClick={() => setSeccionActiva(item.id as Seccion)}
              >
                <Icon size={18} aria-hidden="true" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Gestion de infraestructura urbana</p>
            <h1>{titulos[seccionActiva]}</h1>
          </div>
          <div className="topbar-actions">
            <span className="env-pill">{env.appEnv} - {env.apiBaseUrl}</span>
            <div className="session-summary">
              <strong>{session.name}</strong>
              <span>{roleLabel(rol)}</span>
            </div>
            <button type="button" className="logout-button" onClick={handleLogout}>
              <LogOut size={16} aria-hidden="true" />
              Salir
            </button>
          </div>
        </header>

        {feedback && <div className={`notice ${feedback.type}`}>{feedback.message}</div>}

        {seccionActiva === 'dashboard' && (
          <section className="dashboard-grid">
            {dashboard.status === 'loading' && <StateMessage type="loading" message="Cargando dashboard desde backend..." />}
            {dashboard.status === 'error' && (
              <StateMessage type="error" message={dashboard.message ?? 'No se pudo cargar el dashboard.'} onRetry={loadDashboard} />
            )}
            {dashboard.status === 'success' && dashboard.data && (
              <>
                <MetricCard icon={Building2} label="Obras activas" value={dashboard.data.activeProjects.toString()} trend="desde backend" />
                <MetricCard icon={ClipboardList} label="Ordenes abiertas" value={dashboard.data.openWorkOrders.toString()} trend="no completadas" />
                <MetricCard icon={Network} label="Ordenes externas" value={dashboard.data.externalWorkOrders.toString()} trend="origen no manual" />
                <MetricCard icon={AlertTriangle} label="Demoras detectadas" value={dashboard.data.delayedWorkOrders.toString()} trend="segun fecha programada" />
              </>
            )}

            <section className="panel full">
              <div className="panel-heading">
                <h2>Mapa de integraciones</h2>
                <span className="loading-pill">Fuera de esta entrega</span>
              </div>
              <div className="module-grid">
                {modulosIntegracion.map((modulo) => (
                  <article key={modulo.id} className="module-card">
                    <strong>{modulo.id} - {modulo.nombre}</strong>
                    <span>{modulo.descripcion}</span>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel full">
              <div className="panel-heading">
                <h2>Ciclo de vida de obra publica</h2>
                <span className="loading-pill">Contrato backend</span>
              </div>
              <div className="lifecycle">
                {flujoObra.map((paso) => (
                  <article key={paso.estado} className="lifecycle-step">
                    <strong>{paso.estado}</strong>
                    <span>{paso.evento}</span>
                  </article>
                ))}
              </div>
            </section>

            {dashboard.status === 'success' && dashboard.data && (
              <MetricCard icon={Gauge} label="Avance promedio" value={`${dashboard.data.averagePhysicalProgress}%`} trend="fisico global" />
            )}

            <section className="panel wide">
              <div className="panel-heading">
                <h2>Cumplimiento por obra</h2>
                <span className="loading-pill">GET projects</span>
              </div>
              <ProjectProgressList projects={projects} onRetry={loadProjects} />
            </section>

            <section className="panel">
              <div className="panel-heading">
                <h2>Eventos clave</h2>
                <FileText size={18} aria-hidden="true" />
              </div>
              <ul className="event-list">
                {eventosIntegracion.slice(0, 6).map((evento) => (
                  <li key={evento.nombre}>
                    <strong>{evento.nombre}</strong>
                    <span>{evento.direccion} - {evento.modulos.join(', ')}</span>
                  </li>
                ))}
              </ul>
            </section>
          </section>
        )}

        {seccionActiva === 'obras' && (
          <section className="panel">
            <div className="panel-heading">
              <h2>Proyectos de obra</h2>
              <button type="button" disabled={!permisos.includes('crearProyecto') || busy} onClick={openCreateProjectForm}>
                <Plus size={16} aria-hidden="true" />
                Crear
              </button>
            </div>

            {projectFormMode !== 'closed' && (
              <ProjectForm
                disabled={busy}
                errors={projectErrors}
                mode={projectFormMode}
                onCancel={() => {
                  setProjectFormMode('closed')
                  setEditingProjectId(null)
                  setProjectErrors({})
                }}
                onChange={(field, value) => setProjectForm((current) => ({ ...current, [field]: value }))}
                onSubmit={handleProjectSubmit}
                value={projectForm}
              />
            )}

            {projects.status === 'loading' && <StateMessage type="loading" message="Cargando proyectos desde backend..." />}
            {projects.status === 'error' && (
              <StateMessage type="error" message={projects.message ?? 'No se pudieron cargar los proyectos.'} onRetry={loadProjects} />
            )}
            {projects.status === 'success' && projects.data && projects.data.content.length === 0 && (
              <StateMessage type="empty" message="No hay proyectos cargados en el backend." />
            )}
            {projects.status === 'success' && projects.data && projects.data.content.length > 0 && (
              <div className="table">
                {projects.data.content.map((project) => (
                  <article key={project.id} className="table-row project-row">
                    <div>
                      <strong>{project.name}</strong>
                      <span>{textOrEmpty(project.location)} - {textOrEmpty(project.scope)}</span>
                      <span>Estimado {formatMoney(project.estimatedBudget)} - {project.estimatedDurationDays} dias</span>
                    </div>
                    <StatusBadge value={projectStatusLabels[project.status] ?? project.status} />
                      <span>{project.physicalProgress}% fisico</span>
                      <span>{project.budgetProgress}% presupuesto</span>
                      {project.status === 'APROBADO' && <span>Aprobado: {formatMoney(project.approvedBudget ?? 0)} - {project.approvedDeadlineDays ?? 0} días</span>}
                    <div className="row-actions">
                      <button type="button" disabled={busy} onClick={() => void loadProjectDetail(project.id)}>
                        Detalle
                      </button>
                      <button
                        type="button"
                        disabled={!permisos.includes('modificarProyecto') || busy}
                        onClick={() => openEditProjectForm(project)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={project.status !== 'BORRADOR' || !permisos.includes('modificarProyecto') || busy}
                        onClick={() => void runAction(`submit-project-${project.id}`, 'Proyecto enviado a aprobacion.', () =>
                          obrasApi.submitProjectForApproval(project.id),
                        )}
                      >
                        Enviar
                      </button>
                      <button
                        type="button"
                        disabled={project.status !== 'PENDIENTE_APROBACION' || !permisos.includes('aprobarProyecto') || busy}
                        onClick={() => setApprovalProject(project)}
                      >
                        <CheckCircle2 size={16} aria-hidden="true" />
                        Aprobar
                      </button>
                      <button
                        type="button"
                        disabled={project.status !== 'PENDIENTE_APROBACION' || !permisos.includes('rechazarProyecto') || busy}
                        onClick={() => void runAction(`reject-project-${project.id}`, 'Proyecto rechazado.', () =>
                          obrasApi.rejectProject(project.id),
                        )}
                      >
                        Rechazar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {projectDetail && <ProjectDetail state={projectDetail} />}
            {approvalProject && (
              <ProjectApprovalForm
                disabled={busy}
                project={approvalProject}
                onCancel={() => setApprovalProject(null)}
                onSubmit={(payload) => void handleApproveProject(approvalProject, payload)}
              />
            )}
          </section>
        )}

        {seccionActiva === 'ordenes' && (
          <section className="panel">
            <div className="panel-heading stacked">
              <div>
                <h2>Ordenes de trabajo</h2>
                <p>Busqueda, filtros, paginacion y acciones contra endpoints reales.</p>
              </div>
              <button type="button" disabled={!permisos.includes('crearOrden') || busy} onClick={openCreateOrderForm}>
                <Plus size={16} aria-hidden="true" />
                Nueva orden
              </button>
            </div>

            {orderFormMode !== 'closed' && (
              <OrderForm
                crewNames={crewNames}
                projects={projects.data?.content ?? []}
                disabled={busy}
                errors={orderErrors}
                mode={orderFormMode}
                onCancel={() => {
                  setOrderFormMode('closed')
                  setEditingOrderId(null)
                  setOrderErrors({})
                }}
                onChange={(field, value) => setOrderForm((current) => ({ ...current, [field]: value }))}
                onSubmit={handleOrderSubmit}
                value={orderForm}
              />
            )}

            <div className="filters">
              <label className="search-box">
                <Search size={17} aria-hidden="true" />
                <input
                  value={busqueda}
                  onChange={(event) => {
                    setBusqueda(event.target.value)
                    setPagina(1)
                  }}
                  placeholder="Buscar por ubicacion, tipo, origen o sourceRequestId"
                />
              </label>
              <select
                value={estadoOrden}
                onChange={(event) => {
                  setEstadoOrden(event.target.value as 'TODOS' | WorkOrderStatus)
                  setPagina(1)
                }}
              >
                <option value="TODOS">Todos los estados</option>
                {workOrderStatusOptions.map((status) => (
                  <option key={status} value={status}>{workOrderStatusLabels[status]}</option>
                ))}
              </select>
              <select
                value={origenOrden}
                onChange={(event) => {
                  setOrigenOrden(event.target.value as 'TODOS' | WorkOrderOrigin)
                  setPagina(1)
                }}
              >
                <option value="TODOS">Todos los orígenes</option>
                {Object.entries(originLabels).map(([origin, label]) => (
                  <option key={origin} value={origin}>{label}</option>
                ))}
              </select>
            </div>

            {orders.status === 'loading' && <StateMessage type="loading" message="Cargando ordenes desde backend..." />}
            {orders.status === 'error' && (
              <StateMessage type="error" message={orders.message ?? 'No se pudieron cargar las ordenes.'} onRetry={loadOrders} />
            )}
            {orders.status === 'success' && orders.data && orders.data.content.length === 0 && (
              <StateMessage type="empty" message="No hay ordenes para los filtros seleccionados." />
            )}
            {orders.status === 'success' && orders.data && orders.data.content.length > 0 && (
              <div className="table">
                {orders.data.content.map((order) => (
                  <article key={order.id} className="table-row order-row">
                    <div>
                      <strong>OT #{order.id} - {order.description}</strong>
                      <span>{textOrEmpty(order.location)} - {textOrEmpty(order.interventionType)} - {order.scheduledDate ?? 'Sin fecha'}</span>
                      <span>{originLabels[order.origin]} - {order.sourceRequestId ?? 'Sin origen externo'} - {order.estimatedDurationHours ?? 0} h estimadas</span>
                      {order.projectId && <span>Proyecto asociado: #{order.projectId}</span>}
                    </div>
                    <PriorityBadge value={order.priority} />
                    <StatusBadge value={workOrderStatusLabels[order.status]} />
                    <span>{order.crew ?? 'Sin cuadrilla'}</span>
                    <span>{order.outcome ?? (order.hasEvidence ? 'Con evidencia' : 'Sin evidencia')}</span>
                    <div className="row-actions">
                      <button type="button" disabled={busy} onClick={() => void loadOrderDetail(order.id)}>
                        Detalle
                      </button>
                      <button type="button" disabled={!permisos.includes('crearOrden') || busy} onClick={() => openEditOrderForm(order)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        aria-label="Programar orden"
                        title="Programar"
                        disabled={!permisos.includes('programarOrden') || !canScheduleOrder(order.status) || busy}
                        onClick={() => void handleScheduleOrder(order)}
                      >
                        <Clock3 size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label="Iniciar orden"
                        title="Iniciar"
                        disabled={!permisos.includes('iniciarOrden') || !canStartOrder(order.status, order.crew) || pendingClosuresByOrder.has(order.id) || busy}
                        onClick={() => void runAction(`start-order-${order.id}`, 'Orden iniciada.', () =>
                          obrasApi.startWorkOrder(order.id),
                        )}
                      >
                        <PlayCircle size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label="Pausar orden"
                        title="Pausar"
                        disabled={!permisos.includes('pausarOrden') || order.status !== 'EN_EJECUCION' || busy}
                        onClick={() => void runAction(`pause-order-${order.id}`, 'Orden pausada.', () =>
                          obrasApi.pauseWorkOrder(order.id),
                        )}
                      >
                        <PauseCircle size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label="Completar orden"
                        title="Completar"
                        disabled={!permisos.includes('finalizarOrden') || !canCompleteOrder(order.status) || busy}
                        onClick={() => void handleCompleteOrder(order)}
                      >
                        <CheckCircle2 size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label="Validar orden"
                        title="Validar"
                        disabled={!permisos.includes('validarOrden') || order.status !== 'COMPLETADA' || busy}
                        onClick={() => void handleValidateOrder(order)}
                      >
                        <ShieldCheck size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <footer className="pagination">
              <button type="button" onClick={() => setPagina((actual) => Math.max(1, actual - 1))} disabled={pagina === 1 || busy}>
                Anterior
              </button>
              <span>Pagina {pagina} de {totalPaginas}</span>
              <button
                type="button"
                onClick={() => setPagina((actual) => Math.min(totalPaginas, actual + 1))}
                disabled={pagina === totalPaginas || busy}
              >
                Siguiente
              </button>
            </footer>

            {orderDetail && <OrderDetail state={orderDetail} />}
          </section>
        )}

        {seccionActiva === 'recursos' && (
          <section className="resource-grid">
            {resources.status === 'loading' && <StateMessage type="loading" message="Cargando recursos desde backend..." />}
            {resources.status === 'error' && (
              <StateMessage type="error" message={resources.message ?? 'No se pudieron cargar los recursos.'} onRetry={loadResources} />
            )}
            {resources.status === 'success' && resourceCards.length === 0 && (
              <StateMessage type="empty" message="No hay recursos cargados en el backend." />
            )}
            {resources.status === 'success' && resourceCards.map((resource) => (
              <article key={resource.id} className="panel resource-card">
                <div className="resource-icon">
                  {resource.type.startsWith('Cuadrilla') ? <Users aria-hidden="true" /> : <Hammer aria-hidden="true" />}
                </div>
                <strong>{resource.name}</strong>
                <span>{resource.type}</span>
                <StatusBadge value={resource.detail} />
                <small className="blocked-note">Disponibilidad y carga quedan bloqueadas por backend.</small>
              </article>
            ))}
          </section>
        )}

        {seccionActiva === 'cortes' && (
          <section className="panel">
            <div className="panel-heading">
              <h2>Solicitudes de corte de calle</h2>
              <button
                type="button"
                disabled={!permisos.includes('solicitarCorte') || busy}
                onClick={() => setClosureFormOpen(true)}
              >
                <Plus size={16} aria-hidden="true" />
                Solicitar
              </button>
            </div>

            {closureFormOpen && (
              <ClosureForm
                disabled={busy}
                errors={closureErrors}
                onCancel={() => {
                  setClosureFormOpen(false)
                  setClosureErrors({})
                }}
                onChange={(field, value) => setClosureForm((current) => ({ ...current, [field]: value }))}
                onSubmit={handleClosureSubmit}
                value={closureForm}
              />
            )}

            {closures.status === 'loading' && <StateMessage type="loading" message="Cargando cortes desde backend..." />}
            {closures.status === 'error' && (
              <StateMessage type="error" message={closures.message ?? 'No se pudieron cargar los cortes.'} onRetry={loadClosures} />
            )}
            {closures.status === 'success' && closures.data && closures.data.content.length === 0 && (
              <StateMessage type="empty" message="No hay solicitudes de corte cargadas en el backend." />
            )}
            {closures.status === 'success' && closures.data && closures.data.content.length > 0 && (
              <div className="timeline">
                {closures.data.content.map((closure) => (
                  <article key={closure.id} className="timeline-item">
                    <Clock3 size={18} aria-hidden="true" />
                    <div>
                      <strong>{closure.closureRequestId} - OT #{closure.workOrderId}</strong>
                      <span>{closure.location}</span>
                      <span>{closure.affectedSections.join(', ')}</span>
                    </div>
                    <span>{closure.requestedFrom} al {closure.requestedTo}</span>
                    <StatusBadge value={formatBackendLabel(closure.status)} />
                  </article>
                ))}
              </div>
            )}
            <p className="blocked-note">Autorizacion o rechazo de Transito queda bloqueado por backend/integracion externa.</p>
          </section>
        )}

        {seccionActiva === 'integraciones' && (
          <section className="panel">
            <div className="panel-heading stacked">
              <div>
                <h2>Eventos e integraciones</h2>
                <p>La integracion completa entre modulos queda fuera de esta primera entrega.</p>
              </div>
              <span className="loading-pill">Bloqueado por backend externo</span>
            </div>
            <div className="integration-table">
              {eventosIntegracion.map((evento) => (
                <article key={evento.nombre} className="integration-row">
                  <div>
                    <strong>{evento.nombre}</strong>
                    {evento.nota && <small>{evento.nota}</small>}
                  </div>
                  <StatusBadge value={evento.direccion} />
                  <span>{evento.modulos.join(', ')}</span>
                  <p>{evento.descripcion}</p>
                  <code>{evento.payload.join(', ')}</code>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

const titulos: Record<Seccion, string> = {
  dashboard: 'Tablero operativo',
  obras: 'Gestion de proyectos',
  ordenes: 'Ordenes de trabajo',
  recursos: 'Cuadrillas y recursos',
  cortes: 'Cortes de calle',
  integraciones: 'Integraciones del modulo',
}

const flujoObra = [
  { estado: 'Borrador', evento: 'BORRADOR' },
  { estado: 'Pendiente de aprobacion', evento: 'PENDIENTE_APROBACION' },
  { estado: 'Aprobado', evento: 'SIN_INICIAR' },
  { estado: 'En ejecucion', evento: 'EN_EJECUCION' },
  { estado: 'Pausada', evento: 'PAUSADA' },
  { estado: 'Finalizada', evento: 'FINALIZADA' },
]

const workOrderStatusOptions: WorkOrderStatus[] = [
  'PENDIENTE',
  'PROGRAMADA',
  'ASIGNADA',
  'EN_EJECUCION',
  'PAUSADA',
  'COMPLETADA',
  'VALIDADA',
  'REABIERTA',
]

function LoginScreen({ onLogin }: { onLogin: (session: AuthSession) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!username.trim() || !password) {
      setError('Ingresá usuario y contraseña.')
      return
    }
    setPending(true)
    setError('')
    try {
      const login = await obrasApi.login(username.trim(), password)
      onLogin({ name: login.username, role: login.role, accessToken: login.accessToken })
    } catch (loginError) {
      setError(getErrorMessage(loginError))
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" noValidate onSubmit={submit}>
        <Construction aria-hidden="true" />
        <p className="eyebrow">Municipalidad UADE</p>
        <h1>Obras Públicas</h1>
        <p>Ingresá con las credenciales asignadas para operar el módulo.</p>
        <label>
          Nombre de usuario
          <input autoComplete="username" autoFocus value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label>
          Contraseña
          <input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error && <p className="field-error" role="alert">{error}</p>}
        <button type="submit" disabled={pending}>{pending ? 'Ingresando...' : 'Ingresar'}</button>
        <small>El rol se obtiene del token emitido por el backend.</small>
      </form>
    </main>
  )
}

function ProjectApprovalForm({
  disabled,
  project,
  onCancel,
  onSubmit,
}: {
  disabled: boolean
  project: ProyectoObra
  onCancel: () => void
  onSubmit: (payload: ProjectApprovalPayload) => void
}) {
  const [approvedBudget, setApprovedBudget] = useState(String(project.approvedBudget ?? project.estimatedBudget))
  const [approvedDeadlineDays, setApprovedDeadlineDays] = useState(String(project.approvedDeadlineDays ?? project.estimatedDurationDays))
  const [approvedAt, setApprovedAt] = useState(new Date().toISOString().slice(0, 10))
  const [observations, setObservations] = useState('')
  const [error, setError] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors = validateProjectApproval({ approvedBudget, approvedDeadlineDays, approvedAt, observations })
    if (hasErrors(errors)) {
      setError(Object.values(errors)[0])
      return
    }
    onSubmit({
      approvedBudget: Number(approvedBudget),
      approvedDeadlineDays: Number(approvedDeadlineDays),
      approvedAt,
      ...(optionalText(observations) ? { observations: observations.trim() } : {}),
    })
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="approval-modal" aria-modal="true" noValidate onSubmit={submit} role="dialog" aria-labelledby="approval-title">
        <div className="form-heading">
          <div>
            <h2 id="approval-title">Aprobar proyecto</h2>
            <p>{project.name}</p>
          </div>
          <button type="button" disabled={disabled} onClick={onCancel}>Cancelar</button>
        </div>
        <label>
          Presupuesto aprobado
          <input min="0.01" required step="0.01" type="number" value={approvedBudget} onChange={(event) => setApprovedBudget(event.target.value)} />
        </label>
        <label>
          Plazo aprobado (días)
          <input min="1" required type="number" value={approvedDeadlineDays} onChange={(event) => setApprovedDeadlineDays(event.target.value)} />
        </label>
        <label>
          Fecha de aprobación
          <input required type="date" value={approvedAt} onChange={(event) => setApprovedAt(event.target.value)} />
        </label>
        <label>
          Observaciones
          <textarea maxLength={1000} value={observations} onChange={(event) => setObservations(event.target.value)} />
        </label>
        {error && <p className="field-error" role="alert">{error}</p>}
        <button type="submit" disabled={disabled}>{disabled ? 'Aprobando...' : 'Confirmar aprobación'}</button>
      </form>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, trend }: { icon: typeof BarChart3; label: string; value: string; trend: string }) {
  return (
    <article className="metric-card">
      <Icon size={22} aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{trend}</small>
    </article>
  )
}

function ProjectProgressList({ projects, onRetry }: { projects: RemoteState<PageResponse<ProyectoObra>>; onRetry: () => void }) {
  if (projects.status === 'loading') {
    return <StateMessage type="loading" message="Cargando avances..." />
  }

  if (projects.status === 'error') {
    return <StateMessage type="error" message={projects.message ?? 'No se pudieron cargar los avances.'} onRetry={onRetry} />
  }

  if (!projects.data || projects.data.content.length === 0) {
    return <StateMessage type="empty" message="Sin proyectos para mostrar." />
  }

  return (
    <div className="progress-list">
      {projects.data.content.map((project) => (
        <article key={project.id} className="progress-row">
          <div>
            <strong>{project.name}</strong>
            <span>{textOrEmpty(project.location)} - {textOrEmpty(project.technicalManager)}</span>
          </div>
          <div className="bar" aria-label={`Avance ${project.physicalProgress}%`}>
            <span style={{ width: `${project.physicalProgress}%` }} />
          </div>
          <b>{project.physicalProgress}%</b>
        </article>
      ))}
    </div>
  )
}

function StateMessage({ type, message, onRetry }: { type: 'loading' | 'error' | 'empty'; message: string; onRetry?: () => void }) {
  return (
    <div className={`state-message ${type}`}>
      <span>{message}</span>
      {onRetry && <button type="button" onClick={onRetry}>Reintentar</button>}
    </div>
  )
}

function ProjectDetail({ state }: { state: RemoteState<ProyectoObra> }) {
  if (state.status === 'loading') {
    return <StateMessage type="loading" message="Cargando detalle del proyecto..." />
  }

  if (state.status === 'error') {
    return <StateMessage type="error" message={state.message ?? 'No se pudo cargar el detalle.'} />
  }

  if (!state.data) {
    return null
  }

  return (
    <section className="detail-panel">
      <h2>Detalle de proyecto #{state.data.id}</h2>
      <dl>
        <dt>Nombre</dt>
        <dd>{state.data.name}</dd>
        <dt>Descripcion</dt>
        <dd>{textOrEmpty(state.data.description)}</dd>
        <dt>Responsable</dt>
        <dd>{textOrEmpty(state.data.technicalManager)}</dd>
        <dt>Contratista</dt>
        <dd>{textOrEmpty(state.data.contractor)}</dd>
        <dt>Estado</dt>
        <dd>{projectStatusLabels[state.data.status] ?? state.data.status}</dd>
        <dt>Presupuesto aprobado</dt>
        <dd>{state.data.approvedBudget ? formatMoney(state.data.approvedBudget) : 'Sin aprobar'}</dd>
        <dt>Plazo aprobado</dt>
        <dd>{state.data.approvedDeadlineDays ? `${state.data.approvedDeadlineDays} días` : 'Sin aprobar'}</dd>
        <dt>Fecha de aprobación</dt>
        <dd>{state.data.approvedAt ?? 'Sin aprobar'}</dd>
        <dt>Observaciones de aprobación</dt>
        <dd>{textOrEmpty(state.data.approvalObservations)}</dd>
      </dl>
    </section>
  )
}

function OrderDetail({ state }: { state: RemoteState<OrdenTrabajo> }) {
  if (state.status === 'loading') {
    return <StateMessage type="loading" message="Cargando detalle de la orden..." />
  }

  if (state.status === 'error') {
    return <StateMessage type="error" message={state.message ?? 'No se pudo cargar el detalle.'} />
  }

  if (!state.data) {
    return null
  }

  return (
    <section className="detail-panel">
      <h2>Detalle de OT #{state.data.id}</h2>
      <dl>
        <dt>Descripcion</dt>
        <dd>{state.data.description}</dd>
        <dt>Origen</dt>
        <dd>{originLabels[state.data.origin]}</dd>
        <dt>Proyecto asociado</dt>
        <dd>{state.data.projectId ? `Proyecto #${state.data.projectId}` : 'No asociado'}</dd>
        <dt>Ubicacion</dt>
        <dd>{textOrEmpty(state.data.location)}</dd>
        <dt>Estado</dt>
        <dd>{workOrderStatusLabels[state.data.status]}</dd>
        <dt>Cuadrilla</dt>
        <dd>{textOrEmpty(state.data.crew)}</dd>
      </dl>
    </section>
  )
}

function ProjectForm({
  disabled,
  errors,
  mode,
  onCancel,
  onChange,
  onSubmit,
  value,
}: {
  disabled: boolean
  errors: FormErrors
  mode: 'create' | 'edit'
  onCancel: () => void
  onChange: (field: keyof ProjectFormState, value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  value: ProjectFormState
}) {
  return (
    <form className="inline-form" noValidate onSubmit={onSubmit}>
      <div className="form-heading">
        <h2>{mode === 'edit' ? 'Editar proyecto' : 'Crear proyecto'}</h2>
        <button type="button" onClick={onCancel} disabled={disabled}>Cancelar</button>
      </div>
      <div className="form-grid">
        <label>
          Nombre
          <input aria-invalid={Boolean(errors.name)} required value={value.name} onChange={(event) => onChange('name', event.target.value)} />
          {errors.name && <small className="field-error">{errors.name}</small>}
        </label>
        <label>
          Ubicacion
          <input aria-invalid={Boolean(errors.location)} required value={value.location} onChange={(event) => onChange('location', event.target.value)} />
          {errors.location && <small className="field-error">{errors.location}</small>}
        </label>
        <label>
          Presupuesto estimado
          <input required min="1" type="number" value={value.estimatedBudget} onChange={(event) => onChange('estimatedBudget', event.target.value)} />
          {errors.estimatedBudget && <small className="field-error">{errors.estimatedBudget}</small>}
        </label>
        <label>
          Fecha estimada
          <input required type="date" value={value.estimatedStartDate} onChange={(event) => onChange('estimatedStartDate', event.target.value)} />
          {errors.estimatedStartDate && <small className="field-error">{errors.estimatedStartDate}</small>}
        </label>
        <label>
          Duracion dias
          <input required min="1" type="number" value={value.estimatedDurationDays} onChange={(event) => onChange('estimatedDurationDays', event.target.value)} />
          {errors.estimatedDurationDays && <small className="field-error">{errors.estimatedDurationDays}</small>}
        </label>
        <label>
          Responsable tecnico
          <input aria-invalid={Boolean(errors.technicalManager)} required value={value.technicalManager} onChange={(event) => onChange('technicalManager', event.target.value)} />
          {errors.technicalManager && <small className="field-error">{errors.technicalManager}</small>}
        </label>
        <label>
          Presupuesto usado
          <input min="0" type="number" value={value.usedBudget} onChange={(event) => onChange('usedBudget', event.target.value)} />
        </label>
        <label>
          Avance fisico
          <input max="100" min="0" type="number" value={value.physicalProgress} onChange={(event) => onChange('physicalProgress', event.target.value)} />
        </label>
        <label>
          Contratista
          <input value={value.contractor} onChange={(event) => onChange('contractor', event.target.value)} />
        </label>
        <label className="wide-field">
          Alcance
          <textarea aria-invalid={Boolean(errors.scope)} required value={value.scope} onChange={(event) => onChange('scope', event.target.value)} />
          {errors.scope && <small className="field-error">{errors.scope}</small>}
        </label>
        <label className="wide-field">
          Descripcion
          <textarea value={value.description} onChange={(event) => onChange('description', event.target.value)} />
        </label>
      </div>
      <button type="submit" disabled={disabled}>{mode === 'edit' ? 'Guardar cambios' : 'Crear proyecto'}</button>
    </form>
  )
}

function OrderForm({
  crewNames,
  projects,
  disabled,
  errors,
  mode,
  onCancel,
  onChange,
  onSubmit,
  value,
}: {
  crewNames: string[]
  projects: ProyectoObra[]
  disabled: boolean
  errors: FormErrors
  mode: 'create' | 'edit'
  onCancel: () => void
  onChange: (field: keyof OrderFormState, value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  value: OrderFormState
}) {
  return (
    <form className="inline-form" noValidate onSubmit={onSubmit}>
      <div className="form-heading">
        <h2>{mode === 'edit' ? 'Editar orden' : 'Crear orden'}</h2>
        <button type="button" onClick={onCancel} disabled={disabled}>Cancelar</button>
      </div>
      <div className="form-grid">
        <label>
          Origen
          <select value={value.origin} onChange={(event) => {
            onChange('origin', event.target.value)
            if (event.target.value !== 'PROYECTO') onChange('projectId', '')
          }}>
            <option value="MANUAL">Manual</option>
            <option value="ATENCION_CIUDADANA">Atencion Ciudadana</option>
            <option value="INSPECCION">Inspeccion</option>
            <option value="PROYECTO">Proyecto</option>
          </select>
        </label>
        {value.origin === 'PROYECTO' && (
          <label>
            Proyecto asociado
            <select required value={value.projectId} onChange={(event) => onChange('projectId', event.target.value)}>
              <option value="">Seleccionar proyecto</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            {errors.projectId && <small className="field-error">{errors.projectId}</small>}
          </label>
        )}
        <label>
          Prioridad
          <select value={value.priority} onChange={(event) => onChange('priority', event.target.value)}>
            <option value="BAJA">Baja</option>
            <option value="MEDIA">Media</option>
            <option value="ALTA">Alta</option>
          </select>
        </label>
        <label>
          Source request ID
          <input value={value.sourceRequestId} onChange={(event) => onChange('sourceRequestId', event.target.value)} />
          {errors.sourceRequestId && <small className="field-error">{errors.sourceRequestId}</small>}
        </label>
        <label>
          Tipo de intervencion
          <input value={value.interventionType} onChange={(event) => onChange('interventionType', event.target.value)} />
          {errors.interventionType && <small className="field-error">{errors.interventionType}</small>}
        </label>
        <label>
          Ubicacion
          <input value={value.location} onChange={(event) => onChange('location', event.target.value)} />
          {errors.location && <small className="field-error">{errors.location}</small>}
        </label>
        <label>
          Duracion horas
          <input required min="1" type="number" value={value.estimatedDurationHours} onChange={(event) => onChange('estimatedDurationHours', event.target.value)} />
          {errors.estimatedDurationHours && <small className="field-error">{errors.estimatedDurationHours}</small>}
        </label>
        <label>
          Cuadrilla
          <select value={value.crew} onChange={(event) => onChange('crew', event.target.value)}>
            <option value="">Seleccionar cuadrilla</option>
            {crewNames.map((crew) => <option key={crew} value={crew}>{crew}</option>)}
          </select>
          {errors.crew && <small className="field-error">{errors.crew}</small>}
        </label>
        <label className="wide-field">
          Descripcion
          <textarea required value={value.description} onChange={(event) => onChange('description', event.target.value)} />
        </label>
      </div>
      <button type="submit" disabled={disabled}>{mode === 'edit' ? 'Guardar cambios' : 'Crear orden'}</button>
    </form>
  )
}

function ClosureForm({
  disabled,
  errors,
  onCancel,
  onChange,
  onSubmit,
  value,
}: {
  disabled: boolean
  errors: FormErrors
  onCancel: () => void
  onChange: (field: keyof ClosureFormState, value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  value: ClosureFormState
}) {
  return (
    <form className="inline-form" noValidate onSubmit={onSubmit}>
      <div className="form-heading">
        <h2>Solicitar corte</h2>
        <button type="button" onClick={onCancel} disabled={disabled}>Cancelar</button>
      </div>
      <div className="form-grid">
        <label>
          ID de orden
          <input required min="1" type="number" value={value.workOrderId} onChange={(event) => onChange('workOrderId', event.target.value)} />
          {errors.workOrderId && <small className="field-error">{errors.workOrderId}</small>}
        </label>
        <label>
          Ubicacion
          <input required value={value.location} onChange={(event) => onChange('location', event.target.value)} />
          {errors.location && <small className="field-error">{errors.location}</small>}
        </label>
        <label>
          Desde
          <input required type="date" value={value.requestedFrom} onChange={(event) => onChange('requestedFrom', event.target.value)} />
          {errors.requestedFrom && <small className="field-error">{errors.requestedFrom}</small>}
        </label>
        <label>
          Hasta
          <input required type="date" value={value.requestedTo} onChange={(event) => onChange('requestedTo', event.target.value)} />
          {errors.requestedTo && <small className="field-error">{errors.requestedTo}</small>}
        </label>
        <label className="wide-field">
          Tramos afectados
          <input
            required
            placeholder="Av. Lima 700-760, Estados Unidos 900-960"
            value={value.affectedSections}
            onChange={(event) => onChange('affectedSections', event.target.value)}
          />
          {errors.affectedSections && <small className="field-error">{errors.affectedSections}</small>}
        </label>
        <label className="wide-field">
          Motivo
          <textarea required value={value.reason} onChange={(event) => onChange('reason', event.target.value)} />
          {errors.reason && <small className="field-error">{errors.reason}</small>}
        </label>
      </div>
      <button type="submit" disabled={disabled}>Crear solicitud</button>
    </form>
  )
}

function StatusBadge({ value }: { value: string }) {
  return <span className="badge status">{value}</span>
}

function PriorityBadge({ value }: { value: Prioridad }) {
  return <span className={`badge priority ${value.toLowerCase()}`}>{value}</span>
}

function emptyProjectForm(): ProjectFormState {
  return {
    name: '',
    description: '',
    scope: '',
    location: '',
    estimatedBudget: '',
    approvedBudget: '',
    usedBudget: '',
    estimatedStartDate: '',
    estimatedDurationDays: '',
    approvedDeadlineDays: '',
    physicalProgress: '',
    technicalManager: '',
    contractor: '',
  }
}

function emptyOrderForm(): OrderFormState {
  return {
    sourceRequestId: '',
    origin: 'MANUAL',
    projectId: '',
    description: '',
    interventionType: '',
    location: '',
    priority: 'MEDIA',
    estimatedDurationHours: '',
    crew: '',
  }
}

function emptyClosureForm(): ClosureFormState {
  return {
    workOrderId: '',
    location: '',
    affectedSections: '',
    requestedFrom: '',
    requestedTo: '',
    reason: '',
  }
}

function projectToForm(project: ProyectoObra): ProjectFormState {
  return {
    name: project.name,
    description: project.description ?? '',
    scope: project.scope ?? '',
    location: project.location ?? '',
    estimatedBudget: String(project.estimatedBudget),
    approvedBudget: project.approvedBudget ? String(project.approvedBudget) : '',
    usedBudget: '',
    estimatedStartDate: project.estimatedStartDate,
    estimatedDurationDays: String(project.estimatedDurationDays),
    approvedDeadlineDays: project.approvedDeadlineDays ? String(project.approvedDeadlineDays) : '',
    physicalProgress: String(project.physicalProgress),
    technicalManager: project.technicalManager ?? '',
    contractor: project.contractor ?? '',
  }
}

function orderToForm(order: OrdenTrabajo): OrderFormState {
  return {
    sourceRequestId: order.sourceRequestId ?? '',
    origin: order.origin,
    projectId: order.projectId ? String(order.projectId) : '',
    description: order.description,
    interventionType: order.interventionType ?? '',
    location: order.location ?? '',
    priority: order.priority,
    estimatedDurationHours: order.estimatedDurationHours ? String(order.estimatedDurationHours) : '',
    crew: order.crew ?? '',
  }
}

function buildProjectPayload(form: ProjectFormState): ProyectoObraPayload {
  return {
    name: form.name.trim(),
    ...(optionalText(form.description) ? { description: form.description.trim() } : {}),
    ...(optionalText(form.scope) ? { scope: form.scope.trim() } : {}),
    ...(optionalText(form.location) ? { location: form.location.trim() } : {}),
    estimatedBudget: Number(form.estimatedBudget),
    ...(optionalNumber(form.usedBudget) !== undefined ? { usedBudget: Number(form.usedBudget) } : {}),
    estimatedStartDate: form.estimatedStartDate,
    estimatedDurationDays: Number(form.estimatedDurationDays),
    ...(optionalNumber(form.physicalProgress) !== undefined ? { physicalProgress: Number(form.physicalProgress) } : {}),
    ...(optionalText(form.technicalManager) ? { technicalManager: form.technicalManager.trim() } : {}),
    ...(optionalText(form.contractor) ? { contractor: form.contractor.trim() } : {}),
  }
}

function buildOrderPayload(form: OrderFormState) {
  return {
    ...(optionalText(form.sourceRequestId) ? { sourceRequestId: form.sourceRequestId.trim() } : {}),
    origin: form.origin,
    ...(form.origin === 'PROYECTO' ? { projectId: Number(form.projectId) } : { projectId: null }),
    description: form.description.trim(),
    ...(optionalText(form.interventionType) ? { interventionType: form.interventionType.trim() } : {}),
    ...(optionalText(form.location) ? { location: form.location.trim() } : {}),
    priority: form.priority,
    ...(optionalNumber(form.estimatedDurationHours) !== undefined ? { estimatedDurationHours: Number(form.estimatedDurationHours) } : {}),
    ...(optionalText(form.crew) ? { crew: form.crew.trim() } : {}),
  }
}

function buildClosurePayload(form: ClosureFormState) {
  return {
    workOrderId: Number(form.workOrderId),
    location: form.location.trim(),
    affectedSections: form.affectedSections.split(',').map((section) => section.trim()).filter(Boolean),
    requestedFrom: form.requestedFrom,
    requestedTo: form.requestedTo,
    reason: form.reason.trim(),
  }
}

function optionalText(value: string) {
  return value.trim() || undefined
}

function optionalNumber(value: string) {
  const trimmed = value.trim()
  return trimmed ? Number(trimmed) : undefined
}

function textOrEmpty(value?: string | null) {
  return value?.trim() || 'Sin datos'
}

function canScheduleOrder(status: WorkOrderStatus) {
  return status === 'PENDIENTE' || status === 'PROGRAMADA' || status === 'ASIGNADA'
}

function canStartOrder(status: WorkOrderStatus, crew?: string | null) {
  return Boolean(crew?.trim()) && (status === 'PROGRAMADA' || status === 'ASIGNADA' || status === 'PAUSADA' || status === 'REABIERTA')
}

function canCompleteOrder(status: WorkOrderStatus) {
  return status === 'EN_EJECUCION' || status === 'PAUSADA'
}

function formatBackendLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function isClosureAuthorized(status: string) {
  return status === 'AUTORIZADO' || status === 'AUTHORIZED'
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const details = error.details?.length ? ` (${error.details.join(', ')})` : ''
    return `${error.message}${details}`
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Ocurrio un error inesperado.'
}

function restoreSession(): AuthSession | null {
  try {
    const raw = window.sessionStorage.getItem('obras-publicas-session')
    if (!raw) return null
    const session = JSON.parse(raw) as AuthSession
    return session.name && session.accessToken && permisosPorRol[session.role] ? session : null
  } catch {
    return null
  }
}

function roleLabel(role: Rol) {
  return {
    PERSONAL_OBRAS: 'Personal de Obras Públicas',
    INGENIERO_ARQUITECTO: 'Ingeniero o Arquitecto',
    RESPONSABLE_AUTORIZADO: 'Responsable autorizado',
    JEFE_CUADRILLA: 'Jefe de cuadrilla',
    OPERARIO_CONTRATISTA: 'Operario o contratista',
    INSPECTOR_OBRA: 'Inspector de obra',
  }[role]
}

export default App
