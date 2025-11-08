import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Timestamp } from 'firebase/firestore'
import { getOrder, updateOrder } from '../services/orders'
import { listClients } from '../services/clients'
import { listBudgets, setBudgetStatus } from '../services/budgets'
import './Orders.css'
import './Clients.css'

const ESTADOS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'terminada', label: 'Terminada' },
  { value: 'entregada', label: 'Entregada' },
  { value: 'cancelada', label: 'Cancelada' },
]

const EMPTY_FORM = {
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
  totalGastado: '',
  notas: '',
}

function fromTimestamp(ts) {
  if (!ts?.toDate) return ''
  return ts.toDate().toISOString().slice(0, 10)
}

function toTimestamp(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return Timestamp.fromDate(date)
}

function OrderEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY_FORM)
  const [clients, setClients] = useState([])
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [originalBudgetId, setOriginalBudgetId] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [order, clientsData, budgetsData] = await Promise.all([
          getOrder(id),
          listClients(),
          listBudgets(),
        ])

        if (!order) {
          setError('No encontramos esta orden.')
          return
        }

        setForm({
          clienteId: order.clienteId ?? '',
          clienteNombre: order.clienteNombre ?? '',
          clienteTelefono: order.clienteTelefono ?? '',
          presupuestoId: order.presupuestoId ?? '',
          vehiculo: order.vehiculo ?? '',
          estado: order.estado ?? 'pendiente',
          fechaInicio: fromTimestamp(order.fechaInicio),
          fechaEntregaEstimada: fromTimestamp(order.fechaEntregaEstimada),
          fechaEntregaReal: fromTimestamp(order.fechaEntregaReal),
          totalEstimado: order.totalEstimado?.toString() ?? '',
          totalGastado: order.totalGastado?.toString() ?? '',
          notas: order.notas ?? '',
        })
        setOriginalBudgetId(order.presupuestoId ?? '')

        setClients(clientsData)
        setBudgets(budgetsData)
      } catch (err) {
        console.error(err)
        setError('Ocurrió un problema al cargar la orden.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id])

  const clienteSeleccionado = useMemo(
    () => clients.find((client) => client.id === form.clienteId),
    [clients, form.clienteId],
  )

  useEffect(() => {
    if (clienteSeleccionado) {
      setForm((prev) => ({
        ...prev,
        clienteNombre: clienteSeleccionado.nombre ?? prev.clienteNombre,
        clienteTelefono:
          clienteSeleccionado.telefono ?? prev.clienteTelefono,
      }))
    }
  }, [clienteSeleccionado])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.clienteId) {
      setError('Seleccioná un cliente.')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      await updateOrder(id, {
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
      })

      if (form.presupuestoId && form.presupuestoId !== originalBudgetId) {
        try {
          await setBudgetStatus(form.presupuestoId, 'aprobado')
        } catch (statusError) {
          console.warn(
            'No se pudo actualizar el estado del presupuesto vinculado:',
            statusError,
          )
        }
      }

      navigate(`/ordenes/${id}`)
    } catch (err) {
      console.error(err)
      setError('No pudimos actualizar la orden. Probá nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="orders-page">
        <p>Cargando orden…</p>
      </div>
    )
  }

  if (error && !submitting) {
    return (
      <div className="orders-page">
        <header className="page-header">
          <h2>Editar orden</h2>
        </header>
        <div className="card">
          <p className="error">{error}</p>
          <Link to="/ordenes" className="button">
            ← Volver
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="orders-page">
      <header className="page-header">
        <div>
          <h2>Editar orden</h2>
          <p>Actualizá la información de la orden seleccionada.</p>
        </div>
        <Link to={`/ordenes/${id}`} className="button">
          ← Ver detalle
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
            <label htmlFor="totalGastado">Total gastado</label>
            <input
              id="totalGastado"
              name="totalGastado"
              type="number"
              min="0"
              step="0.01"
              value={form.totalGastado}
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
              {submitting ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default OrderEdit

