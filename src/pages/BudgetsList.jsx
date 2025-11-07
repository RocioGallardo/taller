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

  const emptyState = useMemo(
    () => !loading && !error && budgets.length === 0,
    [budgets.length, error, loading],
  )

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

      <div className="card">
        {loading && <p>Cargando presupuestos…</p>}
        {error && <p className="error">{error}</p>}
        {emptyState && (
          <div className="empty-state">
            <p>Aún no registraste ningún presupuesto.</p>
            <p>Creá el primero con el botón “Nuevo presupuesto”.</p>
          </div>
        )}

        {!loading && !error && budgets.length > 0 && (
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
              {budgets.map((budget) => {
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
        )}
      </div>
    </div>
  )
}

export default BudgetsList




