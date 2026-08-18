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
  Network,
  PauseCircle,
  PlayCircle,
  Plus,
  Search,
  ShieldCheck,
  Truck,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { env } from './config/env'
import { eventosIntegracion, modulosIntegracion } from './contracts/integrations'
import { cortes, estadoLabels, obras, ordenes, permisosPorRol, recursos } from './data/mockData'
import type { EstadoOrden, Prioridad, Rol, Seccion } from './types'
import { formatMoney } from './utils/formatters'
import { filtrarOrdenes, paginar } from './utils/orders'
import './App.css'

function App() {
  const [seccionActiva, setSeccionActiva] = useState<Seccion>('dashboard')
  const [rol, setRol] = useState<Rol>('PERSONAL_OBRAS')
  const [busqueda, setBusqueda] = useState('')
  const [estadoOrden, setEstadoOrden] = useState<'TODOS' | EstadoOrden>('TODOS')
  const [pagina, setPagina] = useState(1)

  const ordenesFiltradas = useMemo(() => filtrarOrdenes(ordenes, busqueda, estadoOrden), [busqueda, estadoOrden])

  const ordenesPaginadas = paginar(ordenesFiltradas, pagina, 3)
  const totalPaginas = Math.max(1, Math.ceil(ordenesFiltradas.length / 3))
  const permisos = permisosPorRol[rol]
  const obrasActivas = obras.filter((obra) => obra.estado === 'EN_EJECUCION' || obra.estado === 'APROBADA').length
  const alertasExternas = ordenes.filter((orden) => orden.origen !== 'Manual').length
  const ordenesDemoradas = ordenes.filter((orden) => orden.prioridad === 'CRITICA' || orden.estado === 'PAUSADA').length
  const avancePromedio = Math.round(obras.reduce((acc, obra) => acc + obra.avanceFisico, 0) / obras.length)

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
            <label className="role-picker">
              Rol
              <select value={rol} onChange={(event) => setRol(event.target.value as Rol)}>
                <option value="PERSONAL_OBRAS">Personal Obras Publicas</option>
                <option value="INGENIERO_ARQUITECTO">Ingeniero o Arquitecto</option>
                <option value="RESPONSABLE_AUTORIZADO">Responsable autorizado</option>
                <option value="JEFE_CUADRILLA">Jefe cuadrilla</option>
                <option value="OPERARIO_CONTRATISTA">Operario o contratista</option>
                <option value="INSPECTOR_OBRA">Inspector de obra</option>
              </select>
            </label>
          </div>
        </header>

        {seccionActiva === 'dashboard' && (
          <section className="dashboard-grid">
            <MetricCard icon={Building2} label="Obras activas" value={obrasActivas.toString()} trend="+2 esta semana" />
            <MetricCard icon={ClipboardList} label="Ordenes abiertas" value="4" trend="con sourceRequestId" />
            <MetricCard icon={Network} label="Alertas externas" value={alertasExternas.toString()} trend="M2, M6 y M7" />
            <MetricCard icon={AlertTriangle} label="Demoras detectadas" value={ordenesDemoradas.toString()} trend="requieren revision" />

            <section className="panel full">
              <div className="panel-heading">
                <h2>Mapa de integraciones</h2>
                <span className="loading-pill">Core define convenciones</span>
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
                <span className="loading-pill">Estados del alcance</span>
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

            <MetricCard icon={Gauge} label="Avance promedio" value={`${avancePromedio}%`} trend="fisico" />

            <section className="panel wide">
              <div className="panel-heading">
                <h2>Cumplimiento por obra</h2>
                <span className="loading-pill">Datos mock</span>
              </div>
              <div className="progress-list">
                {obras.map((obra) => (
                  <article key={obra.id} className="progress-row">
                    <div>
                      <strong>{obra.nombre}</strong>
                      <span>{obra.ubicacion} - {obra.responsableTecnico}</span>
                    </div>
                    <div className="bar" aria-label={`Avance ${obra.avanceFisico}%`}>
                      <span style={{ width: `${obra.avanceFisico}%` }} />
                    </div>
                    <b>{obra.avanceFisico}%</b>
                  </article>
                ))}
              </div>
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
              <button type="button" disabled={!permisos.includes('crearProyecto')}>
                <Plus size={16} aria-hidden="true" />
                Crear
              </button>
            </div>
            <div className="table">
              {obras.map((obra) => (
                <article key={obra.id} className="table-row project-row">
                  <div>
                    <strong>{obra.nombre}</strong>
                    <span>{obra.ubicacion} - {obra.alcance}</span>
                    <span>Estimado {formatMoney(obra.presupuesto)} - {obra.duracionEstimadaDias} dias</span>
                  </div>
                  <StatusBadge value={estadoLabels[obra.estado]} />
                  <span>{obra.avanceFisico}% fisico</span>
                  <span>{obra.avancePresupuestario}% presupuesto</span>
                  <button type="button" disabled={!permisos.includes('aprobarProyecto')}>
                    <CheckCircle2 size={16} aria-hidden="true" />
                    Aprobar
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {seccionActiva === 'ordenes' && (
          <section className="panel">
            <div className="panel-heading stacked">
              <div>
                <h2>Ordenes de trabajo</h2>
                <p>Busqueda, filtros, sourceRequestId, paginacion y acciones segun rol.</p>
              </div>
              <button type="button" disabled={!permisos.includes('crearOrden')}>
                <Plus size={16} aria-hidden="true" />
                Nueva orden
              </button>
            </div>

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
                  setEstadoOrden(event.target.value as 'TODOS' | EstadoOrden)
                  setPagina(1)
                }}
              >
                <option value="TODOS">Todos los estados</option>
                <option value="PROGRAMADA">Programada</option>
                <option value="ASIGNADA">Asignada</option>
                <option value="INICIADA">Iniciada</option>
                <option value="PAUSADA">Pausada</option>
                <option value="FINALIZADA">Finalizada</option>
                <option value="VALIDADA">Validada</option>
              </select>
            </div>

            <div className="table">
              {ordenesPaginadas.map((orden) => (
                <article key={orden.id} className="table-row order-row">
                  <div>
                    <strong>OT #{orden.id} - {orden.descripcion}</strong>
                    <span>{orden.ubicacion} - {orden.tipo} - {orden.fechaProgramada}</span>
                    <span>{orden.origen} - {orden.sourceRequestId} - {orden.duracionEstimadaHoras} h estimadas</span>
                  </div>
                  <PriorityBadge value={orden.prioridad} />
                  <StatusBadge value={estadoLabels[orden.estado]} />
                  <span>{orden.cuadrilla}</span>
                  <span>{orden.outcome ?? (orden.evidencia ? 'Con evidencia' : 'Sin evidencia')}</span>
                  <div className="row-actions">
                    <button type="button" aria-label="Iniciar orden" disabled={!permisos.includes('iniciarOrden')}>
                      <PlayCircle size={16} aria-hidden="true" />
                    </button>
                    <button type="button" aria-label="Pausar orden" disabled={!permisos.includes('pausarOrden')}>
                      <PauseCircle size={16} aria-hidden="true" />
                    </button>
                    <button type="button" aria-label="Validar orden" disabled={!permisos.includes('validarOrden')}>
                      <CheckCircle2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <footer className="pagination">
              <button type="button" onClick={() => setPagina((actual) => Math.max(1, actual - 1))} disabled={pagina === 1}>
                Anterior
              </button>
              <span>Pagina {pagina} de {totalPaginas}</span>
              <button
                type="button"
                onClick={() => setPagina((actual) => Math.min(totalPaginas, actual + 1))}
                disabled={pagina === totalPaginas}
              >
                Siguiente
              </button>
            </footer>
          </section>
        )}

        {seccionActiva === 'recursos' && (
          <section className="resource-grid">
            {recursos.map((recurso) => (
              <article key={recurso.nombre} className="panel resource-card">
                <div className="resource-icon">
                  {recurso.tipo === 'Cuadrilla' ? <Users aria-hidden="true" /> : <Hammer aria-hidden="true" />}
                </div>
                <strong>{recurso.nombre}</strong>
                <span>{recurso.tipo}</span>
                <StatusBadge value={recurso.disponibilidad} />
                <div className="bar"><span style={{ width: `${recurso.carga}%` }} /></div>
                <small>Carga asignada {recurso.carga}%</small>
              </article>
            ))}
          </section>
        )}

        {seccionActiva === 'cortes' && (
          <section className="panel">
            <div className="panel-heading">
              <h2>Solicitudes de corte de calle</h2>
              <button type="button" disabled={!permisos.includes('solicitarCorte')}>
                <Plus size={16} aria-hidden="true" />
                Solicitar
              </button>
            </div>
            <div className="timeline">
              {cortes.map((corte) => (
                <article key={corte.id} className="timeline-item">
                  <Clock3 size={18} aria-hidden="true" />
                  <div>
                    <strong>{corte.closureRequestId} - OT #{corte.workOrderId}</strong>
                    <span>{corte.ubicacion}</span>
                    <span>{corte.tramosAfectados.join(', ')}</span>
                  </div>
                  <span>{corte.desde} al {corte.hasta}</span>
                  <StatusBadge value={corte.estado} />
                </article>
              ))}
            </div>
          </section>
        )}

        {seccionActiva === 'integraciones' && (
          <section className="panel">
            <div className="panel-heading stacked">
              <div>
                <h2>Eventos e integraciones</h2>
                <p>Nombres y payloads tomados del backlog, guia y capturas compartidas.</p>
              </div>
              <span className="loading-pill">Sin publicar hasta confirmar backend</span>
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
  { estado: 'Borrador', evento: 'publicWorksProjectCreated' },
  { estado: 'Pendiente de aprobacion', evento: 'publicWorksProjectSubmittedForApproval' },
  { estado: 'Aprobada o Rechazada', evento: 'publicWorksProjectApproved / publicWorksProjectRejected' },
  { estado: 'En ejecucion', evento: 'publicWorksProjectStarted' },
  { estado: 'Suspendida o Reanudada', evento: 'publicWorksProjectSuspended / publicWorksProjectResumed' },
  { estado: 'Finalizada', evento: 'publicWorksProjectCompleted' },
]

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

function StatusBadge({ value }: { value: string }) {
  return <span className="badge status">{value}</span>
}

function PriorityBadge({ value }: { value: Prioridad }) {
  return <span className={`badge priority ${value.toLowerCase()}`}>{value}</span>
}

export default App
