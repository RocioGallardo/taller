import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteBudget, getBudget } from '../services/budgets'
import './Budgets.css'
import './Clients.css'

const ESTADO_LABELS = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
}

function BudgetDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [budget, setBudget] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const fetchBudget = async () => {
      try {
        setLoading(true)
        const data = await getBudget(id)
        if (!data) {
          setError('No encontramos este presupuesto.')
          return
        }
        setBudget(data)
      } catch (err) {
        console.error(err)
        setError('Ocurrió un error al cargar el presupuesto.')
      } finally {
        setLoading(false)
      }
    }

    fetchBudget()
  }, [id])

  const enviadoEl = useMemo(() => {
    if (!budget?.enviadoPorWhatsapp?.fecha?.toDate) return null
    return budget.enviadoPorWhatsapp.fecha
      .toDate()
      .toLocaleString('es-AR')
  }, [budget])

  const enviarPorWhatsapp = () => {
    if (!budget) return
    if (!budget.clienteTelefono) {
      alert(
        'El cliente no tiene un número de teléfono cargado. Editá el cliente para agregarlo.',
      )
      return
    }

    const telefono = budget.clienteTelefono.replace(/\D/g, '')
    if (!telefono) {
      alert(
        'El número de teléfono del cliente no es válido. Verificalo antes de enviar.',
      )
      return
    }

    const texto = [
      `Hola ${budget.clienteNombre}, te comparto el presupuesto para ${budget.vehiculo || 'tu vehículo'}:`,
      '',
      ...budget.items.map((item) => {
        const subtotal = item.subtotal?.toLocaleString('es-AR', {
          style: 'currency',
          currency: 'ARS',
        })
        return `• ${item.descripcion} — ${subtotal}`
      }),
      '',
      `Total mano de obra: ${budget.subtotalManoObra.toLocaleString('es-AR', {
        style: 'currency',
        currency: 'ARS',
      })}`,
      `Total materiales: ${budget.subtotalMateriales.toLocaleString('es-AR', {
        style: 'currency',
        currency: 'ARS',
      })}`,
      `TOTAL: ${budget.totalGeneral.toLocaleString('es-AR', {
        style: 'currency',
        currency: 'ARS',
      })}`,
      '',
      'Quedo atento a tu confirmación. ¡Gracias!',
    ].join('\n')

    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleDelete = async () => {
    const confirmation = window.confirm(
      '¿Eliminar este presupuesto? Esta acción no se puede deshacer.',
    )
    if (!confirmation) return

    try {
      setDeleting(true)
      await deleteBudget(id)
      navigate('/presupuestos', { replace: true })
    } catch (err) {
      console.error(err)
      setError('No pudimos eliminar el presupuesto. Intentalo de nuevo.')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="budgets-page">
        <p>Cargando presupuesto…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="budgets-page">
        <header className="page-header">
          <h2>Presupuesto</h2>
        </header>
        <div className="card">
          <p className="error">{error}</p>
          <Link to="/presupuestos" className="button">
            ← Volver
          </Link>
        </div>
      </div>
    )
  }

  if (!budget) return null

  const estadoLegible = ESTADO_LABELS[budget.estado] ?? budget.estado

  return (
    <div className="budgets-page">
      <header className="page-header">
        <div>
          <h2>Presupuesto #{budget.id.slice(-6).toUpperCase()}</h2>
          <p>
            Cliente: <strong>{budget.clienteNombre || '—'}</strong>
          </p>
        </div>
        <div className="header-actions">
          <Link to="/presupuestos" className="button">
            ← Volver
          </Link>
          <Link to={`/presupuestos/${budget.id}/editar`} className="button primary">
            Editar
          </Link>
          <button
            type="button"
            className="button ghost"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </header>

      <div className="detail-grid">
        <section className="card">
          <h3>Datos generales</h3>
          <dl className="detail-list">
            <div>
              <dt>Estado</dt>
              <dd>
                <span className={`badge status-${budget.estado}`}>
                  {estadoLegible}
                </span>
              </dd>
            </div>
            <div>
              <dt>Vehículo</dt>
              <dd>{budget.vehiculo || '—'}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>
                {budget.totalGeneral.toLocaleString('es-AR', {
                  style: 'currency',
                  currency: 'ARS',
                })}
              </dd>
            </div>
            {enviadoEl && (
              <div>
                <dt>Enviado por WhatsApp</dt>
                <dd>{enviadoEl}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="card full-width">
          <h3>Ítems incluidos</h3>
          <table className="budgets-table">
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Mano de obra</th>
                <th>Materiales</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {budget.items.map((item, index) => (
                <tr key={index}>
                  <td>{item.descripcion}</td>
                  <td>
                    {Number(item.manoObra || 0).toLocaleString('es-AR', {
                      style: 'currency',
                      currency: 'ARS',
                    })}
                  </td>
                  <td>
                    {Number(item.materiales || 0).toLocaleString('es-AR', {
                      style: 'currency',
                      currency: 'ARS',
                    })}
                  </td>
                  <td>
                    {Number(item.subtotal || 0).toLocaleString('es-AR', {
                      style: 'currency',
                      currency: 'ARS',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card full-width">
          <h3>Totales</h3>
          <div className="totals-box">
            <span>
              Mano de obra
              <strong>
                {budget.subtotalManoObra.toLocaleString('es-AR', {
                  style: 'currency',
                  currency: 'ARS',
                })}
              </strong>
            </span>
            <span>
              Materiales
              <strong>
                {budget.subtotalMateriales.toLocaleString('es-AR', {
                  style: 'currency',
                  currency: 'ARS',
                })}
              </strong>
            </span>
            <span>
              Total
              <strong>
                {budget.totalGeneral.toLocaleString('es-AR', {
                  style: 'currency',
                  currency: 'ARS',
                })}
              </strong>
            </span>
          </div>
        </section>

        <section className="card full-width">
          <h3>Observaciones</h3>
          <p>{budget.observaciones || '—'}</p>
          <button
            type="button"
            className="button primary"
            onClick={enviarPorWhatsapp}
          >
            Abrir en WhatsApp
          </button>
        </section>
      </div>
    </div>
  )
}

export default BudgetDetail

