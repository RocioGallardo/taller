import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Timestamp } from 'firebase/firestore'
import { getIncome, updateIncome } from '../services/incomes'
import { listOrders } from '../services/orders'
import { listClients } from '../services/clients'
import './Incomes.css'
import './Clients.css'

const TIPOS = [
  { value: 'cobro_cliente', label: 'Cobro de cliente' },
  { value: 'adelanto', label: 'Adelanto' },
  { value: 'otros', label: 'Otros ingresos' },
]

const METODOS = ['Transferencia', 'Efectivo', 'Tarjeta', 'Cheque', 'Otro']

const EMPTY_FORM = {
  tipo: 'cobro_cliente',
  descripcion: '',
  monto: '',
  fecha: '',
  metodoPago: '',
  notas: '',
  clienteId: '',
  aplicaciones: [],
}

function IncomeEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [orders, setOrders] = useState([])
  const [clients, setClients] = useState([])
  const [loadingAux, setLoadingAux] = useState(true)

  const ordersById = useMemo(() => {
    const map = new Map()
    orders.forEach((order) => {
      map.set(order.id, order)
    })
    return map
  }, [orders])

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [income, ordersData, clientsData] = await Promise.all([
          getIncome(id),
          listOrders(),
          listClients(),
        ])
        if (!income) {
          setError('No encontramos este ingreso.')
          return
        }

        setForm({
          tipo: income.tipo,
          descripcion: income.descripcion,
          monto: income.monto.toString(),
          fecha: income.fecha?.toDate
            ? income.fecha.toDate().toISOString().slice(0, 10)
            : '',
          metodoPago: income.metodoPago ?? '',
          notas: income.notas ?? '',
          clienteId: income.clienteId ?? income.aplicaciones[0]?.clienteId ?? '',
          aplicaciones: income.aplicaciones.map((ap) => ({
            ordenId: ap.ordenId ?? '',
            monto: ap.monto?.toString() ?? '',
          })),
        })

        setOrders(
          ordersData.map((order) => ({
            id: order.id,
            clienteId: order.clienteId ?? null,
            clienteNombre: order.clienteNombre ?? 'Cliente',
            vehiculo: order.vehiculo ?? 'Vehículo',
            estado: order.estado ?? 'pendiente',
            label: `${order.clienteNombre || 'Cliente'} · ${order.vehiculo || 'Vehículo'}`,
          })),
        )
        setClients(clientsData)
      } catch (err) {
        console.error(err)
        setError('Ocurrió un error al cargar el ingreso.')
      } finally {
        setLoading(false)
        setLoadingAux(false)
      }
    }

    loadData()
  }, [id])

  const handleChange = (event) => {
    const { name, value } = event.target

    if (name === 'clienteId') {
      setForm((prev) => ({
        ...prev,
        clienteId: value,
        aplicaciones: prev.aplicaciones.filter((ap) => {
          if (!value) return true
          const order = ordersById.get(ap.ordenId)
          return order ? order.clienteId === value : false
        }),
      }))
      return
    }

    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const clienteSeleccionado = useMemo(
    () => clients.find((client) => client.id === form.clienteId),
    [clients, form.clienteId],
  )

  const aplicarOrdersDisponibles = useMemo(() => {
    if (!form.clienteId) return orders
    return orders.filter((order) => order.clienteId === form.clienteId)
  }, [form.clienteId, orders])

  const totalAplicado = useMemo(
    () =>
      form.aplicaciones.reduce(
        (acc, ap) => acc + (ap.monto ? Number(ap.monto) : 0),
        0,
      ),
    [form.aplicaciones],
  )

  const saldoPrevisto = useMemo(() => {
    const monto = Number(form.monto || 0)
    return monto - totalAplicado
  }, [form.monto, totalAplicado])

  const handleAplicacionChange = (index, field, value) => {
    setForm((prev) => {
      const next = [...prev.aplicaciones]
      next[index] = {
        ...next[index],
        [field]: value,
      }
      return { ...prev, aplicaciones: next }
    })
  }

  const addAplicacion = () => {
    setForm((prev) => ({
      ...prev,
      aplicaciones: [
        ...prev.aplicaciones,
        {
          ordenId: '',
          monto: '',
        },
      ],
    }))
  }

  const removeAplicacion = (index) => {
    setForm((prev) => ({
      ...prev,
      aplicaciones: prev.aplicaciones.filter((_, idx) => idx !== index),
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.descripcion.trim()) {
      setError('La descripción es obligatoria.')
      return
    }

    if (!form.monto || Number(form.monto) <= 0) {
      setError('El monto debe ser mayor a 0.')
      return
    }

    const aplicacionesLimpias = form.aplicaciones
      .map((ap) => {
        const orden = ordersById.get(ap.ordenId)
        return {
          ordenId: ap.ordenId || null,
          ordenNombre: orden?.vehiculo
            ? `${orden.clienteNombre || 'Cliente'} · ${orden.vehiculo}`
            : orden?.clienteNombre ?? '',
          clienteId: orden?.clienteId ?? null,
          clienteNombre: orden?.clienteNombre ?? '',
          monto: Number(ap.monto || 0),
        }
      })
      .filter((ap) => ap.ordenId && ap.monto > 0)

    const totalAplicadoValidado = aplicacionesLimpias.reduce(
      (acc, ap) => acc + ap.monto,
      0,
    )

    if (totalAplicadoValidado > Number(form.monto)) {
      setError('Las aplicaciones a órdenes superan el monto del ingreso.')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const fechaDate = new Date(form.fecha)
      const timestamp = Timestamp.fromDate(fechaDate)
      const periodo = form.fecha.slice(0, 7)

      const clienteBase =
        form.clienteId && clienteSeleccionado
          ? {
              clienteId: form.clienteId,
              clienteNombre: clienteSeleccionado.nombre,
            }
          : aplicacionesLimpias[0]
            ? {
                clienteId: aplicacionesLimpias[0].clienteId,
                clienteNombre: aplicacionesLimpias[0].clienteNombre,
              }
            : { clienteId: null, clienteNombre: '' }

      await updateIncome(id, {
        tipo: form.tipo,
        descripcion: form.descripcion.trim(),
        monto: Number(form.monto),
        fecha: timestamp,
        metodoPago: form.metodoPago.trim(),
        notas: form.notas.trim(),
        periodo,
        clienteId: clienteBase.clienteId,
        clienteNombre: clienteBase.clienteNombre,
        aplicaciones: aplicacionesLimpias,
        saldoDisponible: Number((Number(form.monto) - totalAplicadoValidado).toFixed(2)),
      })

      navigate('/ingresos')
    } catch (err) {
      console.error(err)
      setError('No pudimos actualizar el ingreso. Probá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="incomes-page">
        <p>Cargando ingreso…</p>
      </div>
    )
  }

  if (error && !submitting) {
    return (
      <div className="incomes-page">
        <header className="page-header">
          <h2>Editar ingreso</h2>
        </header>
        <div className="card">
          <p className="error">{error}</p>
          <Link to="/ingresos" className="button">
            ← Volver
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="incomes-page">
      <header className="page-header">
        <div>
          <h2>Editar ingreso</h2>
          <p>Actualizá los datos del ingreso seleccionado.</p>
        </div>
        <Link to="/ingresos" className="button">
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

          <div className="form-field">
            <label htmlFor="clienteId">Cliente (opcional)</label>
            <select
              id="clienteId"
              name="clienteId"
              value={form.clienteId}
              onChange={handleChange}
              disabled={loadingAux}
            >
              <option value="">Sin cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.nombre}
                </option>
              ))}
            </select>
            <small>
              Seleccionar al cliente ayuda a filtrar las órdenes disponibles y a
              completar la información del ingreso.
            </small>
          </div>

          <div className="form-field full-width">
            <label>Aplicar a órdenes (opcional)</label>
            {form.aplicaciones.length === 0 && (
              <p className="helper-text">
                Agregá las órdenes a las que corresponde este cobro si querés ver el
                avance en cada trabajo.
              </p>
            )}
            {form.aplicaciones.map((aplicacion, index) => (
              <div className="application-row" key={`aplicacion-${index}`}>
                <div className="application-order">
                  <select
                    value={aplicacion.ordenId}
                    onChange={(event) =>
                      handleAplicacionChange(index, 'ordenId', event.target.value)
                    }
                    disabled={loadingAux || aplicarOrdersDisponibles.length === 0}
                  >
                    <option value="">Seleccioná una orden…</option>
                    {aplicarOrdersDisponibles.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="application-amount">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={aplicacion.monto}
                    onChange={(event) =>
                      handleAplicacionChange(index, 'monto', event.target.value)
                    }
                    placeholder="Monto"
                  />
                </div>
                <button
                  type="button"
                  className="button ghost remove"
                  onClick={() => removeAplicacion(index)}
                >
                  Quitar
                </button>
              </div>
            ))}
            <div className="application-actions">
              <button
                type="button"
                className="button ghost"
                onClick={addAplicacion}
                disabled={loadingAux || aplicarOrdersDisponibles.length === 0}
              >
                + Agregar orden
              </button>
              <span className="helper-text">
                Total aplicado:{' '}
                {totalAplicado.toLocaleString('es-AR', {
                  style: 'currency',
                  currency: 'ARS',
                })}{' '}
                · Saldo estimado:{' '}
                {saldoPrevisto.toLocaleString('es-AR', {
                  style: 'currency',
                  currency: 'ARS',
                })}
              </span>
            </div>
          </div>

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

export default IncomeEdit
