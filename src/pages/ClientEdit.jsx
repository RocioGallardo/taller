import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  deleteClient,
  getClient,
  updateClient,
} from '../services/clients'
import './Clients.css'

const EMPTY_STATE = {
  nombre: '',
  telefono: '',
  email: '',
  direccion: '',
  vehiculo: '',
  notas: '',
}

function ClientEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY_STATE)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchClient = async () => {
      try {
        setLoading(true)
        const client = await getClient(id)
        if (!client) {
          setError('No encontramos este cliente.')
          return
        }

        setForm({
          nombre: client.nombre ?? '',
          telefono: client.telefono ?? '',
          email: client.email ?? '',
          direccion: client.direccion ?? '',
          vehiculo:
            client.vehiculos?.find((veh) => veh.principal)?.descripcion ??
            client.vehiculos?.[0]?.descripcion ??
            '',
          notas: client.notas ?? '',
        })
      } catch (err) {
        console.error(err)
        setError('Ocurrió un error al cargar el cliente.')
      } finally {
        setLoading(false)
      }
    }

    fetchClient()
  }, [id])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio.')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      const vehiculoDescripcion = form.vehiculo.trim()

      await updateClient(id, {
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim(),
        email: form.email.trim() || null,
        direccion: form.direccion.trim() || null,
        notas: form.notas.trim(),
        vehiculos: vehiculoDescripcion
          ? [
              {
                descripcion: vehiculoDescripcion,
                principal: true,
              },
            ]
          : [],
      })

      navigate(`/clientes/${id}`)
    } catch (err) {
      console.error(err)
      setError('No pudimos actualizar el cliente. Intentalo de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    const confirmation = window.confirm(
      '¿Eliminar este cliente? Esta acción no se puede deshacer y se perderán los presupuestos asociados.',
    )
    if (!confirmation) return

    try {
      setSubmitting(true)
      await deleteClient(id)
      navigate('/clientes', { replace: true })
    } catch (err) {
      console.error(err)
      setError('No pudimos eliminar el cliente. Probá de nuevo.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="clients-page">
        <p>Cargando cliente…</p>
      </div>
    )
  }

  if (error && !submitting) {
    return (
      <div className="clients-page">
        <header className="page-header">
          <h2>Editar cliente</h2>
        </header>
        <div className="card">
          <p className="error">{error}</p>
          <Link to="/clientes" className="button">
            ← Volver
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="clients-page">
      <header className="page-header">
        <div>
          <h2>Editar cliente</h2>
          <p>Actualizá los datos del cliente seleccionado.</p>
        </div>
        <div className="header-actions">
          <Link to={`/clientes/${id}`} className="button">
            ← Ver detalle
          </Link>
          <button
            type="button"
            className="button ghost"
            onClick={handleDelete}
            disabled={submitting}
          >
            Eliminar cliente
          </button>
        </div>
      </header>

      <div className="card">
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="nombre">Nombre completo</label>
            <input
              id="nombre"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="telefono">Teléfono</label>
            <input
              id="telefono"
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label htmlFor="direccion">Dirección</label>
            <input
              id="direccion"
              name="direccion"
              value={form.direccion}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label htmlFor="vehiculo">Vehículo principal</label>
            <input
              id="vehiculo"
              name="vehiculo"
              value={form.vehiculo}
              onChange={handleChange}
            />
          </div>

          <div className="form-field full-width">
            <label htmlFor="notas">Notas internas</label>
            <textarea
              id="notas"
              name="notas"
              rows={4}
              value={form.notas}
              onChange={handleChange}
            />
          </div>

          {error && <p className="error">{error}</p>}

          <div className="form-actions">
            <button
              type="submit"
              className="button primary"
              disabled={submitting}
            >
              {submitting ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ClientEdit




