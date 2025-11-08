import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listClients } from '../services/clients'
import { listOrders } from '../services/orders'
import './Clients.css'

function ClientsList() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadClients = async () => {
    try {
      setLoading(true)
      setError(null)
      const [clientsData, ordersData] = await Promise.all([
        listClients(),
        listOrders(),
      ])

      const activeCounts = ordersData.reduce((acc, order) => {
        if (['pendiente', 'en_proceso'].includes(order.estado) && order.clienteId) {
          acc.set(order.clienteId, (acc.get(order.clienteId) || 0) + 1)
        }
        return acc
      }, new Map())

      const clientsWithOrders = clientsData.map((client) => ({
        ...client,
        trabajosActivos: activeCounts.get(client.id) ?? 0,
      }))

      setClients(clientsWithOrders)
    } catch (err) {
      console.error(err)
      setError('No pudimos cargar los clientes. Intentalo nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClients()
  }, [])

  const emptyState = useMemo(
    () => !loading && !error && clients.length === 0,
    [clients.length, error, loading],
  )

  return (
    <div className="clients-page">
      <header className="page-header">
        <div>
          <h2>Clientes</h2>
          <p>Gestioná la información de tus clientes y vehículos asociados.</p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="button ghost"
            onClick={loadClients}
            disabled={loading}
          >
            {loading ? 'Actualizando…' : 'Actualizar'}
          </button>
          <Link to="/clientes/nuevo" className="button primary">
            + Nuevo cliente
          </Link>
        </div>
      </header>

      <div className="card table-card">
        {loading && <p>Cargando clientes…</p>}
        {error && <p className="error">{error}</p>}
        {emptyState && (
          <div className="empty-state">
            <p>Aún no cargaste clientes.</p>
            <p>Creá el primero con el botón “Nuevo cliente”.</p>
          </div>
        )}

        {!loading && !error && clients.length > 0 && (
          <>
            <div className="table-scroll desktop-only">
            <table className="clients-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Vehículo principal</th>
                  <th>Trabajos activos</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => {
                  const vehiculoPrincipal =
                    client.vehiculos?.[0]?.descripcion ?? '—'
                  return (
                    <tr key={client.id}>
                      <td>{client.nombre}</td>
                      <td>{client.telefono || '—'}</td>
                      <td>{vehiculoPrincipal}</td>
                      <td>
                        {client.trabajosActivos > 0 ? (
                          <span className="badge warning">
                            {client.trabajosActivos} en curso
                          </span>
                        ) : (
                          <span className="badge success">Sin trabajos</span>
                        )}
                      </td>
                      <td className="table-actions">
                        <Link to={`/clientes/${client.id}`} className="link">
                          Ver detalle
                        </Link>
                        <Link
                          to={`/clientes/${client.id}/editar`}
                          className="link"
                        >
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
              {clients.map((client) => {
                const vehiculoPrincipal =
                  client.vehiculos?.[0]?.descripcion ?? '—'
                return (
                  <div className="mobile-card" key={client.id}>
                    <div className="mobile-card-header">
                      <div>
                        <strong>{client.nombre}</strong>
                        <span>{vehiculoPrincipal}</span>
                      </div>
                      <span
                        className={
                          client.trabajosActivos > 0
                            ? 'badge warning'
                            : 'badge success'
                        }
                      >
                        {client.trabajosActivos > 0
                          ? `${client.trabajosActivos} en curso`
                          : 'Sin trabajos'}
                      </span>
                    </div>
                    <div className="mobile-card-body">
                      <p>
                        <small>Teléfono:</small> {client.telefono || '—'}
                      </p>
                      <div className="mobile-actions">
                        <Link to={`/clientes/${client.id}`} className="link">
                          Ver detalle
                        </Link>
                        <Link to={`/clientes/${client.id}/editar`} className="link">
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

export default ClientsList
