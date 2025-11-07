import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Timestamp } from 'firebase/firestore'
import { createExpense } from '../services/expenses'
import './Expenses.css'
import './Clients.css'

const TIPOS = [
  { value: 'general', label: 'General' },
  { value: 'alquiler', label: 'Alquiler' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'insumos', label: 'Insumos' },
  { value: 'herramientas', label: 'Herramientas' },
  { value: 'impuestos', label: 'Impuestos' },
  { value: 'otros', label: 'Otros' },
]

const METODOS = [
  'Transferencia',
  'Efectivo',
  'Tarjeta',
  'Cheque',
  'Otro',
]

const INITIAL_STATE = {
  tipo: 'general',
  descripcion: '',
  monto: '',
  fecha: new Date().toISOString().slice(0, 10),
  metodoPago: '',
  notas: '',
}

function ExpenseForm() {
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL_STATE)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
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

    try {
      setSubmitting(true)
      setError(null)

      const fechaDate = new Date(form.fecha)
      const timestamp = Timestamp.fromDate(fechaDate)
      const periodo = form.fecha.slice(0, 7)

      await createExpense({
        tipo: form.tipo,
        descripcion: form.descripcion.trim(),
        monto: Number(form.monto),
        fecha: timestamp,
        metodoPago: form.metodoPago.trim(),
        notas: form.notas.trim(),
        periodo,
      })

      navigate('/gastos')
    } catch (err) {
      console.error(err)
      setError('No pudimos guardar el gasto. Intentalo de nuevo.')
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
          <h2>Registrar gasto</h2>
          <p>Cargá los gastos para mantener el control mensual.</p>
        </div>
        <Link to="/gastos" className="button">
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
              {submitting ? 'Guardando…' : 'Guardar gasto'}
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

