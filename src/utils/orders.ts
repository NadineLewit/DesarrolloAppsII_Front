import type { OrdenTrabajo, WorkOrderStatus } from '../types'

export function filtrarOrdenes(
  ordenes: OrdenTrabajo[],
  busqueda: string,
  estadoOrden: 'TODOS' | WorkOrderStatus,
) {
  const normalizada = busqueda.trim().toLowerCase()

  return ordenes.filter((orden) => {
    const coincideBusqueda =
      orden.description.toLowerCase().includes(normalizada) ||
      (orden.location ?? '').toLowerCase().includes(normalizada) ||
      (orden.interventionType ?? '').toLowerCase().includes(normalizada) ||
      (orden.sourceRequestId ?? '').toLowerCase().includes(normalizada) ||
      orden.origin.toLowerCase().includes(normalizada)

    const coincideEstado = estadoOrden === 'TODOS' || orden.status === estadoOrden
    return coincideBusqueda && coincideEstado
  })
}

export function paginar<T>(items: T[], pagina: number, tamanioPagina: number) {
  return items.slice((pagina - 1) * tamanioPagina, pagina * tamanioPagina)
}
