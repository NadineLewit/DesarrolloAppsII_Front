import { env } from '../config/env'
import type {
  CompleteOTPayload,
  CorteCalle,
  CorteCallePayload,
  DashboardSummary,
  OrdenTrabajo,
  OrdenTrabajoPayload,
  PageResponse,
  ProjectStatus,
  ProyectoObra,
  ProyectoObraPayload,
  ResourcesSummary,
  ScheduleOTPayload,
  ValidateOTPayload,
  WorkOrderOrigin,
  WorkOrderPriority,
  WorkOrderStatus,
} from '../types'

type QueryValue = string | number | boolean | null | undefined
type QueryParams = Record<string, QueryValue>

type ApiErrorBody = {
  message?: string
  code?: string
  details?: string[]
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  params?: QueryParams
}

export class ApiError extends Error {
  status: number
  code?: string
  details?: string[]

  constructor(message: string, status: number, code?: string, details?: string[]) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

function buildUrl(path: string, params?: QueryParams) {
  const base = env.apiBaseUrl.replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${base}${normalizedPath}`, window.location.origin)

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })

  return url.toString()
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  if (!text) {
    return undefined as T
  }
  return JSON.parse(text) as T
}

async function request<T>(path: string, options: RequestOptions = {}) {
  const headers = new Headers(options.headers)
  const hasBody = options.body !== undefined

  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(buildUrl(path, options.params), {
    ...options,
    headers,
    body: hasBody ? JSON.stringify(options.body) : undefined,
  })

  const contentType = response.headers.get('Content-Type') ?? ''

  if (!response.ok) {
    let errorBody: ApiErrorBody = {}

    if (contentType.includes('application/json')) {
      try {
        errorBody = await parseResponse<ApiErrorBody>(response)
      } catch {
        errorBody = {}
      }
    }

    throw new ApiError(
      errorBody.message ?? `Error ${response.status} al comunicarse con la API`,
      response.status,
      errorBody.code,
      errorBody.details,
    )
  }

  if (!contentType.includes('application/json')) {
    throw new ApiError(
      'La API devolvio una respuesta que no es JSON. Revisa VITE_API_BASE_URL o el proxy /api del entorno.',
      response.status,
    )
  }

  return parseResponse<T>(response)
}

export type ListProjectsParams = {
  search?: string
  status?: ProjectStatus
  page?: number
  size?: number
  sort?: string
}

export type ListWorkOrdersParams = {
  search?: string
  status?: WorkOrderStatus
  priority?: WorkOrderPriority
  origin?: WorkOrderOrigin
  page?: number
  size?: number
  sort?: string
}

export type ListStreetClosuresParams = {
  page?: number
  size?: number
  sort?: string
}

export const obrasApi = {
  listProjects(params: ListProjectsParams = {}) {
    return request<PageResponse<ProyectoObra>>('/public-works/projects', { params })
  },
  getProject(id: number) {
    return request<ProyectoObra>(`/public-works/projects/${id}`)
  },
  createProject(body: ProyectoObraPayload) {
    return request<ProyectoObra>('/public-works/projects', { method: 'POST', body })
  },
  updateProject(id: number, body: ProyectoObraPayload) {
    return request<ProyectoObra>(`/public-works/projects/${id}`, { method: 'PUT', body })
  },
  submitProjectForApproval(id: number) {
    return request<ProyectoObra>(`/public-works/projects/${id}/submit-approval`, { method: 'PATCH' })
  },
  approveProject(id: number) {
    return request<ProyectoObra>(`/public-works/projects/${id}/approve`, { method: 'PATCH' })
  },
  rejectProject(id: number) {
    return request<ProyectoObra>(`/public-works/projects/${id}/reject`, { method: 'PATCH' })
  },
  listWorkOrders(params: ListWorkOrdersParams = {}) {
    return request<PageResponse<OrdenTrabajo>>('/public-works/work-orders', { params })
  },
  getWorkOrder(id: number) {
    return request<OrdenTrabajo>(`/public-works/work-orders/${id}`)
  },
  createWorkOrder(body: OrdenTrabajoPayload) {
    return request<OrdenTrabajo>('/public-works/work-orders', { method: 'POST', body })
  },
  updateWorkOrder(id: number, body: OrdenTrabajoPayload) {
    return request<OrdenTrabajo>(`/public-works/work-orders/${id}`, { method: 'PUT', body })
  },
  scheduleWorkOrder(id: number, body: ScheduleOTPayload) {
    return request<OrdenTrabajo>(`/public-works/work-orders/${id}/schedule`, { method: 'PATCH', body })
  },
  startWorkOrder(id: number) {
    return request<OrdenTrabajo>(`/public-works/work-orders/${id}/start`, { method: 'PATCH' })
  },
  pauseWorkOrder(id: number) {
    return request<OrdenTrabajo>(`/public-works/work-orders/${id}/pause`, { method: 'PATCH' })
  },
  completeWorkOrder(id: number, body: CompleteOTPayload = {}) {
    return request<OrdenTrabajo>(`/public-works/work-orders/${id}/complete`, { method: 'PATCH', body })
  },
  validateWorkOrder(id: number, body: ValidateOTPayload) {
    return request<OrdenTrabajo>(`/public-works/work-orders/${id}/validate`, { method: 'PATCH', body })
  },
  getDashboardSummary() {
    return request<DashboardSummary>('/public-works/dashboard/summary')
  },
  getResources() {
    return request<ResourcesSummary>('/public-works/resources')
  },
  listStreetClosures(params: ListStreetClosuresParams = {}) {
    return request<PageResponse<CorteCalle>>('/public-works/street-closures', { params })
  },
  createStreetClosure(body: CorteCallePayload) {
    return request<CorteCalle>('/public-works/street-closures', { method: 'POST', body })
  },
}
