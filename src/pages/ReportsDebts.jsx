import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { listOrders } from '../services/orders'
import { listIncomes } from '../services/incomes'
import './Reports.css'

const DAY_MS = 1000 * 60 * 60 * 24

const BUCKETS = [
  { id: 'al-dia', label: 'Al día (≤ 0 días)' },
  { id: '0-15', label: '0-15 días' },
  { id: '16-30', label: '16-30 días' },
  { id: '31-60', label: '31-60 días' },
  { id: '60+', label: '+60 días' },
  { id: 'sin-fecha', label: 'Sin fecha estimada' },
]

function toDate(ts) {
  return ts?.toDate ? ts.toDate() : null
}

function ReportsDebts() {
  const { periodFilter, monthFilter } = useOutletContext()
  const [orders, setOrders] = useState([])
  const [incomes, setIncomes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [ordersData, incomesData] = await Promise.all([
          listOrders(),
          listIncomes(),
        ])
        setOrders(ordersData)
        setIncomes(incomesData)
      } catch (err) {
        console.error(err)
        setError('No pudimos cargar los datos para los reportes de deudas.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const report = useMemo(() => {
    const today = (() => {
      if (periodFilter === 'mes' && monthFilter) {
        const base = new Date(`${monthFilter}-01T00:00:00`)
        return new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59)
      }
      return new Date()
    })()

    const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const startYear = (() => {
      const reference = new Date(today)
      reference.setMonth(reference.getMonth() - 11, 1)
      reference.setHours(0, 0, 0, 0)
      return reference
    })()

    const appliedByOrder = new Map()
    incomes.forEach((income) => {
      if (income.aplicaciones?.length) {
        income.aplicaciones.forEach((aplicacion) => {
          if (!aplicacion.ordenId) return
          appliedByOrder.set(
            aplicacion.ordenId,
            (appliedByOrder.get(aplicacion.ordenId) ?? 0) + Number(aplicacion.monto || 0),
          )
        })
      } else if (income.ordenId) {
        appliedByOrder.set(
          income.ordenId,
          (appliedByOrder.get(income.ordenId) ?? 0) + Number(income.monto || 0),
        )
      }
    })

    const buckets = BUCKETS.reduce((acc, bucket) => {
      acc[bucket.id] = { ...bucket, amount: 0, count: 0 }
      return acc
    }, {})

    const entries = orders
      .map((order) => {
        const totalEstimado = Number(order.totalEstimado || 0)
        if (!totalEstimado) return null
        const aplicado = appliedByOrder.get(order.id) ?? 0
        const pendiente = Number((totalEstimado - aplicado).toFixed(2))
        if (pendiente <= 0) return null

        const referencia =
          toDate(order.fechaEntregaReal) ||
          toDate(order.fechaEntregaEstimada) ||
          toDate(order.fechaInicio) ||
          toDate(order.fechaCreacion)

        let dias = null
        if (referencia) {
          const diff = Math.floor((today.getTime() - referencia.getTime()) / DAY_MS)
          dias = diff
        }

        const includeByPeriod = (() => {
          if (!referencia) return true
          if (periodFilter === 'mes') {
            if (!monthFilter) return true
            return monthKey(referencia) === monthFilter
          }
          return referencia >= startYear
        })()

        if (!includeByPeriod) return null

        let bucketId = 'sin-fecha'
        if (dias !== null) {
          if (dias <= 0) bucketId = 'al-dia'
          else if (dias <= 15) bucketId = '0-15'
          else if (dias <= 30) bucketId = '16-30'
          else if (dias <= 60) bucketId = '31-60'
          else bucketId = '60+'
        }

        buckets[bucketId].amount += pendiente
        buckets[bucketId].count += 1

        return {
          orderId: order.id,
          clienteNombre: order.clienteNombre || 'Sin cliente',
          estado: order.estado,
          totalEstimado,
          aplicado,
          pendiente,
          diasAtraso: dias,
          bucketId,
          referencia,
        }
      })
      .filter(Boolean)
      .sort((a, b) => {
        const diasA = a.diasAtraso ?? -Infinity
        const diasB = b.diasAtraso ?? -Infinity
        if (diasA === diasB) {
          return b.pendiente - a.pendiente
        }
        return (diasB ?? 0) - (diasA ?? 0)
      })

    const totalPendiente = entries.reduce((acc, entry) => acc + entry.pendiente, 0)

    return {
      entries,
      buckets,
      totalPendiente,
    }
  }, [orders, incomes, periodFilter, monthFilter])

  if (loading) {
    return <p>Cargando deudas…</p>
  }

  if (error) {
    return <p className="error">{error}</p>
  }

  if (report.entries.length === 0) {
    return (
      <div className="reports-empty">
        <p>No hay deudas registradas. ¡Todo al día!</p>
      </div>
    )
  }

  return (
    <div className="reports-section">
      <div className="reports-cards-grid">
        <div className="reports-card highlight">
          <span>Total pendiente</span>
          <p className="metric">
            {report.totalPendiente.toLocaleString('es-AR', {
              style: 'currency',
              currency: 'ARS',
            })}
          </p>
          <span className="detail">{report.entries.length} órdenes con saldo abierto</span>
        </div>
        {BUCKETS.filter((bucket) => report.buckets[bucket.id].count > 0).map(
          (bucket) => (
            <div className="reports-card" key={bucket.id}>
              <span>{bucket.label}</span>
              <p className="metric">
                {report.buckets[bucket.id].amount.toLocaleString('es-AR', {
                  style: 'currency',
                  currency: 'ARS',
                })}
              </p>
              <span className="detail">
                {report.buckets[bucket.id].count}{' '}
                {report.buckets[bucket.id].count === 1 ? 'orden' : 'órdenes'}
              </span>
            </div>
          ),
        )}
      </div>

      <div className="reports-table-card">
        <div className="table-scroll">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Orden</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Pendiente</th>
                <th>Días</th>
                <th>Referencia</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {report.entries.map((entry) => (
                <tr key={entry.orderId}>
                  <td>
                    <code className="code-id">#{entry.orderId.slice(-6).toUpperCase()}</code>
                  </td>
                  <td>{entry.clienteNombre}</td>
                  <td>{entry.estado?.replace('_', ' ')}</td>
                  <td>
                    {entry.pendiente.toLocaleString('es-AR', {
                      style: 'currency',
                      currency: 'ARS',
                    })}
                  </td>
                  <td>{entry.diasAtraso ?? '—'}</td>
                  <td>
                    {entry.referencia
                      ? entry.referencia.toLocaleDateString('es-AR')
                      : '—'}
                  </td>
                  <td className="table-actions">
                    <Link to={`/ordenes/${entry.orderId}`} className="link">
                      Ver orden
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ReportsDebts
