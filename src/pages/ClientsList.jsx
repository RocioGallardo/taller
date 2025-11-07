import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listClients } from '../services/clients'
import './Clients.css'

function ClientsList() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadClients = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await listClients()
      setClients(data)
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

      <div className="card">
        {loading && <p>Cargando clientes…</p>}
        {error && <p className="error">{error}</p>}
        {emptyState && (
          <div className="empty-state">
            <p>Aún no cargaste clientes.</p>
            <p>Creá el primero con el botón “Nuevo cliente”.</p>
          </div>
        )}

        {!loading && !error && clients.length > 0 && (
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
                        style={{ marginLeft: '1rem' }}
                      >
                        Editar
                      </Link>
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

export default ClientsList
