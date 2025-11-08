import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import './Dashboard.css'
import './Clients.css'
import { listBudgets } from '../services/budgets'
import { listExpenses } from '../services/expenses'
import { listClients } from '../services/clients'
import { listIncomes } from '../services/incomes'
import { listOrders } from '../services/orders'

const ORDER_STATUS_LABELS = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  terminada: 'Terminada',
  entregada: 'Entregada',
  cancelada: 'Cancelada',
}

const PERIOD_OPTIONS = [
  { value: 'mes', label: 'Mes actual' },
  { value: 'anio', label: 'Últimos 12 meses' },
]

function getDateFrom(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') {
    try {
      return value.toDate()
    } catch (error) {
      console.error('Error convirtiendo timestamp', error)
    }
  }
  if (value instanceof Date) return value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getStartDateForFilter(filter) {
  const now = new Date()
  if (filter === 'anio') {
    return new Date(now.getFullYear() - 1, now.getMonth(), 1)
  }
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState({
    budgets: [],
    expenses: [],
    incomes: [],
    clients: [],
    orders: [],
  })
  const [periodFilter, setPeriodFilter] = useState('mes')

  const { startDate, periodLabel } = useMemo(() => {
    const start = getStartDateForFilter(periodFilter)
    const label = PERIOD_OPTIONS.find((option) => option.value === periodFilter)?.label ?? 'Mes actual'
    return { startDate: start, periodLabel: label }
  }, [periodFilter])

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [budgets, expenses, incomes, clients, orders] = await Promise.all([
          listBudgets(),
          listExpenses(),
          listIncomes(),
          listClients(),
          listOrders(),
        ])
        setData({ budgets, expenses, incomes, clients, orders })
      } catch (err) {
        console.error(err)
        setError('No pudimos cargar el resumen. Intentá nuevamente.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const summary = useMemo(() => {
    const filterByStartDate = (items, getDate) =>
      items.filter((item) => {
        if (!startDate) return true
        const date = getDate(item)
        if (!date) return true
        return date >= startDate
      })

    const sortByDateDesc = (items, getDate) =>
      [...items].sort((a, b) => {
        const dateA = getDate(a)?.getTime() ?? 0
        const dateB = getDate(b)?.getTime() ?? 0
        return dateB - dateA
      })

    const budgetsInRange = filterByStartDate(
      data.budgets,
      (budget) => getDateFrom(budget.creadoEn ?? budget.actualizadoEn ?? budget.fecha),
    )
    const budgetsSorted = sortByDateDesc(
      budgetsInRange,
      (budget) => getDateFrom(budget.creadoEn ?? budget.actualizadoEn ?? budget.fecha),
    )

    const budgetsStats = budgetsInRange.reduce(
      (acc, budget) => {
        acc.total += 1
        const status = budget.estado ?? 'desconocido'
        acc.porEstado[status] = (acc.porEstado[status] ?? 0) + 1
        if (status === 'borrador' || status === 'enviado') {
          acc.pendientes += 1
        }
        if (status === 'aprobado') {
          acc.aprobados += 1
        }
        if (status === 'rechazado') {
          acc.rechazados += 1
        }
        return acc
      },
      {
        total: 0,
        pendientes: 0,
        aprobados: 0,
        rechazados: 0,
        porEstado: {},
      },
    )

    const expensesInRange = filterByStartDate(
      data.expenses,
      (expense) => getDateFrom(expense.fecha ?? expense.creadoEn),
    )
    const expensesSorted = sortByDateDesc(
      expensesInRange,
      (expense) => getDateFrom(expense.fecha ?? expense.creadoEn),
    )
    const totalExpenses = expensesInRange.reduce(
      (acc, expense) => acc + Number(expense.monto || 0),
      0,
    )
    const totalSueldosPorEgreso = expensesInRange
      .filter((expense) => expense.tipo === 'sueldos')
      .reduce((acc, expense) => acc + Number(expense.monto || 0), 0)

    const incomesInRange = filterByStartDate(
      data.incomes,
      (income) => getDateFrom(income.fecha ?? income.creadoEn),
    )
    const incomesSorted = sortByDateDesc(
      incomesInRange,
      (income) => getDateFrom(income.fecha ?? income.creadoEn),
    )
    const totalIncomes = incomesInRange.reduce(
      (acc, income) => acc + Number(income.monto || 0),
      0,
    )

    const ordersInRange = filterByStartDate(
      data.orders,
      (order) => getDateFrom(order.fechaCreacion ?? order.creadoEn),
    )
    const ordersSorted = sortByDateDesc(
      ordersInRange,
      (order) => getDateFrom(order.fechaCreacion ?? order.creadoEn),
    )
    const ordersStats = {
      total: ordersInRange.length,
      enProceso: ordersInRange.filter((order) => order.estado === 'en_proceso').length,
      pendientes: ordersInRange.filter((order) => order.estado === 'pendiente').length,
      terminadas: ordersInRange.filter((order) => order.estado === 'terminada').length,
      canceladas: ordersInRange.filter((order) => order.estado === 'cancelada').length,
      recientes: ordersSorted.slice(0, 5),
    }

    const recentSueldos = expensesSorted
      .filter((expense) => expense.tipo === 'sueldos')
      .slice(0, 5)

    return {
      budgetsStats,
      totalExpenses,
      totalSueldosPorEgreso,
      totalIncomes,
      cashFlow: totalIncomes - totalExpenses,
      recentBudgets: budgetsSorted.slice(0, 5),
      recentExpenses: expensesSorted.slice(0, 5),
      recentSueldos,
      recentIncomes: incomesSorted.slice(0, 5),
      ordersStats,
    }
  }, [data, startDate])

  if (loading) {
    return (
      <div className="dashboard-page">
        <p>Cargando resumen…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <p className="error">{error}</p>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Resumen del período: {periodLabel}.</p>
        </div>
        <div className="header-actions">
          <label className="period-filter">
            <span>Período</span>
            <select
              value={periodFilter}
              onChange={(event) => setPeriodFilter(event.target.value)}
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <section className="cards-grid">
        <div className="card highlight">
          <h3>Presupuestos</h3>
          <p className="metric">
            {summary.budgetsStats.total.toLocaleString('es-AR')}
          </p>
          <span className="detail">
            Pendientes: {summary.budgetsStats.pendientes.toLocaleString('es-AR')}
          </span>
          <span className="detail">
            Aprobados: {summary.budgetsStats.aprobados.toLocaleString('es-AR')}
          </span>
          <span className="detail">
            Rechazados: {summary.budgetsStats.rechazados.toLocaleString('es-AR')}
          </span>
        </div>

        <div className="card warning">
          <h3>Movimientos de dinero</h3>
          <p className="metric">
            {summary.cashFlow.toLocaleString('es-AR', {
              style: 'currency',
              currency: 'ARS',
            })}
          </p>
          <span className="detail">
            Ingresos: {summary.totalIncomes.toLocaleString('es-AR', {
              style: 'currency',
              currency: 'ARS',
            })}
          </span>
          <span className="detail">
            Egresos: {summary.totalExpenses.toLocaleString('es-AR', {
              style: 'currency',
              currency: 'ARS',
            })}
          </span>
        </div>

        <div className="card">
          <h3>Órdenes</h3>
          <p className="metric">
            {summary.ordersStats.total.toLocaleString('es-AR')}
          </p>
          <span className="detail">
            En proceso: {summary.ordersStats.enProceso.toLocaleString('es-AR')}
          </span>
          <span className="detail">
            Pendientes: {summary.ordersStats.pendientes.toLocaleString('es-AR')}
          </span>
          <span className="detail">
            Terminadas: {summary.ordersStats.terminadas.toLocaleString('es-AR')}
          </span>
        </div>

        <div className="card">
          <h3>Clientes activos</h3>
          <p className="metric">
            {data.clients.length.toLocaleString('es-AR')}
          </p>
          <span className="detail">registrados en el sistema</span>
        </div>
      </section>

      <section className="grid-sections">
        <div className="card">
          <div className="section-header">
            <h3>Últimos presupuestos</h3>
            <Link to="/presupuestos" className="link">
              Ver todos
            </Link>
          </div>
          <ul className="data-list">
            {summary.recentBudgets.length === 0 && (
              <li className="empty">Todavía no cargaste presupuestos.</li>
            )}
            {summary.recentBudgets.map((budget) => (
              <li key={budget.id}>
                <div>
                  <strong>{budget.clienteNombre || '—'}</strong>
                  <span>{budget.vehiculo || 'Sin vehículo'}</span>
                </div>
                <div className="amount">
                  {budget.estado ? budget.estado.toUpperCase() : 'SIN ESTADO'}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="section-header">
            <h3>Egresos recientes</h3>
            <Link to="/egresos/gastos" className="link">
              Ver todos
            </Link>
          </div>
          <ul className="data-list">
            {summary.recentExpenses.length === 0 && (
              <li className="empty">Todavía no registraste egresos.</li>
            )}
            {summary.recentExpenses.map((expense) => (
              <li key={expense.id}>
                <div>
                  <strong>{expense.descripcion}</strong>
                  <span>{expense.tipo ? expense.tipo.toUpperCase() : '—'}</span>
                </div>
                <div className="amount negative">
                  {Number(expense.monto || 0).toLocaleString('es-AR', {
                    style: 'currency',
                    currency: 'ARS',
                  })}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="section-header">
            <h3>Sueldos (egresos) recientes</h3>
            <Link to="/egresos/gastos" className="link">
              Ver todos
            </Link>
          </div>
          <ul className="data-list">
            {summary.recentSueldos.length === 0 && (
              <li className="empty">Aún no registraste egresos de sueldos.</li>
            )}
            {summary.recentSueldos.map((expense) => (
              <li key={expense.id}>
                <div>
                  <strong>{expense.empleadoNombre || 'Empleado sin nombre'}</strong>
                  <span>{expense.metodoPago || expense.descripcion || '—'}</span>
                </div>
                <div className="amount negative">
                  {Number(expense.monto || 0).toLocaleString('es-AR', {
                    style: 'currency',
                    currency: 'ARS',
                  })}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="section-header">
            <h3>Órdenes recientes</h3>
            <Link to="/ordenes" className="link">
              Ver todas
            </Link>
          </div>
          <ul className="data-list">
            {summary.ordersStats.recientes.length === 0 && (
              <li className="empty">Todavía no cargaste órdenes.</li>
            )}
            {summary.ordersStats.recientes.map((order) => (
              <li key={order.id}>
                <div>
                  <strong>{order.clienteNombre || 'Orden sin cliente'}</strong>
                  <span>{order.vehiculo || '—'}</span>
                  <span>
                    {order.fechaCreacion?.toDate
                      ? order.fechaCreacion.toDate().toLocaleDateString('es-AR')
                      : 'Sin fecha'}
                  </span>
                </div>
                <div className="amount">
                  {ORDER_STATUS_LABELS[order.estado] ?? order.estado ?? 'Sin estado'}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="section-header">
            <h3>Ingresos recientes</h3>
            <Link to="/ingresos" className="link">
              Ver todos
            </Link>
          </div>
          <ul className="data-list">
            {summary.recentIncomes.length === 0 && (
              <li className="empty">Todavía no registraste ingresos.</li>
            )}
            {summary.recentIncomes.map((income) => (
              <li key={income.id}>
                <div>
                  <strong>{income.descripcion}</strong>
                  <span>{income.clienteNombre || '—'}</span>
                </div>
                <div className="amount">
                  {Number(income.monto || 0).toLocaleString('es-AR', {
                    style: 'currency',
                    currency: 'ARS',
                  })}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}

export default Dashboard
