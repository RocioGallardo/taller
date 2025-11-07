import { NavLink, Outlet } from 'react-router-dom'
import './Layout.css'

const NAV_LINKS = [
  { to: '/', label: 'Dashboard' },
  { to: '/clientes', label: 'Clientes' },
  { to: '/presupuestos', label: 'Presupuestos' },
  { to: '/gastos', label: 'Gastos' },
  { to: '/pagos', label: 'Sueldos' },
]

function Layout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <header className="sidebar-header">
          <h1>Taller Manager</h1>
        </header>
        <nav className="sidebar-nav">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                isActive ? 'nav-link active' : 'nav-link'
              }
              end={link.to === '/'}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout





