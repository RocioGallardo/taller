import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import './Layout.css'

const NAV_LINKS = [
  { to: '/', label: 'Dashboard' },
  { to: '/clientes', label: 'Clientes' },
  { to: '/presupuestos', label: 'Presupuestos' },
  { to: '/ordenes', label: 'Órdenes' },
  { to: '/egresos', label: 'Egresos' },
  { to: '/ingresos', label: 'Ingresos' },
  { to: '/reportes', label: 'Reportes' },
]

function Layout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => setIsMenuOpen((prev) => !prev)
  const closeMenu = () => setIsMenuOpen(false)

  return (
    <div className={`app-shell ${isMenuOpen ? 'menu-open' : ''}`}>
      <header className="mobile-header">
        <button
          type="button"
          className="menu-toggle"
          onClick={toggleMenu}
          aria-label="Abrir menú de navegación"
          aria-expanded={isMenuOpen}
        >
          <span />
          <span />
          <span />
        </button>
        <h1>Taller Manager</h1>
      </header>

      <aside className={`sidebar ${isMenuOpen ? 'open' : ''}`}>
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
              onClick={closeMenu}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {isMenuOpen && <div className="backdrop" onClick={closeMenu} />}

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout





