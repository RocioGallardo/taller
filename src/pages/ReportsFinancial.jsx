import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { listIncomes } from '../services/incomes'
import { listExpenses } from '../services/expenses'
import './Reports.css'

function formatMonth(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const MONTH_LABEL = new Intl.DateTimeFormat('es-AR', {
  month: 'short',
  year: 'numeric',
})

function ReportsFinancial() {
  const { periodFilter, monthFilter } = useOutletContext()
  const [incomes, setIncomes] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [incomesData, expensesData] = await Promise.all([
          listIncomes(),
          listExpenses(),
        ])
        setIncomes(incomesData)
        setExpenses(expensesData)
      } catch (err) {
        console.error(err)
        setError('No pudimos cargar los datos financieros para el reporte.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const report = useMemo(() => {
    const map = new Map()
    const startYear = (() => {
      const reference = monthFilter
        ? new Date(`${monthFilter}-01T00:00:00`)
        : new Date()
      reference.setMonth(reference.getMonth() - 11, 1)
      reference.setHours(0, 0, 0, 0)
      return reference
    })()

    const shouldInclude = (date) => {
      if (!date) return true
      if (periodFilter === 'mes') {
        if (!monthFilter) return true
        return formatMonth(date) === monthFilter
      }
      return date >= startYear
    }

    incomes.forEach((income) => {
      const fecha = income.fecha?.toDate
        ? income.fecha.toDate()
        : income.periodo
          ? new Date(`${income.periodo}-01`)
          : null
      if (!shouldInclude(fecha)) return
      if (!fecha) return
      const key = formatMonth(fecha)
      if (!map.has(key)) {
        map.set(key, { ingresos: 0, egresos: 0, date: new Date(`${key}-01`) })
      }
      map.get(key).ingresos += Number(income.monto || 0)
    })

    expenses.forEach((expense) => {
      const fecha = expense.fecha?.toDate
        ? expense.fecha.toDate()
        : expense.periodo
          ? new Date(`${expense.periodo}-01`)
          : null
      if (!shouldInclude(fecha)) return
      if (!fecha) return
      const key = formatMonth(fecha)
      if (!map.has(key)) {
        map.set(key, { ingresos: 0, egresos: 0, date: new Date(`${key}-01`) })
      }
      map.get(key).egresos += Number(expense.monto || 0)
    })

    const months = Array.from(map.values())
      .sort((a, b) => b.date - a.date)
      .slice(0, periodFilter === 'mes' ? 1 : 12)
      .map((row) => ({
        key: formatMonth(row.date),
        date: row.date,
        ingresos: row.ingresos,
        egresos: row.egresos,
        balance: row.ingresos - row.egresos,
      }))

    const totals = months.reduce(
      (acc, month) => {
        acc.ingresos += month.ingresos
        acc.egresos += month.egresos
        acc.balance += month.balance
        return acc
      },
      { ingresos: 0, egresos: 0, balance: 0 },
    )

    return { months, totals }
  }, [incomes, expenses, periodFilter, monthFilter])

  if (loading) {
    return <p>Cargando datos financieros…</p>
  }

  if (error) {
    return <p className="error">{error}</p>
  }

  if (report.months.length === 0) {
    return (
      <div className="reports-empty">
        <p>Todavía no hay movimientos financieros registrados.</p>
      </div>
    )
  }

  return (
    <div className="reports-section">
      <div className="reports-cards-grid">
        <div className="reports-card highlight">
          <span>Ingresos (últimos 12 meses)</span>
          <p className="metric">
            {report.totals.ingresos.toLocaleString('es-AR', {
              style: 'currency',
              currency: 'ARS',
            })}
          </p>
        </div>
        <div className="reports-card warning">
          <span>Egresos (últimos 12 meses)</span>
          <p className="metric">
            {report.totals.egresos.toLocaleString('es-AR', {
              style: 'currency',
              currency: 'ARS',
            })}
          </p>
        </div>
        <div className={`reports-card ${report.totals.balance >= 0 ? 'positive' : 'negative'}`}>
          <span>Resultado</span>
          <p className="metric">
            {report.totals.balance.toLocaleString('es-AR', {
              style: 'currency',
              currency: 'ARS',
            })}
          </p>
          <span className="detail">
            {report.totals.balance >= 0 ? 'Superávit' : 'Déficit'} acumulado
          </span>
        </div>
      </div>

      <div className="reports-table-card">
        <h3>Detalle mensual</h3>
        <div className="table-scroll">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Mes</th>
                <th>Ingresos</th>
                <th>Egresos</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {report.months.map((month) => (
                <tr key={month.key}>
                  <td>{MONTH_LABEL.format(month.date)}</td>
                  <td>
                    {month.ingresos.toLocaleString('es-AR', {
                      style: 'currency',
                      currency: 'ARS',
                    })}
                  </td>
                  <td>
                    {month.egresos.toLocaleString('es-AR', {
                      style: 'currency',
                      currency: 'ARS',
                    })}
                  </td>
                  <td className={month.balance >= 0 ? 'positive' : 'negative'}>
                    {month.balance.toLocaleString('es-AR', {
                      style: 'currency',
                      currency: 'ARS',
                    })}
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

export default ReportsFinancial
