import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteClient, getClient } from '../services/clients'
import './Clients.css'

function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const fetchClient = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getClient(id)
        if (!data) {
          setError('No encontramos este cliente.')
          return
        }
        setClient(data)
      } catch (err) {
        console.error(err)
        setError('Ocurrió un problema al cargar el cliente.')
      } finally {
        setLoading(false)
      }
    }

    fetchClient()
  }, [id])

  const creadoEn = useMemo(() => {
    if (!client?.creadoEn?.toDate) return null
    return client.creadoEn.toDate().toLocaleString('es-AR')
  }, [client])

  const handleDelete = async () => {
    const confirmation = window.confirm(
      '¿Seguro que querés eliminar este cliente? Esta acción es permanente.',
    )
    if (!confirmation) return

    try {
      setDeleting(true)
      await deleteClient(id)
      navigate('/clientes', { replace: true })
    } catch (err) {
      console.error(err)
      setError('No pudimos eliminar el cliente. Probá más tarde.')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="clients-page">
        <p>Cargando cliente…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="clients-page">
        <header className="page-header">
          <h2>Clientes</h2>
        </header>
        <div className="card">
          <p className="error">{error}</p>
          <Link to="/clientes" className="button">
            ← Volver al listado
          </Link>
        </div>
      </div>
    )
  }

  if (!client) {
    return null
  }

  return (
    <div className="clients-page">
      <header className="page-header">
        <div>
          <h2>{client.nombre}</h2>
          <p>Detalle completo del cliente y sus trabajos.</p>
          {creadoEn && <small>Cliente desde: {creadoEn}</small>}
        </div>
        <div className="header-actions">
          <Link to="/clientes" className="button">
            ← Volver
          </Link>
          <Link to={`/clientes/${client.id}/editar`} className="button primary">
            Editar cliente
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

      <div className="detail-grid">
        <section className="card">
          <h3>Datos de contacto</h3>
          <dl className="detail-list">
            <div>
              <dt>Teléfono</dt>
              <dd>{client.telefono || '—'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{client.email || '—'}</dd>
            </div>
            <div>
              <dt>Dirección</dt>
              <dd>{client.direccion || '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="card">
          <h3>Vehículos registrados</h3>
          {client.vehiculos?.length ? (
            <ul className="list">
              {client.vehiculos.map((vehiculo, index) => (
                <li key={vehiculo.id ?? index}>{vehiculo.descripcion}</li>
              ))}
            </ul>
          ) : (
            <p>No hay vehículos registrados.</p>
          )}
        </section>

        <section className="card full-width">
          <h3>Presupuestos recientes</h3>
          <p>
            Todavía no conectamos esta sección con Firestore. Se mostrará el
            historial de presupuestos para este cliente en el siguiente paso.
          </p>
        </section>

        <section className="card full-width">
          <h3>Notas internas</h3>
          <p>{client.notas || '—'}</p>
        </section>
      </div>
    </div>
  )
}

export default ClientDetail
