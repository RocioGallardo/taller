import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createClient } from '../services/clients'
import './Clients.css'

const INITIAL_STATE = {
  nombre: '',
  telefono: '',
  email: '',
  direccion: '',
  vehiculo: '',
  notas: '',
}

function ClientForm() {
  const [form, setForm] = useState(INITIAL_STATE)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

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
      const newClient = await createClient({
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
        trabajosActivos: 0,
      })

      navigate(`/clientes/${newClient.id}`)
    } catch (err) {
      console.error(err)
      setError('No pudimos guardar el cliente. Intentalo de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setForm(INITIAL_STATE)
    setError(null)
  }

  return (
    <div className="clients-page">
      <header className="page-header">
        <div>
          <h2>Nuevo cliente</h2>
          <p>Cargá los datos de contacto y del vehículo principal.</p>
        </div>
        <Link to="/clientes" className="button">
          ← Volver
        </Link>
      </header>

      <div className="card">
        <form className="form-grid" onSubmit={handleSubmit} onReset={handleReset}>
          <div className="form-field">
            <label htmlFor="nombre">Nombre completo</label>
            <input
              id="nombre"
              name="nombre"
              placeholder="Ej: Carlos Pérez"
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
              placeholder="Ej: +54 9 351 123 4567"
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
              placeholder="Marca, modelo, año, patente"
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
              {submitting ? 'Guardando…' : 'Guardar cliente'}
            </button>
            <button type="reset" className="button ghost" disabled={submitting}>
              Limpiar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ClientForm
