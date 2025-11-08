import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Timestamp } from 'firebase/firestore'
import { getExpense, updateExpense } from '../services/expenses'
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

const EMPTY_FORM = {
  tipo: 'general',
  descripcion: '',
  monto: '',
  fecha: '',
  metodoPago: '',
  notas: '',
  ordenId: '',
  empleadoNombre: '',
  empleadoCustom: '',
}

function ExpenseEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)

  useEffect(() => {
    const fetchExpense = async () => {
      try {
        setLoading(true)
        const [expense, ordersData] = await Promise.all([
          getExpense(id),
          listOrders(),
        ])
        if (!expense) {
          setError('No encontramos este egreso.')
          return
        }

        setForm({
          tipo: expense.tipo,
          descripcion: expense.descripcion,
          monto: expense.monto.toString(),
          fecha: expense.fecha?.toDate
            ? expense.fecha.toDate().toISOString().slice(0, 10)
            : '',
          metodoPago: expense.metodoPago ?? '',
          notas: expense.notas ?? '',
          ordenId: expense.ordenId ?? '',
          empleadoNombre: EMPLEADOS.includes(expense.empleadoNombre)
            ? expense.empleadoNombre
            : expense.empleadoNombre
              ? 'Otro'
              : '',
          empleadoCustom:
            !EMPLEADOS.includes(expense.empleadoNombre) && expense.empleadoNombre
              ? expense.empleadoNombre
              : '',
        })

        setOrders(
          ordersData.map((order) => ({
            id: order.id,
            label: `${order.clienteNombre || 'Cliente'} · ${order.vehiculo || 'Vehículo'}`,
          })),
        )
      } catch (err) {
        console.error(err)
        setError('Ocurrió un error al cargar el egreso.')
      } finally {
        setLoading(false)
        setOrdersLoading(false)
      }
    }

    fetchExpense()
  }, [id])

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

      await updateExpense(id, {
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
      setError('No pudimos actualizar el egreso. Probá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="expenses-page">
        <p>Cargando egreso…</p>
      </div>
    )
  }

  if (error && !submitting) {
    return (
      <div className="expenses-page">
        <header className="page-header">
          <h2>Editar egreso</h2>
        </header>
        <div className="card">
          <p className="error">{error}</p>
          <Link to="/egresos/gastos" className="button">
            ← Volver
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="expenses-page">
      <header className="page-header">
        <div>
          <h2>Editar egreso</h2>
          <p>Actualizá los datos del egreso seleccionado.</p>
        </div>
        <Link to="/egresos/gastos" className="button">
          ← Volver
        </Link>
      </header>

      <div className="card">
        <form className="form-grid" onSubmit={handleSubmit}>
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
                Si corresponde a una orden, seleccionála para ver este egreso en
                su detalle.
              </small>
            </div>
          )}

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
              {submitting ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ExpenseEdit

