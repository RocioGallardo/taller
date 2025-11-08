import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createClient } from '../services/clients'
import './Clients.css'

const INITIAL_STATE = {
  nombre: '',
  telefono: '',
  email: '',
  direccion: '',
  vehiculos: [{ descripcion: '', principal: true }],
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

      const newClient = await createClient({
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim(),
        email: form.email.trim() || null,
        direccion: form.direccion.trim() || null,
        notas: form.notas.trim(),
        vehiculos,
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
          <p>Cargá los datos de contacto y los vehículos asociados.</p>
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

          <div className="form-field full-width">
            <label>Vehículos</label>
            <div className="vehicle-list">
              {form.vehiculos.map((vehiculo, index) => (
                <div className="vehicle-row" key={`vehiculo-${index}`}>
                  <input
                    placeholder="Marca, modelo, año, patente"
                    value={vehiculo.descripcion}
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
