import type { EstadoOrden, OrdenTrabajo } from '../types'

export function filtrarOrdenes(
  ordenes: OrdenTrabajo[],
  busqueda: string,
  estadoOrden: 'TODOS' | EstadoOrden,
) {
  const normalizada = busqueda.trim().toLowerCase()

  return ordenes.filter((orden) => {
    const coincideBusqueda =
      orden.descripcion.toLowerCase().includes(normalizada) ||
      orden.ubicacion.toLowerCase().includes(normalizada) ||
      orden.tipo.toLowerCase().includes(normalizada) ||
      orden.sourceRequestId.toLowerCase().includes(normalizada) ||
      orden.origen.toLowerCase().includes(normalizada)

    const coincideEstado = estadoOrden === 'TODOS' || orden.estado === estadoOrden
    return coincideBusqueda && coincideEstado
  })
}

export function paginar<T>(items: T[], pagina: number, tamanioPagina: number) {
  return items.slice((pagina - 1) * tamanioPagina, pagina * tamanioPagina)
}
