import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  deleteExpense,
  listExpenses,
} from '../services/expenses'
import './Expenses.css'
import './Clients.css'

const TIPOS = {
  general: 'General',
  alquiler: 'Alquiler',
  servicios: 'Servicios',
  insumos: 'Insumos',
  herramientas: 'Herramientas',
  impuestos: 'Impuestos',
  otros: 'Otros',
}

function ExpensesList() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [monthFilter, setMonthFilter] = useState(() =>
    new Date().toISOString().slice(0, 7),
  )

  const loadExpenses = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await listExpenses()
      setExpenses(data)
    } catch (err) {
      console.error(err)
      setError('No pudimos cargar los gastos. Probá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExpenses()
  }, [])

  const filteredExpenses = useMemo(() => {
    if (!monthFilter) return expenses
    return expenses.filter((expense) => expense.periodo === monthFilter)
  }, [expenses, monthFilter])

  const totalMes = useMemo(
    () =>
      filteredExpenses.reduce((acc, expense) => acc + Number(expense.monto || 0), 0),
    [filteredExpenses],
  )

  const emptyState =
    !loading && !error && filteredExpenses.length === 0 && expenses.length > 0

  const handleDelete = async (id) => {
    const confirmation = window.confirm(
      '¿Eliminar este gasto? La acción es permanente.',
    )
    if (!confirmation) return

    try {
      setLoading(true)
      await deleteExpense(id)
      await loadExpenses()
    } catch (err) {
      console.error(err)
      alert('No pudimos eliminar el gasto. Intentalo nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="expenses-page">
      <header className="page-header">
        <div>
          <h2>Gastos</h2>
          <p>Controlá los gastos generales del taller.</p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="button ghost"
            onClick={loadExpenses}
            disabled={loading}
          >
            {loading ? 'Actualizando…' : 'Actualizar'}
          </button>
          <Link to="/gastos/nuevo" className="button primary">
            + Registrar gasto
          </Link>
        </div>
      </header>

      <div className="filters card">
        <div className="form-field">
          <label htmlFor="monthFilter">Mes</label>
          <input
            id="monthFilter"
            type="month"
            value={monthFilter}
            onChange={(event) => setMonthFilter(event.target.value)}
          />
        </div>
        <div className="totals-box compact">
          <span>
            Total del mes
            <strong>
              {totalMes.toLocaleString('es-AR', {
                style: 'currency',
                currency: 'ARS',
              })}
            </strong>
          </span>
        </div>
      </div>

      <div className="card">
        {loading && <p>Cargando gastos…</p>}
        {error && <p className="error">{error}</p>}

        {emptyState && (
          <div className="empty-state">
            <p>No hay gastos registrados en este mes.</p>
            <p>Podés crearlos con el botón “Registrar gasto”.</p>
          </div>
        )}

        {!loading && !error && filteredExpenses.length > 0 && (
          <table className="expenses-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Monto</th>
                <th>Método</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense) => {
                const fecha = expense.fecha?.toDate
                  ? expense.fecha.toDate().toLocaleDateString('es-AR')
                  : '—'
                return (
                  <tr key={expense.id}>
                    <td>{fecha}</td>
                    <td>{TIPOS[expense.tipo] ?? expense.tipo}</td>
                    <td>{expense.descripcion}</td>
                    <td>
                      {Number(expense.monto || 0).toLocaleString('es-AR', {
                        style: 'currency',
                        currency: 'ARS',
                      })}
                    </td>
                    <td>{expense.metodoPago || '—'}</td>
                    <td className="table-actions">
                      <Link to={`/gastos/${expense.id}/editar`} className="link">
                        Editar
                      </Link>
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => handleDelete(expense.id)}
                      >
                        Eliminar
                      </button>
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

export default ExpensesList

