import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listOrders } from '../services/orders'
import './Orders.css'
import './Clients.css'

const ESTADOS = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  terminada: 'Terminada',
  entregada: 'Entregada',
  cancelada: 'Cancelada',
}

const ICONOS_ESTADO = {
  total: '🧾',
  enProceso: '⚙️',
  terminadas: '✅',
  canceladas: '🛑',
}

const STATUS_OPTIONS = [
  { value: 'todas', label: 'Todas' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'terminada', label: 'Terminada' },
  { value: 'entregada', label: 'Entregada' },
  { value: 'cancelada', label: 'Cancelada' },
]

const getPeriodFromTimestamp = (timestamp) => {
  if (!timestamp?.toDate) return null
  const date = timestamp.toDate()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function OrdersList() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('todas')
  const [periodFilter, setPeriodFilter] = useState('mes')
  const [monthFilter, setMonthFilter] = useState(() =>
    new Date().toISOString().slice(0, 7),
  )

  const loadOrders = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await listOrders()
      setOrders(data)
    } catch (err) {
      console.error(err)
      setError('No pudimos cargar las órdenes. Probá nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  const filteredOrders = useMemo(() => {
    let result = orders

    if (periodFilter === 'mes') {
      result = monthFilter
        ? result.filter((order) => {
            const fecha = order.fechaCreacion?.toDate
              ? order.fechaCreacion.toDate().toISOString().slice(0, 7)
              : null
            return fecha ? fecha === monthFilter : true
          })
        : result
    } else {
      const now = new Date()
      const start = new Date(now.getFullYear() - 1, now.getMonth(), 1)
      result = result.filter((order) => {
        const fecha = order.fechaCreacion?.toDate
          ? order.fechaCreacion.toDate()
          : null
        if (!fecha) return true
        return fecha >= start
      })
    }

    if (statusFilter === 'todas') return result
    return result.filter((order) => order.estado === statusFilter)
  }, [orders, statusFilter, periodFilter, monthFilter])

  const summary = useMemo(() => {
    const enProceso = orders.filter(
      (order) => order.estado === 'pendiente' || order.estado === 'en_proceso',
    )
    const terminadas = orders.filter((order) =>
      ['terminada', 'entregada'].includes(order.estado),
    )
    const canceladas = orders.filter((order) => order.estado === 'cancelada')

    const currentDate = new Date()
    const currentPeriod = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1,
    ).padStart(2, '0')}`
    const previousDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    const previousPeriod = `${previousDate.getFullYear()}-${String(
      previousDate.getMonth() + 1,
    ).padStart(2, '0')}`

    const currentPeriodOrders = orders.filter(
      (order) => getPeriodFromTimestamp(order.fechaCreacion) === currentPeriod,
    )
    const previousPeriodOrders = orders.filter(
      (order) => getPeriodFromTimestamp(order.fechaCreacion) === previousPeriod,
    )

    const diffTotal =
      currentPeriodOrders.length - previousPeriodOrders.length
    const diffEnProceso =
      currentPeriodOrders.filter((order) =>
        ['pendiente', 'en_proceso'].includes(order.estado),
      ).length -
      previousPeriodOrders.filter((order) =>
        ['pendiente', 'en_proceso'].includes(order.estado),
      ).length
    const diffTerminadas =
      currentPeriodOrders.filter((order) =>
        ['terminada', 'entregada'].includes(order.estado),
      ).length -
      previousPeriodOrders.filter((order) =>
        ['terminada', 'entregada'].includes(order.estado),
      ).length
    const diffCanceladas =
      currentPeriodOrders.filter((order) => order.estado === 'cancelada').length -
      previousPeriodOrders.filter((order) => order.estado === 'cancelada').length

    const progreso = orders.length
      ? Math.round((enProceso.length / orders.length) * 100)
      : 0

    return {
      total: orders.length,
      enProceso,
      terminadas,
      canceladas,
      diff: {
        total: diffTotal,
        enProceso: diffEnProceso,
        terminadas: diffTerminadas,
        canceladas: diffCanceladas,
      },
      progreso,
    }
  }, [orders])

  const formatDiff = (value) => {
    if (value > 0) return `+${value} vs mes anterior`
    if (value < 0) return `${value} vs mes anterior`
    return 'Igual que mes anterior'
  }

  return (
    <div className="orders-page">
      <header className="page-header">
        <div>
          <h2>Órdenes de trabajo</h2>
          <p>Seguimiento de los trabajos activos y entregados.</p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="button ghost"
            onClick={loadOrders}
            disabled={loading}
          >
            {loading ? 'Actualizando…' : 'Actualizar'}
          </button>
          <Link to="/ordenes/nueva" className="button primary">
            + Nueva orden
          </Link>
        </div>
      </header>

      <section className="summary-grid">
        <div className="summary-card">
          <div className="row">
            <span className="summary-icon">{ICONOS_ESTADO.total}</span>
            <div className="summary-label-group">
              <span>Total órdenes</span>
              <p className="metric">{summary.total}</p>
            </div>
          </div>
          <div className="summary-footer">
            <span className="detail">{formatDiff(summary.diff.total)}</span>
            <button
              type="button"
              className="summary-link"
              onClick={() => setStatusFilter('todas')}
            >
              Ver todas
            </button>
          </div>
        </div>
        <div className="summary-card">
          <div className="row">
            <span className="summary-icon">{ICONOS_ESTADO.enProceso}</span>
            <div className="summary-label-group state-en-proceso">
              <span>En proceso</span>
              <p className="metric">{summary.enProceso.length}</p>
            </div>
          </div>
          <div className="summary-footer">
            <span className="detail">{formatDiff(summary.diff.enProceso)}</span>
            <button
              type="button"
              className="summary-link"
              onClick={() => setStatusFilter('en_proceso')}
            >
              Ver en proceso
            </button>
          </div>
        </div>
        <div className="summary-card">
          <div className="row">
            <span className="summary-icon">{ICONOS_ESTADO.terminadas}</span>
            <div className="summary-label-group state-terminada">
              <span>Terminadas</span>
              <p className="metric">{summary.terminadas.length}</p>
            </div>
          </div>
          <div className="summary-footer">
            <span className="detail">{formatDiff(summary.diff.terminadas)}</span>
            <button
              type="button"
              className="summary-link"
              onClick={() => setStatusFilter('terminada')}
            >
              Ver terminadas
            </button>
          </div>
        </div>
        <div className="summary-card">
          <div className="row">
            <span className="summary-icon">{ICONOS_ESTADO.canceladas}</span>
            <div className="summary-label-group state-cancelada">
              <span>Canceladas</span>
              <p className="metric">{summary.canceladas.length}</p>
            </div>
          </div>
          <div className="summary-footer">
            <span className="detail">{formatDiff(summary.diff.canceladas)}</span>
            <button
              type="button"
              className="summary-link"
              onClick={() => setStatusFilter('cancelada')}
            >
              Ver canceladas
            </button>
          </div>
        </div>
        <div className="summary-card progress-card">
          <div className="row">
            <span className="summary-icon">📈</span>
            <p className="metric">{summary.progreso}%</p>
          </div>
          <span className="detail">Órdenes en proceso sobre el total</span>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${summary.progreso}%` }}
            />
          </div>
        </div>
      </section>

      <div className="filters card">
        <div className="form-field">
          <label htmlFor="periodFilter">Período</label>
          <select
            id="periodFilter"
            value={periodFilter}
            onChange={(event) => setPeriodFilter(event.target.value)}
          >
            <option value="mes">Mes actual</option>
            <option value="anio">Últimos 12 meses</option>
          </select>
        </div>
        {periodFilter === 'mes' && (
          <div className="form-field">
            <label htmlFor="monthFilter">Mes</label>
            <input
              id="monthFilter"
              type="month"
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
            />
          </div>
        )}
        <div className="status-filters">
          {STATUS_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              className={
                statusFilter === option.value ? 'chip active' : 'chip'
              }
              onClick={() => setStatusFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card table-card">
        {loading && <p>Cargando órdenes…</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && filteredOrders.length === 0 && (
          <div className="empty-state">
            <p>No hay órdenes con el filtro seleccionado.</p>
            <p>Creá la primera con el botón “Nueva orden”.</p>
          </div>
        )}

        {!loading && !error && filteredOrders.length > 0 && (
          <>
            <div className="table-scroll desktop-only">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Vehículo</th>
                    <th>Estado</th>
                    <th>Total estimado</th>
                    <th>Fecha</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const fecha = order.fechaCreacion?.toDate
                      ? order.fechaCreacion
                          .toDate()
                          .toLocaleDateString('es-AR')
                      : '—'
                    return (
                      <tr key={order.id}>
                        <td>{order.clienteNombre || '—'}</td>
                        <td>{order.vehiculo || '—'}</td>
                        <td>
                          <span className={`status-badge status-${order.estado}`}>
                            {ESTADOS[order.estado] ?? order.estado}
                          </span>
                        </td>
                        <td>
                          {Number(order.totalEstimado || 0).toLocaleString(
                            'es-AR',
                            {
                              style: 'currency',
                              currency: 'ARS',
                            },
                          )}
                        </td>
                        <td>{fecha}</td>
                        <td className="table-actions">
                          <Link to={`/ordenes/${order.id}`} className="link">
                            Ver detalle
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="mobile-only mobile-list">
              {filteredOrders.map((order) => {
                const fecha = order.fechaCreacion?.toDate
                  ? order.fechaCreacion.toDate().toLocaleDateString('es-AR')
                  : '—'
                return (
                  <div className="mobile-card" key={order.id}>
                    <div className="mobile-card-header">
                      <div>
                        <strong>{order.clienteNombre || '—'}</strong>
                        <span>{order.vehiculo || '—'}</span>
                      </div>
                      <span className={`status-badge status-${order.estado}`}>
                        {ESTADOS[order.estado] ?? order.estado}
                      </span>
                    </div>
                    <div className="mobile-card-body">
                      <p>
                        <small>Fecha:</small> {fecha}
                      </p>
                      <p>
                        <small>Total estimado:</small>{' '}
                        {Number(order.totalEstimado || 0).toLocaleString(
                          'es-AR',
                          {
                            style: 'currency',
                            currency: 'ARS',
                          },
                        )}
                      </p>
                      <div className="mobile-actions">
                        <Link to={`/ordenes/${order.id}`} className="link">
                          Ver detalle
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default OrdersList

