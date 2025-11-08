import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Timestamp } from 'firebase/firestore'
import { createExpense } from '../services/expenses'
import { listOrders } from '../services/orders'
import './Expenses.css'
import './Clients.css'

const TIPOS = [
  { value: 'general', label: 'General' },
  { value: 'alquiler', label: 'Alquiler' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'insumos', label: 'Insumos' },
  { value: 'herramientas', label: 'Herramientas' },
  { value: 'impuestos', label: 'Impuestos' },
  { value: 'sueldos', label: 'Sueldos' },
  { value: 'otros', label: 'Otros' },
]

const METODOS = [
  'Transferencia',
  'Efectivo',
  'Tarjeta',
  'Cheque',
  'Otro',
]

const EMPLEADOS = ['Ariel', 'Maximiliano', 'Otro']

const INITIAL_STATE = {
  tipo: 'general',
  descripcion: '',
  monto: '',
  fecha: new Date().toISOString().slice(0, 10),
  metodoPago: '',
  notas: '',
  ordenId: '',
  empleadoNombre: '',
  empleadoCustom: '',
}

function ExpenseForm() {
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL_STATE)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setOrdersLoading(true)
        const data = await listOrders()
        const opciones = data.map((order) => ({
          id: order.id,
          label: `${order.clienteNombre || 'Cliente'} · ${order.vehiculo || 'Vehículo'}`,
        }))
        setOrders(opciones)
      } catch (err) {
        console.error(err)
      } finally {
        setOrdersLoading(false)
      }
    }

    loadOrders()
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target

    if (name === 'tipo') {
      setForm((prev) => ({
        ...prev,
        [name]: value,
        ordenId: value === 'insumos' ? prev.ordenId : '',
        empleadoNombre: value === 'sueldos' ? prev.empleadoNombre : '',
        empleadoCustom: value === 'sueldos' ? prev.empleadoCustom : '',
      }))
      return
    }

    if (name === 'empleadoNombre') {
      setForm((prev) => ({
        ...prev,
        empleadoNombre: value,
        empleadoCustom: value === 'Otro' ? prev.empleadoCustom : '',
      }))
      return
    }

    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (form.tipo !== 'sueldos' && !form.descripcion.trim()) {
      setError('La descripción del egreso es obligatoria.')
      return
    }

    if (!form.monto || Number(form.monto) <= 0) {
      setError('El monto del egreso debe ser mayor a 0.')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const fechaDate = new Date(form.fecha)
      const timestamp = Timestamp.fromDate(fechaDate)
      const periodo = form.fecha.slice(0, 7)

      let empleadoFinal = ''
      if (form.tipo === 'sueldos') {
        empleadoFinal =
          form.empleadoNombre === 'Otro'
            ? form.empleadoCustom.trim()
            : form.empleadoNombre.trim()

        if (!empleadoFinal) {
          setError('Seleccioná el empleado al que corresponde el sueldo.')
          setSubmitting(false)
          return
        }
      }

      const descripcionFinal = form.descripcion.trim()
        ? form.descripcion.trim()
        : form.tipo === 'sueldos'
          ? `Pago de sueldo - ${empleadoFinal}`
          : ''

      if (!descripcionFinal) {
        setError('La descripción del egreso es obligatoria.')
        setSubmitting(false)
        return
      }

      await createExpense({
        tipo: form.tipo,
        descripcion: descripcionFinal,
        monto: Number(form.monto),
        fecha: timestamp,
        metodoPago: form.metodoPago.trim(),
        notas: form.notas.trim(),
        periodo,
        ordenId:
          form.tipo === 'insumos' && form.ordenId ? form.ordenId : null,
        empleadoNombre: empleadoFinal,
      })

      navigate('/egresos/gastos')
    } catch (err) {
      console.error(err)
      setError('No pudimos guardar el egreso. Intentalo de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setForm(INITIAL_STATE)
    setError(null)
  }

  return (
    <div className="expenses-page">
      <header className="page-header">
        <div>
          <h2>Registrar egreso</h2>
          <p>Cargá los egresos para mantener el control mensual.</p>
        </div>
        <Link to="/egresos/gastos" className="button">
          ← Volver
        </Link>
      </header>

      <div className="card">
        <form className="form-grid" onSubmit={handleSubmit} onReset={handleReset}>
          <div className="form-field">
            <label htmlFor="tipo">Tipo</label>
            <select
              id="tipo"
              name="tipo"
              value={form.tipo}
              onChange={handleChange}
            >
              {TIPOS.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="descripcion">Descripción</label>
            <input
              id="descripcion"
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              placeholder="Ej: Pintura, alquiler, electricidad…"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="monto">Monto</label>
            <input
              id="monto"
              name="monto"
              type="number"
              min="0"
              step="0.01"
              value={form.monto}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="fecha">Fecha</label>
            <input
              id="fecha"
              name="fecha"
              type="date"
              value={form.fecha}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="metodoPago">Método de pago</label>
            <select
              id="metodoPago"
              name="metodoPago"
              value={form.metodoPago}
              onChange={handleChange}
            >
              <option value="">Seleccioná uno…</option>
              {METODOS.map((metodo) => (
                <option key={metodo} value={metodo}>
                  {metodo}
                </option>
              ))}
            </select>
          </div>

          {form.tipo === 'sueldos' && (
            <>
              <div className="form-field">
                <label htmlFor="empleadoNombre">Empleado</label>
                <select
                  id="empleadoNombre"
                  name="empleadoNombre"
                  value={form.empleadoNombre}
                  onChange={handleChange}
                >
                  <option value="">Seleccioná…</option>
                  {EMPLEADOS.map((empleado) => (
                    <option key={empleado} value={empleado}>
                      {empleado}
                    </option>
                  ))}
                </select>
              </div>

              {form.empleadoNombre === 'Otro' && (
                <div className="form-field">
                  <label htmlFor="empleadoCustom">Nombre del empleado</label>
                  <input
                    id="empleadoCustom"
                    name="empleadoCustom"
                    value={form.empleadoCustom}
                    onChange={handleChange}
                    placeholder="Ej: Juan Pérez"
                  />
                </div>
              )}
            </>
          )}

          {form.tipo === 'insumos' && (
            <div className="form-field">
              <label htmlFor="ordenId">Orden de trabajo</label>
              <select
                id="ordenId"
                name="ordenId"
                value={form.ordenId}
                onChange={handleChange}
                disabled={ordersLoading}
              >
                <option value="">Sin orden</option>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.label}
                  </option>
                ))}
              </select>
              <small>
                Opcional: asociá este egreso a una orden para que aparezca en su
                detalle.
              </small>
            </div>
          )}

          <div className="form-field full-width">
            <label htmlFor="notas">Notas</label>
            <textarea
              id="notas"
              name="notas"
              rows={3}
              value={form.notas}
              onChange={handleChange}
            />
          </div>

          {error && <p className="error">{error}</p>}

          <div className="form-actions">
            <button type="submit" className="button primary" disabled={submitting}>
              {submitting ? 'Guardando…' : 'Guardar egreso'}
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

export default ExpenseForm

