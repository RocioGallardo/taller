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
  vehiculos: [{ descripcion: '', principal: true }],
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
          vehiculos:
            client.vehiculos?.length
              ? client.vehiculos.map((vehiculo, index) => ({
                  descripcion: vehiculo.descripcion ?? '',
                  principal:
                    vehiculo.principal ?? index === 0,
                }))
              : [{ descripcion: '', principal: true }],
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

  const handleVehicleChange = (index, value) => {
    setForm((prev) => {
      const vehiculos = prev.vehiculos.map((vehiculo, idx) =>
        idx === index ? { ...vehiculo, descripcion: value } : vehiculo,
      )
      return { ...prev, vehiculos }
    })
  }

  const handlePrincipalChange = (index) => {
    setForm((prev) => ({
      ...prev,
      vehiculos: prev.vehiculos.map((vehiculo, idx) => ({
        ...vehiculo,
        principal: idx === index,
      })),
    }))
  }

  const addVehicleRow = () => {
    setForm((prev) => ({
      ...prev,
      vehiculos: [...prev.vehiculos, { descripcion: '', principal: false }],
    }))
  }

  const removeVehicleRow = (index) => {
    setForm((prev) => ({
      ...prev,
      vehiculos: prev.vehiculos.filter((_, idx) => idx !== index),
    }))
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
      const vehiculos = form.vehiculos
        .map((vehiculo, index) => ({
          descripcion: vehiculo.descripcion.trim(),
          principal: vehiculo.principal ?? index === 0,
        }))
        .filter((vehiculo) => vehiculo.descripcion.length > 0)

      const principalIndex = vehiculos.findIndex((vehiculo) => vehiculo.principal)
      if (vehiculos.length && principalIndex === -1) {
        vehiculos[0].principal = true
      }

      await updateClient(id, {
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim(),
        email: form.email.trim() || null,
        direccion: form.direccion.trim() || null,
        notas: form.notas.trim(),
        vehiculos,
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
          <p>Actualizá los datos de contacto y los vehículos asociados.</p>
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
            <label>Vehículos</label>
            <div className="vehicle-list">
              {form.vehiculos.map((vehiculo, index) => (
                <div className="vehicle-row" key={`vehiculo-${index}`}>
                  <input
                    value={vehiculo.descripcion}
                    placeholder="Marca, modelo, año, patente"
                    onChange={(event) =>
                      handleVehicleChange(index, event.target.value)
                    }
                  />
                  <label className="vehicle-principal">
                    <input
                      type="radio"
                      name="vehiculoPrincipal"
                      checked={Boolean(vehiculo.principal)}
                      onChange={() => handlePrincipalChange(index)}
                    />
                    Principal
                  </label>
                  <button
                    type="button"
                    className="button ghost remove"
                    onClick={() => removeVehicleRow(index)}
                    disabled={form.vehiculos.length === 1}
                  >
                    Quitar
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="button ghost"
                onClick={addVehicleRow}
              >
                + Agregar vehículo
              </button>
            </div>
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




