import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listClients } from '../services/clients'
import { createBudget } from '../services/budgets'
import './Budgets.css'
import './Clients.css'

const ESTADOS = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'aprobado', label: 'Aprobado' },
  { value: 'rechazado', label: 'Rechazado' },
]

const EMPTY_ITEM = { descripcion: '', manoObra: 0, materiales: 0, subtotal: 0 }

function BudgetForm() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [form, setForm] = useState({
    clienteId: '',
    estado: 'borrador',
    vehiculo: '',
    items: [{ ...EMPTY_ITEM }],
    observaciones: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadClients = async () => {
      try {
        setLoadingClients(true)
        const data = await listClients()
        setClients(data)
      } catch (err) {
        console.error(err)
        setError(
          'No pudimos cargar los clientes. Refrescá la página o intentá más tarde.',
        )
      } finally {
        setLoadingClients(false)
      }
    }

    loadClients()
  }, [])

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === form.clienteId),
    [clients, form.clienteId],
  )

  useEffect(() => {
    if (selectedClient && !form.vehiculo) {
      const principalVehiculo =
        selectedClient.vehiculos?.find((veh) => veh.principal)?.descripcion ??
        selectedClient.vehiculos?.[0]?.descripcion ??
        ''
      if (principalVehiculo) {
        setForm((prev) => ({ ...prev, vehiculo: principalVehiculo }))
      }
    }
  }, [selectedClient, form.vehiculo])

  const totals = useMemo(() => {
    const subtotalManoObra = form.items.reduce(
      (acc, item) => acc + Number(item.manoObra || 0),
      0,
    )
    const subtotalMateriales = form.items.reduce(
      (acc, item) => acc + Number(item.materiales || 0),
      0,
    )
    const totalGeneral = subtotalManoObra + subtotalMateriales
    return { subtotalManoObra, subtotalMateriales, totalGeneral }
  }, [form.items])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleItemChange = (index, field, value) => {
    setForm((prev) => {
      const items = prev.items.map((item, idx) => {
        if (idx !== index) return item
        const updated = { ...item, [field]: value }
        const manoObra = Number(updated.manoObra || 0)
        const materiales = Number(updated.materiales || 0)
        return { ...updated, subtotal: manoObra + materiales }
      })
      return { ...prev, items }
    })
  }

  const addItemRow = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...EMPTY_ITEM }],
    }))
  }

  const removeItemRow = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.clienteId) {
      setError('Seleccioná un cliente para continuar.')
      return
    }

    if (!form.items.length || !form.items[0].descripcion.trim()) {
      setError('Agregá al menos un ítem al presupuesto.')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      const cliente = clients.find((c) => c.id === form.clienteId)

      const budget = await createBudget({
        clienteId: form.clienteId,
        clienteNombre: cliente?.nombre ?? '',
        clienteTelefono: cliente?.telefono ?? '',
        estado: form.estado,
        vehiculo: form.vehiculo,
        items: form.items,
        subtotalManoObra: totals.subtotalManoObra,
        subtotalMateriales: totals.subtotalMateriales,
        totalGeneral: totals.totalGeneral,
        observaciones: form.observaciones,
      })

      navigate(`/presupuestos/${budget.id}`)
    } catch (err) {
      console.error(err)
      setError('No pudimos guardar el presupuesto. Probá nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="budgets-page">
      <header className="page-header">
        <div>
          <h2>Nuevo presupuesto</h2>
          <p>Cargá los detalles del trabajo y calculá el total automáticamente.</p>
        </div>
        <Link to="/presupuestos" className="button">
          ← Volver
        </Link>
      </header>

      <div className="card">
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="clienteId">Cliente</label>
            <select
              id="clienteId"
              name="clienteId"
              value={form.clienteId}
              onChange={handleChange}
              disabled={loadingClients}
              required
            >
              <option value="">Seleccioná un cliente…</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="estado">Estado</label>
            <select
              id="estado"
              name="estado"
              value={form.estado}
              onChange={handleChange}
            >
              {ESTADOS.map((estado) => (
                <option key={estado.value} value={estado.value}>
                  {estado.label}
                </option>
              ))}
            </select>
          </div>

  <div className="form-field">
            <label htmlFor="vehiculo">Vehículo</label>
            <input
              id="vehiculo"
              name="vehiculo"
              placeholder="Marca, modelo, año, patente"
              value={form.vehiculo}
              onChange={handleChange}
            />
          </div>

          <div className="form-field full-width">
            <label>Ítems</label>
            <div className="item-grid">
              <div className="item-row item-header">
                <strong>Descripción</strong>
                <strong>Mano de obra</strong>
                <strong>Materiales</strong>
                <strong>Subtotal</strong>
                <span></span>
              </div>
              {form.items.map((item, index) => (
                <div className="item-row" key={index}>
                  <input
                    placeholder="Ej: Capot - Reparación de golpe"
                    value={item.descripcion}
                    onChange={(event) =>
                      handleItemChange(index, 'descripcion', event.target.value)
                    }
                  />
                  <input
                    type="number"
                    min="0"
                    value={item.manoObra}
                    onChange={(event) =>
                      handleItemChange(index, 'manoObra', event.target.value)
                    }
                  />
                  <input
                    type="number"
                    min="0"
                    value={item.materiales}
                    onChange={(event) =>
                      handleItemChange(index, 'materiales', event.target.value)
                    }
                  />
                  <input
                    type="number"
                    value={item.subtotal}
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={() => removeItemRow(index)}
                    disabled={form.items.length === 1}
                  >
                    Quitar
                  </button>
                </div>
              ))}
              <div className="items-actions">
                <button type="button" className="button ghost" onClick={addItemRow}>
                  + Agregar ítem
                </button>
              </div>
            </div>
          </div>

          <div className="form-field full-width">
            <label htmlFor="observaciones">Observaciones</label>
            <textarea
              id="observaciones"
              name="observaciones"
              rows={4}
              value={form.observaciones}
              onChange={handleChange}
            />
          </div>

          <div className="form-field full-width">
            <div className="totals-box">
              <span>
                Mano de obra
                <strong>
                  {totals.subtotalManoObra.toLocaleString('es-AR', {
                    style: 'currency',
                    currency: 'ARS',
                  })}
                </strong>
              </span>
              <span>
                Materiales
                <strong>
                  {totals.subtotalMateriales.toLocaleString('es-AR', {
                    style: 'currency',
                    currency: 'ARS',
                  })}
                </strong>
              </span>
              <span>
                Total
                <strong>
                  {totals.totalGeneral.toLocaleString('es-AR', {
                    style: 'currency',
                    currency: 'ARS',
                  })}
                </strong>
              </span>
            </div>
          </div>

          {error && <p className="error">{error}</p>}

          <div className="form-actions">
            <button
              type="submit"
              className="button primary"
              disabled={submitting}
            >
              {submitting ? 'Guardando…' : 'Guardar presupuesto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default BudgetForm

