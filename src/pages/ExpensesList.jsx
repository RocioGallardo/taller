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
  sueldos: 'Sueldos',
  otros: 'Otros',
}

function ExpensesList() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [periodFilter, setPeriodFilter] = useState('mes')
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
      setError('No pudimos cargar los egresos. Probá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExpenses()
  }, [])

  const filteredExpenses = useMemo(() => {
    if (periodFilter === 'mes') {
      if (!monthFilter) return expenses
      return expenses.filter((expense) => expense.periodo === monthFilter)
    }

    const now = new Date()
    const start = new Date(now.getFullYear() - 1, now.getMonth(), 1)

    return expenses.filter((expense) => {
      const date = expense.fecha?.toDate
        ? expense.fecha.toDate()
        : expense.periodo
          ? new Date(`${expense.periodo}-01`)
          : null
      if (!date) return true
      return date >= start
    })
  }, [expenses, monthFilter, periodFilter])

  const totalMes = useMemo(
    () =>
      filteredExpenses.reduce((acc, expense) => acc + Number(expense.monto || 0), 0),
    [filteredExpenses],
  )

  const emptyState =
    !loading && !error && filteredExpenses.length === 0 && expenses.length > 0

  const handleDelete = async (id) => {
    const confirmation = window.confirm(
      '¿Eliminar este egreso? La acción es permanente.',
    )
    if (!confirmation) return

    try {
      setLoading(true)
      await deleteExpense(id)
      await loadExpenses()
    } catch (err) {
      console.error(err)
      alert('No pudimos eliminar el egreso. Intentalo nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="expenses-page">
      <header className="page-header">
        <div>
          <h2>Egresos</h2>
          <p>Controlá los egresos generales del taller.</p>
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
          <Link to="/egresos/gastos/nuevo" className="button primary">
            + Registrar egreso
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
        <div className="totals-box compact">
          <span>
            Total del {periodFilter === 'mes' ? 'mes' : 'período'}
            <strong>
              {totalMes.toLocaleString('es-AR', {
                style: 'currency',
                currency: 'ARS',
              })}
            </strong>
          </span>
        </div>
      </div>

      <div className="card table-card">
        {loading && <p>Cargando egresos…</p>}
        {error && <p className="error">{error}</p>}

        {emptyState && (
          <div className="empty-state">
            <p>No hay egresos registrados en este mes.</p>
            <p>Podés cargarlos con el botón “Registrar egreso”.</p>
          </div>
        )}

        {!loading && !error && filteredExpenses.length > 0 && (
          <>
            <div className="table-scroll desktop-only">
            <table className="expenses-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Descripción</th>
                  <th>Monto</th>
                  <th>Método</th>
                  <th>Orden</th>
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
                      <td>
                        {expense.descripcion}
                        {expense.empleadoNombre && (
                          <span className="secondary-info">
                            Empleado: {expense.empleadoNombre}
                          </span>
                        )}
                      </td>
                      <td>
                        {Number(expense.monto || 0).toLocaleString('es-AR', {
                          style: 'currency',
                          currency: 'ARS',
                        })}
                      </td>
                      <td>{expense.metodoPago || '—'}</td>
                      <td>
                        {expense.ordenId ? (
                          <Link to={`/ordenes/${expense.ordenId}`} className="link">
                            Ver orden
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="table-actions">
                        <Link to={`/egresos/gastos/${expense.id}/editar`} className="link">
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
          </div>
            <div className="mobile-only mobile-list">
              {filteredExpenses.map((expense) => {
                const fecha = expense.fecha?.toDate
                  ? expense.fecha.toDate().toLocaleDateString('es-AR')
                  : '—'
                return (
                  <div className="mobile-card" key={expense.id}>
                    <div className="mobile-card-header">
                      <div>
                        <strong>{expense.descripcion}</strong>
                        <span>{TIPOS[expense.tipo] ?? expense.tipo}</span>
                      </div>
                      <span className="amount negative">
                        {Number(expense.monto || 0).toLocaleString('es-AR', {
                          style: 'currency',
                          currency: 'ARS',
                        })}
                      </span>
                    </div>
                    <div className="mobile-card-body">
                      <p>
                        <small>Fecha:</small> {fecha}
                      </p>
                      <p>
                        <small>Método:</small> {expense.metodoPago || '—'}
                      </p>
                      {expense.empleadoNombre && (
                        <p>
                          <small>Empleado:</small> {expense.empleadoNombre}
                        </p>
                      )}
                      <p>
                        <small>Orden:</small>{' '}
                        {expense.ordenId ? (
                          <Link to={`/ordenes/${expense.ordenId}`} className="link">
                            Ver orden
                          </Link>
                        ) : (
                          '—'
                        )}
                      </p>
                      <div className="mobile-actions">
                        <Link to={`/egresos/gastos/${expense.id}/editar`} className="link">
                          Editar
                        </Link>
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => handleDelete(expense.id)}
                        >
                          Eliminar
                        </button>
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

export default ExpensesList

