import { useMemo, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import './Reports.css'

const REPORT_LINKS = [
  { to: '/reportes/deudas', label: 'Deudas' },
  { to: '/reportes/ordenes', label: 'Órdenes' },
  { to: '/reportes/finanzas', label: 'Finanzas' },
]

function ReportsLayout() {
  const [periodFilter, setPeriodFilter] = useState('mes')
  const [monthFilter, setMonthFilter] = useState(() =>
    new Date().toISOString().slice(0, 7),
  )

  const outletContext = useMemo(
    () => ({ periodFilter, monthFilter, setPeriodFilter, setMonthFilter }),
    [periodFilter, monthFilter],
  )

  return (
    <div className="reports-page">
      <header className="page-header">
        <div>
          <h2>Reportes</h2>
          <p>Analizá la salud del taller con indicadores clave.</p>
        </div>
      </header>

      <div className="reports-filters card">
        <div className="form-field">
          <label htmlFor="reports-period">Período</label>
          <select
            id="reports-period"
            value={periodFilter}
            onChange={(event) => setPeriodFilter(event.target.value)}
          >
            <option value="mes">Mes actual</option>
            <option value="anio">Últimos 12 meses</option>
          </select>
        </div>
        {periodFilter === 'mes' && (
          <div className="form-field">
            <label htmlFor="reports-month">Mes</label>
            <input
              id="reports-month"
              type="month"
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
            />
          </div>
        )}
      </div>

      <nav className="reports-subnav">
        {REPORT_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              isActive ? 'reports-subnav-link active' : 'reports-subnav-link'
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <section className="reports-content">
        <Outlet context={outletContext} />
      </section>
    </div>
  )
}

export default ReportsLayout
