import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listBudgets } from '../services/budgets'
import './Budgets.css'

const ESTADO_LABELS = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
}

function BudgetsList() {
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [periodFilter, setPeriodFilter] = useState('mes')
  const [monthFilter, setMonthFilter] = useState(() =>
    new Date().toISOString().slice(0, 7),
  )

  const loadBudgets = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await listBudgets()
      setBudgets(data)
    } catch (err) {
      console.error(err)
      setError(
        'No pudimos cargar los presupuestos. Actualizá la página o intentá más tarde.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBudgets()
  }, [])

  const filteredBudgets = useMemo(() => {
    const sorted = [...budgets].sort((a, b) => {
      const dateA = a.creadoEn?.toDate ? a.creadoEn.toDate().getTime() : 0
      const dateB = b.creadoEn?.toDate ? b.creadoEn.toDate().getTime() : 0
      return dateB - dateA
    })

    if (periodFilter === 'mes') {
      if (!monthFilter) return sorted
      return sorted.filter((budget) => {
        const periodo = budget.creadoEn?.toDate
          ? budget.creadoEn.toDate().toISOString().slice(0, 7)
          : null
        return periodo ? periodo === monthFilter : true
      })
    }

    const now = new Date()
    const start = new Date(now.getFullYear() - 1, now.getMonth(), 1)

    return sorted.filter((budget) => {
      const date = budget.creadoEn?.toDate ? budget.creadoEn.toDate() : null
      if (!date) return true
      return date >= start
    })
  }, [budgets, monthFilter, periodFilter])

  const emptyState = useMemo(() => !loading && !error && filteredBudgets.length === 0, [filteredBudgets.length, loading, error])

  return (
    <div className="budgets-page">
      <header className="page-header">
        <div>
          <h2>Presupuestos</h2>
          <p>Organizá tus presupuestos y seguí su estado.</p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="button ghost"
            onClick={loadBudgets}
            disabled={loading}
          >
            {loading ? 'Actualizando…' : 'Actualizar'}
          </button>
          <Link to="/presupuestos/nuevo" className="button primary">
            + Nuevo presupuesto
          </Link>
        </div>
      </header>

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
      </div>

      <div className="card table-card">
        {loading && <p>Cargando presupuestos…</p>}
        {error && <p className="error">{error}</p>}
        {emptyState && (
          <div className="empty-state">
            <p>Aún no registraste ningún presupuesto.</p>
            <p>Creá el primero con el botón “Nuevo presupuesto”.</p>
          </div>
        )}

        {!loading && !error && filteredBudgets.length > 0 && (
          <>
            <div className="table-scroll desktop-only">
            <table className="budgets-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Vehículo</th>
                  <th>Estado</th>
                  <th>Total</th>
                  <th>Fecha</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredBudgets.map((budget) => {
                  const estado = ESTADO_LABELS[budget.estado] ?? budget.estado
                  const creadoEn = budget.creadoEn?.toDate
                    ? budget.creadoEn.toDate().toLocaleDateString('es-AR')
                    : '—'
                  return (
                    <tr key={budget.id}>
                      <td>{budget.clienteNombre || '—'}</td>
                      <td>{budget.vehiculo || '—'}</td>
                      <td>
                        <span className={`badge status-${budget.estado}`}>
                          {estado}
                        </span>
                      </td>
                      <td>
                        {budget.totalGeneral.toLocaleString('es-AR', {
                          style: 'currency',
                          currency: 'ARS',
                        })}
                      </td>
                      <td>{creadoEn}</td>
                      <td className="table-actions">
                        <Link to={`/presupuestos/${budget.id}`} className="link">
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
              {filteredBudgets.map((budget) => {
                const estado = ESTADO_LABELS[budget.estado] ?? budget.estado
                const creadoEn = budget.creadoEn?.toDate
                  ? budget.creadoEn.toDate().toLocaleDateString('es-AR')
                  : '—'
                return (
                  <div className="mobile-card" key={budget.id}>
                    <div className="mobile-card-header">
                      <div>
                        <strong>{budget.clienteNombre || '—'}</strong>
                        <span>{budget.vehiculo || '—'}</span>
                      </div>
                      <span className={`badge status-${budget.estado}`}>
                        {estado}
                      </span>
                    </div>
                    <div className="mobile-card-body">
                      <p>
                        <small>Fecha:</small> {creadoEn}
                      </p>
                      <p className="amount">
                        {budget.totalGeneral.toLocaleString('es-AR', {
                          style: 'currency',
                          currency: 'ARS',
                        })}
                      </p>
                      <div className="mobile-actions">
                        <Link to={`/presupuestos/${budget.id}`} className="link">
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

export default BudgetsList




