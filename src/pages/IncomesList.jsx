import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listIncomes } from '../services/incomes'
import './Incomes.css'
import './Clients.css'

const TIPOS = {
  cobro_cliente: 'Cobro de cliente',
  adelanto: 'Adelanto',
  otros: 'Otros ingresos',
}

function IncomesList() {
  const [incomes, setIncomes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [periodFilter, setPeriodFilter] = useState('mes')
  const [monthFilter, setMonthFilter] = useState(() =>
    new Date().toISOString().slice(0, 7),
  )

  const loadIncomes = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await listIncomes()
      setIncomes(data)
    } catch (err) {
      console.error(err)
      setError('No pudimos cargar los ingresos. Probá nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIncomes()
  }, [])

  const filteredIncomes = useMemo(() => {
    if (periodFilter === 'mes') {
      if (!monthFilter) return incomes
      return incomes.filter((income) => income.periodo === monthFilter)
    }

    const now = new Date()
    const start = new Date(now.getFullYear() - 1, now.getMonth(), 1)

    return incomes.filter((income) => {
      const date = income.fecha?.toDate
        ? income.fecha.toDate()
        : income.periodo
          ? new Date(`${income.periodo}-01`)
          : null
      if (!date) return true
      return date >= start
    })
  }, [incomes, monthFilter, periodFilter])

  const totalMes = useMemo(
    () =>
      filteredIncomes.reduce(
        (acc, income) => acc + Number(income.monto || 0),
        0,
      ),
    [filteredIncomes],
  )

  const emptyState =
    !loading && !error && filteredIncomes.length === 0 && incomes.length > 0

  return (
    <div className="incomes-page">
      <header className="page-header">
        <div>
          <h2>Ingresos</h2>
          <p>Registrá los cobros y otros ingresos del taller.</p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="button ghost"
            onClick={loadIncomes}
            disabled={loading}
          >
            {loading ? 'Actualizando…' : 'Actualizar'}
          </button>
          <Link to="/ingresos/nuevo" className="button primary">
            + Registrar ingreso
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
        {loading && <p>Cargando ingresos…</p>}
        {error && <p className="error">{error}</p>}

        {emptyState && (
          <div className="empty-state">
            <p>No hay ingresos registrados en este período.</p>
            <p>Podés crearlos con el botón “Registrar ingreso”.</p>
          </div>
        )}

        {!loading && !error && filteredIncomes.length > 0 && (
          <>
            <div className="table-scroll desktop-only">
              <table className="incomes-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Descripción</th>
                    <th>Cliente</th>
                    <th>Monto</th>
                    <th>Método</th>
                    <th>Aplicaciones</th>
                    <th>Saldo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIncomes.map((income) => {
                    const fecha = income.fecha?.toDate
                      ? income.fecha.toDate().toLocaleDateString('es-AR')
                      : '—'
                    return (
                      <tr key={income.id}>
                        <td>{fecha}</td>
                        <td>{TIPOS[income.tipo] ?? income.tipo}</td>
                        <td>{income.descripcion}</td>
                        <td>{income.clienteNombre || '—'}</td>
                        <td>
                          {Number(income.monto || 0).toLocaleString('es-AR', {
                            style: 'currency',
                            currency: 'ARS',
                          })}
                        </td>
                        <td>{income.metodoPago || '—'}</td>
                        <td>
                          {income.aplicaciones?.length ? (
                            <ul className="allocations-list">
                              {income.aplicaciones.map((aplicacion) => (
                                <li key={`${income.id}-${aplicacion.ordenId}`}>
                                  <Link
                                    to={`/ordenes/${aplicacion.ordenId}`}
                                    className="link"
                                  >
                                    {aplicacion.ordenNombre || aplicacion.ordenId}
                                  </Link>{' '}
                                  ·
                                  {aplicacion.monto.toLocaleString('es-AR', {
                                    style: 'currency',
                                    currency: 'ARS',
                                  })}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="helper-text">Sin aplicar</span>
                          )}
                        </td>
                        <td>
                          {Number(income.saldoDisponible || 0).toLocaleString('es-AR', {
                            style: 'currency',
                            currency: 'ARS',
                          })}
                        </td>
                        <td className="table-actions">
                          <Link to={`/ingresos/${income.id}/editar`} className="link">
                            Editar
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="mobile-only mobile-list">
              {filteredIncomes.map((income) => {
                const fecha = income.fecha?.toDate
                  ? income.fecha.toDate().toLocaleDateString('es-AR')
                  : '—'
                return (
                  <div className="mobile-card" key={income.id}>
                    <div className="mobile-card-header">
                      <div>
                        <strong>{income.descripcion}</strong>
                        <span>{TIPOS[income.tipo] ?? income.tipo}</span>
                      </div>
                      <span className="amount">
                        {Number(income.monto || 0).toLocaleString('es-AR', {
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
                        <small>Cliente:</small> {income.clienteNombre || '—'}
                      </p>
                      <p>
                        <small>Método:</small> {income.metodoPago || '—'}
                      </p>
                      <p>
                        <small>Aplicado a:</small>{' '}
                        {income.aplicaciones?.length
                          ? income.aplicaciones
                              .map((aplicacion) => `${aplicacion.ordenNombre || aplicacion.ordenId}`)
                              .join(', ')
                          : 'Sin aplicar'}
                      </p>
                      <p>
                        <small>Saldo disponible:</small>{' '}
                        {Number(income.saldoDisponible || 0).toLocaleString('es-AR', {
                          style: 'currency',
                          currency: 'ARS',
                        })}
                      </p>
                      <div className="mobile-actions">
                        <Link to={`/ingresos/${income.id}/editar`} className="link">
                          Editar
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

export default IncomesList
