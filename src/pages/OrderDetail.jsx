import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteOrder, getOrder } from '../services/orders'
import { listExpenses } from '../services/expenses'
import { listIncomes } from '../services/incomes'
import './Orders.css'
import './Clients.css'

const ESTADOS = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  terminada: 'Terminada',
  entregada: 'Entregada',
  cancelada: 'Cancelada',
}

function formatDate(ts) {
  if (!ts?.toDate) return '—'
  return ts.toDate().toLocaleDateString('es-AR')
}

function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [incomes, setIncomes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [orderData, expensesData, incomesData] = await Promise.all([
          getOrder(id),
          listExpenses(),
          listIncomes(),
        ])
        if (!orderData) {
          setError('No encontramos esta orden.')
          return
        }
        setOrder(orderData)
        setExpenses(expensesData.filter((expense) => expense.ordenId === id))
        const incomesForOrder = incomesData
          .map((income) => {
            const aplicaciones = income.aplicaciones?.filter(
              (ap) => ap.ordenId === id,
            )
            if (!aplicaciones || aplicaciones.length === 0) return null
            const montoAplicado = aplicaciones.reduce(
              (acc, ap) => acc + Number(ap.monto || 0),
              0,
            )
            return {
              ...income,
              montoAplicado,
              aplicaciones,
            }
          })
          .filter(Boolean)
        setIncomes(incomesForOrder)
      } catch (err) {
        console.error(err)
        setError('Ocurrió un problema al cargar la orden.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id])

  const gastosTotales = useMemo(
    () =>
      expenses.reduce(
        (acc, expense) => acc + Number(expense.monto || 0),
        0,
      ),
    [expenses],
  )

  const balance = useMemo(() => {
    if (!order) return { estimado: 0, gastado: 0, saldo: 0, cobrado: 0, pendienteCobro: 0 }
    const estimado = Number(order.totalEstimado || 0)
    const gastado = gastosTotales || Number(order.totalGastado || 0)
    const cobrado = incomes.reduce(
      (acc, income) => acc + Number(income.montoAplicado || 0),
      0,
    )
    return {
      estimado,
      gastado,
      cobrado,
      saldo: estimado - gastado,
      pendienteCobro: estimado - cobrado,
    }
  }, [order, gastosTotales, incomes])

  const handleDelete = async () => {
    if (!order) return
    const confirmation = window.confirm(
      '¿Eliminar esta orden de trabajo? Esta acción es permanente.',
    )
    if (!confirmation) return

    try {
      setDeleting(true)
      await deleteOrder(order.id)
      navigate('/ordenes', { replace: true })
    } catch (err) {
      console.error(err)
      setError('No pudimos eliminar la orden. Probá nuevamente.')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="orders-page">
        <p>Cargando orden…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="orders-page">
        <header className="page-header">
          <h2>Órdenes de trabajo</h2>
        </header>
        <div className="card">
          <p className="error">{error}</p>
          <Link to="/ordenes" className="button">
            ← Volver
          </Link>
        </div>
      </div>
    )
  }

  if (!order) {
    return null
  }

  return (
    <div className="orders-page">
      <header className="page-header">
        <div>
          <h2>Orden #{order.id.slice(-6).toUpperCase()}</h2>
          <p>
            Cliente: <strong>{order.clienteNombre || '—'}</strong>
          </p>
        </div>
        <div className="header-actions">
          <Link to="/ordenes" className="button">
            ← Volver
          </Link>
          <Link to={`/ordenes/${order.id}/editar`} className="button primary">
            Editar
          </Link>
          <button
            type="button"
            className="button ghost"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </header>

      <section className="summary-grid">
        <div className="summary-card">
          <span>Estado</span>
          <p className="metric">{ESTADOS[order.estado] ?? order.estado}</p>
          <span className="detail">Última actualización automática</span>
        </div>
        <div className="summary-card">
          <span>Total estimado</span>
          <p className="metric">
            {balance.estimado.toLocaleString('es-AR', {
              style: 'currency',
              currency: 'ARS',
            })}
          </p>
          <span className="detail">según presupuesto</span>
        </div>
        <div className="summary-card">
          <span>Egresos registrados</span>
          <p className="metric">
            {balance.gastado.toLocaleString('es-AR', {
              style: 'currency',
              currency: 'ARS',
            })}
          </p>
          <span className="detail">
            {expenses.length} egresos asociados en el sistema
          </span>
        </div>
        <div className="summary-card">
          <span>Ingresos (cobros)</span>
          <p className="metric">
            {balance.cobrado.toLocaleString('es-AR', {
              style: 'currency',
              currency: 'ARS',
            })}
          </p>
          <span className="detail">
            {incomes.length} ingresos registrados en esta orden
          </span>
        </div>
        <div className="summary-card">
          <span>Saldo estimado</span>
          <p
            className="metric"
            style={{ color: balance.saldo < 0 ? '#b91c1c' : '#166534' }}
          >
            {balance.saldo.toLocaleString('es-AR', {
              style: 'currency',
              currency: 'ARS',
            })}
          </p>
          <span className="detail">estimado menos egresos</span>
        </div>
        <div className="summary-card">
          <span>Pendiente de cobro</span>
          <p className="metric">
            {balance.pendienteCobro.toLocaleString('es-AR', {
              style: 'currency',
              currency: 'ARS',
            })}
          </p>
          <span className="detail">total estimado menos ingresos</span>
        </div>
      </section>

      <section className="card">
        <h3>Detalles generales</h3>
        <dl className="detail-list">
          <div>
            <dt>Vehículo</dt>
            <dd>{order.vehiculo || '—'}</dd>
          </div>
          <div>
            <dt>Teléfono</dt>
            <dd>{order.clienteTelefono || '—'}</dd>
          </div>
          <div>
            <dt>Presupuesto</dt>
            <dd>
              {order.presupuestoId ? (
                <Link to={`/presupuestos/${order.presupuestoId}`} className="link">
                  Ver presupuesto
                </Link>
              ) : (
                '—'
              )}
            </dd>
          </div>
        </dl>

        <div className="timeline">
          <div className="timeline-item">
            <strong>Creada:</strong>
            <span>{formatDate(order.fechaCreacion)}</span>
          </div>
          <div className="timeline-item">
            <strong>Inicio:</strong>
            <span>{formatDate(order.fechaInicio)}</span>
          </div>
          <div className="timeline-item">
            <strong>Entrega estimada:</strong>
            <span>{formatDate(order.fechaEntregaEstimada)}</span>
          </div>
          <div className="timeline-item">
            <strong>Entrega real:</strong>
            <span>{formatDate(order.fechaEntregaReal)}</span>
          </div>
        </div>
      </section>

      <section className="card full-width">
        <h3>Egresos vinculados</h3>
        {expenses.length === 0 ? (
          <p>
            Aún no registraste egresos asociados a esta orden. Cuando cargues un
            egreso en el módulo correspondiente podés indicar el `ordenId` para que
            aparezca acá.
          </p>
        ) : (
          <>
            <div className="table-scroll desktop-only">
              <table className="expenses-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Descripción</th>
                    <th>Monto</th>
                    <th>Método</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => {
                    const fecha = expense.fecha?.toDate
                      ? expense.fecha.toDate().toLocaleDateString('es-AR')
                      : '—'
                    const monto = Number(expense.monto || 0).toLocaleString('es-AR', {
                      style: 'currency',
                      currency: 'ARS',
                    })
                    return (
                      <tr
                        key={expense.id}
                        className="clickable-row"
                        onClick={() => navigate(`/egresos/gastos/${expense.id}/editar`)}
                      >
                        <td>{fecha}</td>
                        <td>
                          <strong>{expense.descripcion}</strong>
                        </td>
                        <td>{monto}</td>
                        <td>{expense.metodoPago || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="mobile-only mobile-list">
              {expenses.map((expense) => {
                const fecha = expense.fecha?.toDate
                  ? expense.fecha.toDate().toLocaleDateString('es-AR')
                  : '—'
                const monto = Number(expense.monto || 0).toLocaleString('es-AR', {
                  style: 'currency',
                  currency: 'ARS',
                })
                return (
                  <button
                    type="button"
                    className="mobile-card mobile-card-button"
                    key={expense.id}
                    onClick={() => navigate(`/egresos/gastos/${expense.id}/editar`)}
                  >
                    <div className="mobile-card-header">
                      <div>
                        <strong>{expense.descripcion}</strong>
                        <span>{fecha}</span>
                      </div>
                      <span className="amount negative">{monto}</span>
                    </div>
                    <div className="mobile-card-body">
                      <p>
                        <small>Método:</small> {expense.metodoPago || '—'}
                      </p>
                      {expense.notas ? (
                        <p>
                          <small>Notas:</small> {expense.notas}
                        </p>
                      ) : null}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </section>

      <section className="card full-width">
        <h3>Ingresos vinculados</h3>
        {incomes.length === 0 ? (
          <p>
            Todavía no registraste ingresos con esta orden. Podés hacerlo desde
            el módulo de ingresos seleccionando la orden en el formulario.
          </p>
        ) : (
          <>
            <div className="table-scroll desktop-only">
              <table className="incomes-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Descripción</th>
                    <th>Monto aplicado</th>
                    <th>Método</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {incomes.map((income) => {
                    const fecha = income.fecha?.toDate
                      ? income.fecha.toDate().toLocaleDateString('es-AR')
                      : '—'
                    const monto = Number(income.montoAplicado || 0).toLocaleString(
                      'es-AR',
                      {
                        style: 'currency',
                        currency: 'ARS',
                      },
                    )
                    return (
                      <tr
                        key={income.id}
                        className="clickable-row"
                        onClick={() => navigate(`/ingresos/${income.id}/editar`)}
                      >
                        <td>{fecha}</td>
                        <td>
                          <strong>{income.descripcion}</strong>
                        </td>
                        <td>{monto}</td>
                        <td>{income.metodoPago || '—'}</td>
                        <td>
                          <ul className="allocations-list">
                            {income.aplicaciones.map((aplicacion, idx) => (
                              <li key={`${income.id}-${idx}`}>
                                Parcial {idx + 1}:{' '}
                                {Number(aplicacion.monto || 0).toLocaleString('es-AR', {
                                  style: 'currency',
                                  currency: 'ARS',
                                })}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="mobile-only mobile-list">
              {incomes.map((income) => {
                const fecha = income.fecha?.toDate
                  ? income.fecha.toDate().toLocaleDateString('es-AR')
                  : '—'
                const monto = Number(income.monto || 0).toLocaleString('es-AR', {
                  style: 'currency',
                  currency: 'ARS',
                })
                return (
                  <button
                    type="button"
                    className="mobile-card mobile-card-button"
                    key={income.id}
                    onClick={() => navigate(`/ingresos/${income.id}/editar`)}
                  >
                    <div className="mobile-card-header">
                      <div>
                        <strong>{income.descripcion}</strong>
                        <span>{fecha}</span>
                      </div>
                      <span className="amount">{monto}</span>
                    </div>
                    <div className="mobile-card-body">
                      <p>
                        <small>Método:</small> {income.metodoPago || '—'}
                      </p>
                      <p>
                        <small>Aplicado:</small>{' '}
                        {Number(income.montoAplicado || 0).toLocaleString('es-AR', {
                          style: 'currency',
                          currency: 'ARS',
                        })}
                      </p>
                      {income.aplicaciones.length > 1 && (
                        <p>
                          <small>Parciales:</small>{' '}
                          {income.aplicaciones
                            .map((aplicacion, idx) =>
                              `#${idx + 1} ${Number(aplicacion.monto || 0).toLocaleString('es-AR', {
                                style: 'currency',
                                currency: 'ARS',
                              })}`,
                            )
                            .join(' · ')}
                        </p>
                      )}
                      {income.notas ? (
                        <p>
                          <small>Notas:</small> {income.notas}
                        </p>
                      ) : null}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </section>

      <section className="card full-width">
        <h3>Notas</h3>
        <p>{order.notas || '—'}</p>
      </section>
    </div>
  )
}

export default OrderDetail

