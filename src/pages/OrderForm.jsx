import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Timestamp } from 'firebase/firestore'
import { createOrder } from '../services/orders'
import { listClients } from '../services/clients'
import { getBudget, listBudgets, setBudgetStatus } from '../services/budgets'
import './Orders.css'
import './Clients.css'

const ESTADOS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'terminada', label: 'Terminada' },
  { value: 'entregada', label: 'Entregada' },
  { value: 'cancelada', label: 'Cancelada' },
]

const INITIAL_STATE = {
  clienteId: '',
  clienteNombre: '',
  clienteTelefono: '',
  presupuestoId: '',
  vehiculo: '',
  estado: 'pendiente',
  fechaInicio: '',
  fechaEntregaEstimada: '',
  fechaEntregaReal: '',
  totalEstimado: '',
  totalGastado: 0,
  notas: '',
}

function toTimestamp(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return Timestamp.fromDate(date)
}

function OrderForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const presupuestoIdParam = searchParams.get('presupuestoId')

  const [form, setForm] = useState(INITIAL_STATE)
  const [clients, setClients] = useState([])
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [clientsData, budgetsData] = await Promise.all([
          listClients(),
          listBudgets(),
        ])
        setClients(clientsData)
        setBudgets(budgetsData)

        if (presupuestoIdParam) {
          const targetBudget =
            budgetsData.find((b) => b.id === presupuestoIdParam) ??
            (await getBudget(presupuestoIdParam))
          if (targetBudget) {
            setForm((prev) => ({
              ...prev,
              clienteId: targetBudget.clienteId ?? '',
              clienteNombre: targetBudget.clienteNombre ?? '',
              clienteTelefono: targetBudget.clienteTelefono ?? '',
              presupuestoId: targetBudget.id,
              vehiculo: targetBudget.vehiculo ?? '',
              totalEstimado: targetBudget.totalGeneral ?? '',
              notas: targetBudget.observaciones ?? '',
            }))
          }
        }
      } catch (err) {
        console.error(err)
        setError('No pudimos cargar los datos necesarios. Probá más tarde.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [presupuestoIdParam])

  const clienteSeleccionado = useMemo(
    () => clients.find((client) => client.id === form.clienteId),
    [clients, form.clienteId],
  )

  useEffect(() => {
    if (clienteSeleccionado) {
      setForm((prev) => ({
        ...prev,
        clienteNombre: clienteSeleccionado.nombre ?? '',
        clienteTelefono: clienteSeleccionado.telefono ?? prev.clienteTelefono,
      }))
    }
  }, [clienteSeleccionado])

  const presupuestoSeleccionado = useMemo(
    () => budgets.find((budget) => budget.id === form.presupuestoId),
    [budgets, form.presupuestoId],
  )

  useEffect(() => {
    if (presupuestoSeleccionado) {
      setForm((prev) => ({
        ...prev,
        clienteId: presupuestoSeleccionado.clienteId ?? prev.clienteId,
        clienteNombre: presupuestoSeleccionado.clienteNombre ?? prev.clienteNombre,
        clienteTelefono:
          presupuestoSeleccionado.clienteTelefono ?? prev.clienteTelefono,
        vehiculo: presupuestoSeleccionado.vehiculo ?? prev.vehiculo,
        totalEstimado:
          presupuestoSeleccionado.totalGeneral ?? prev.totalEstimado,
        notas: prev.notas || presupuestoSeleccionado.observaciones || '',
      }))
    }
  }, [presupuestoSeleccionado])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.clienteId) {
      setError('Seleccioná un cliente para continuar.')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const payload = {
        clienteId: form.clienteId,
        clienteNombre: form.clienteNombre,
        clienteTelefono: form.clienteTelefono,
        presupuestoId: form.presupuestoId || null,
        vehiculo: form.vehiculo,
        estado: form.estado,
        fechaInicio: toTimestamp(form.fechaInicio),
        fechaEntregaEstimada: toTimestamp(form.fechaEntregaEstimada),
        fechaEntregaReal: toTimestamp(form.fechaEntregaReal),
        totalEstimado: Number(form.totalEstimado || 0),
        totalGastado: Number(form.totalGastado || 0),
        notas: form.notas,
      }

      const order = await createOrder(payload)

      if (payload.presupuestoId) {
        try {
          await setBudgetStatus(payload.presupuestoId, 'aprobado')
        } catch (statusError) {
          console.warn(
            'No se pudo actualizar el estado del presupuesto vinculado:',
            statusError,
          )
        }
      }

      navigate(`/ordenes/${order.id}`)
    } catch (err) {
      console.error(err)
      setError('No pudimos guardar la orden. Probá nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setForm(INITIAL_STATE)
    setError(null)
  }

  if (loading) {
    return (
      <div className="orders-page">
        <p>Cargando datos…</p>
      </div>
    )
  }

  return (
    <div className="orders-page">
      <header className="page-header">
        <div>
          <h2>Nueva orden de trabajo</h2>
          <p>Registrá una nueva orden asociada a un cliente o presupuesto.</p>
        </div>
        <Link to="/ordenes" className="button">
          ← Volver
        </Link>
      </header>

      <div className="card">
        <form className="form-grid" onSubmit={handleSubmit} onReset={handleReset}>
          <div className="form-field">
            <label htmlFor="clienteId">Cliente</label>
            <select
              id="clienteId"
              name="clienteId"
              value={form.clienteId}
              onChange={handleChange}
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
            <label htmlFor="presupuestoId">Presupuesto vinculado</label>
            <select
              id="presupuestoId"
              name="presupuestoId"
              value={form.presupuestoId}
              onChange={handleChange}
            >
              <option value="">Sin presupuesto</option>
              {budgets.map((budget) => (
                <option key={budget.id} value={budget.id}>
                  {budget.clienteNombre || '—'} · {budget.vehiculo || 'Sin vehículo'}
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
              value={form.vehiculo}
              onChange={handleChange}
              placeholder="Marca, modelo, patente"
            />
          </div>

          <div className="form-field">
            <label htmlFor="fechaInicio">Fecha de inicio</label>
            <input
              id="fechaInicio"
              name="fechaInicio"
              type="date"
              value={form.fechaInicio}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label htmlFor="fechaEntregaEstimada">Entrega estimada</label>
            <input
              id="fechaEntregaEstimada"
              name="fechaEntregaEstimada"
              type="date"
              value={form.fechaEntregaEstimada}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label htmlFor="fechaEntregaReal">Entrega real</label>
            <input
              id="fechaEntregaReal"
              name="fechaEntregaReal"
              type="date"
              value={form.fechaEntregaReal}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label htmlFor="totalEstimado">Total estimado</label>
            <input
              id="totalEstimado"
              name="totalEstimado"
              type="number"
              min="0"
              step="0.01"
              value={form.totalEstimado}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label htmlFor="clienteTelefono">Teléfono de contacto</label>
            <input
              id="clienteTelefono"
              name="clienteTelefono"
              value={form.clienteTelefono}
              onChange={handleChange}
              placeholder="Ej: +54 9 351..."
            />
          </div>

          <div className="form-field full-width">
            <label htmlFor="notas">Notas</label>
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
            <button type="submit" className="button primary" disabled={submitting}>
              {submitting ? 'Guardando…' : 'Guardar orden'}
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

export default OrderForm

