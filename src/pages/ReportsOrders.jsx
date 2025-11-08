import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { listOrders } from '../services/orders'
import './Reports.css'

const STATUS_LABELS = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  terminada: 'Terminada',
  entregada: 'Entregada',
  cancelada: 'Cancelada',
}

function toDate(ts) {
  return ts?.toDate ? ts.toDate() : null
}

function ReportsOrders() {
  const { periodFilter, monthFilter } = useOutletContext()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await listOrders()
        setOrders(data)
      } catch (err) {
        console.error(err)
        setError('No pudimos cargar las órdenes para el reporte.')
      } finally {
        setLoading(false)
      }
    }

    loadOrders()
  }, [])

  const summary = useMemo(() => {
    const filteredOrders = orders.filter((order) => {
      const created = toDate(order.fechaCreacion)
      if (!created) return true
      if (periodFilter === 'mes') {
        if (!monthFilter) return true
        const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`
        return key === monthFilter
      }
      const start = new Date()
      start.setMonth(start.getMonth() - 11, 1)
      start.setHours(0, 0, 0, 0)
      return created >= start
    })

    const total = filteredOrders.length
    const byStatus = Object.keys(STATUS_LABELS).reduce((acc, key) => {
      acc[key] = { count: 0 }
      return acc
    }, {})

    let totalCycle = 0
    let cycleCount = 0
    const today = new Date()

    filteredOrders.forEach((order) => {
      const status = order.estado ?? 'pendiente'
      if (byStatus[status]) {
        byStatus[status].count += 1
      }

      const created = toDate(order.fechaCreacion)
      const delivered = toDate(order.fechaEntregaReal)
      if (created) {
        const end = delivered ?? today
        const diffDays = Math.floor((end.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
        if (!Number.isNaN(diffDays)) {
          totalCycle += diffDays
          cycleCount += 1
        }
      }
    })

    const avgCycle = cycleCount > 0 ? totalCycle / cycleCount : 0

    const topRecent = [...filteredOrders]
      .sort((a, b) => {
        const dateA = a.actualizadoEn?.toDate ? a.actualizadoEn.toDate().getTime() : 0
        const dateB = b.actualizadoEn?.toDate ? b.actualizadoEn.toDate().getTime() : 0
        return dateB - dateA
      })
      .slice(0, 10)

    return {
      total,
      byStatus,
      avgCycle,
      topRecent,
    }
  }, [orders, periodFilter, monthFilter])

  if (loading) {
    return <p>Cargando órdenes…</p>
  }

  if (error) {
    return <p className="error">{error}</p>
  }

  return (
    <div className="reports-section">
      <div className="reports-cards-grid">
        <div className="reports-card highlight">
          <span>Órdenes totales</span>
          <p className="metric">{summary.total}</p>
          <span className="detail">en el periodo completo</span>
        </div>
        <div className="reports-card">
          <span>Promedio ciclo de trabajo</span>
          <p className="metric">{summary.avgCycle.toFixed(1)} días</p>
          <span className="detail">desde creación hasta entrega</span>
        </div>
        {Object.entries(summary.byStatus).map(([status, data]) => (
          <div className="reports-card" key={status}>
            <span>{STATUS_LABELS[status] ?? status}</span>
            <p className="metric">{data.count}</p>
            <span className="detail">
              {summary.total > 0
                ? `${((data.count / summary.total) * 100).toFixed(1)}% del total`
                : 'Sin datos'}
            </span>
          </div>
        ))}
      </div>

      <div className="reports-table-card">
        <h3>Órdenes recientes</h3>
        {summary.topRecent.length === 0 ? (
          <p>No hay órdenes registradas todavía.</p>
        ) : (
          <div className="table-scroll">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Cliente</th>
                  <th>Estado</th>
                  <th>Vehículo</th>
                  <th>Actualizada</th>
                </tr>
              </thead>
              <tbody>
                {summary.topRecent.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <code className="code-id">#{order.id.slice(-6).toUpperCase()}</code>
                    </td>
                    <td>{order.clienteNombre || 'Sin cliente'}</td>
                    <td>{STATUS_LABELS[order.estado] ?? order.estado}</td>
                    <td>{order.vehiculo || '—'}</td>
                    <td>
                      {order.actualizadoEn?.toDate
                        ? order.actualizadoEn.toDate().toLocaleDateString('es-AR')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default ReportsOrders
