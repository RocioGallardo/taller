import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteBudget, getBudget } from '../services/budgets'
import { getClient } from '../services/clients'
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
  const [clienteTelefono, setClienteTelefono] = useState('')

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
        setClienteTelefono(data.clienteTelefono ?? '')

        if (!data.clienteTelefono && data.clienteId) {
          const client = await getClient(data.clienteId)
          if (client?.telefono) {
            setClienteTelefono(client.telefono)
          }
        }
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

  const totals = useMemo(() => {
    if (!budget) {
      return {
        subtotalManoObra: 0,
        subtotalMateriales: 0,
        subtotalPanos: 0,
        totalGeneral: 0,
      }
    }
    const subtotalPanos = budget.items?.reduce((acc, item) => {
      if (!item.usaPanos) return acc
      return (
        acc + Number(item.cantidadPanos || 0) * Number(item.precioPorPano || 0)
      )
    }, 0) ?? 0
    return {
      subtotalManoObra: Number(budget.subtotalManoObra || 0),
      subtotalMateriales: Number(budget.subtotalMateriales || 0),
      subtotalPanos,
      totalGeneral: Number(budget.totalGeneral || 0),
    }
  }, [budget])

  const formatPhoneForWhatsapp = (phone) => {
    if (!phone) return null
    let digits = phone.replace(/\D/g, '')
    if (!digits) return null

    if (digits.startsWith('00')) {
      digits = digits.slice(2)
    }

    if (digits.startsWith('549')) {
      return digits
    }

    if (digits.startsWith('54')) {
      const rest = digits.slice(2).replace(/^0+/, '')
      if (!rest) return null
      return rest.startsWith('9') ? `54${rest}` : `549${rest}`
    }

    digits = digits.replace(/^0+/, '')
    if (digits.length < 9) {
      return null
    }

    return `549${digits}`
  }

  const enviarPorWhatsapp = () => {
    if (!budget) return
    const rawPhone = clienteTelefono ?? budget.clienteTelefono ?? ''
    const digitsDetected = rawPhone.replace(/\D/g, '')
    const telefonoFormateado = formatPhoneForWhatsapp(rawPhone)

    if (!telefonoFormateado) {
      alert(
        `El número de teléfono del cliente no es válido o está incompleto.\nValor actual: ${rawPhone || '(vacío)'}\nDígitos detectados: ${digitsDetected || '(sin dígitos)'}\n\nVerificá que incluya código de área. Ejemplo: 3511234567 o +54 9 351 1234567.\nEditá el cliente para corregirlo.`,
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

    const url = `https://wa.me/${telefonoFormateado}?text=${encodeURIComponent(
      texto,
    )}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleCreateOrder = () => {
    if (!budget) return
    navigate(`/ordenes/nueva?presupuestoId=${budget.id}`)
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
  const puedeCrearOrden = budget.estado === 'aprobado'

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
            className="button"
            onClick={handleCreateOrder}
            disabled={!puedeCrearOrden}
            title={
              puedeCrearOrden
                ? 'Generar una orden de trabajo a partir de este presupuesto'
                : 'Para crear una orden primero marcá el presupuesto como aprobado.'
            }
          >
            Crear orden
          </button>
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
              <dt>Aseguradora</dt>
              <dd>{budget.aseguradora || '—'}</dd>
            </div>
            <div>
              <dt>N° de póliza</dt>
              <dd>{budget.numeroPoliza || '—'}</dd>
            </div>
            <div>
              <dt>N° de siniestro</dt>
              <dd>{budget.numeroSiniestro || '—'}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>
                {totals.totalGeneral.toLocaleString('es-AR', {
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

        <section className="card full-width table-card">
          <h3>Ítems incluidos</h3>
          <div className="table-scroll">
            <table className="budgets-table">
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Mano de obra</th>
                  <th>Materiales</th>
                  <th>Paños</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {budget.items.map((item, index) => {
                  const manoObra = Number(item.manoObra || 0).toLocaleString('es-AR', {
                    style: 'currency',
                    currency: 'ARS',
                  })
                  const materiales = Number(item.materiales || 0).toLocaleString(
                    'es-AR',
                    {
                      style: 'currency',
                      currency: 'ARS',
                    },
                  )
                  const panosMonto = (item.usaPanos
                    ? Number(item.cantidadPanos || 0) * Number(item.precioPorPano || 0)
                    : 0
                  ).toLocaleString('es-AR', {
                    style: 'currency',
                    currency: 'ARS',
                  })
                  const subtotal = Number(item.subtotal || 0).toLocaleString('es-AR', {
                    style: 'currency',
                    currency: 'ARS',
                  })
                  return (
                    <tr key={index}>
                      <td>
                        {item.descripcion}
                        {item.usaPanos && (
                          <small className="helper-text">
                            {Number(item.cantidadPanos || 0)} paños x{' '}
                            {Number(item.precioPorPano || 0).toLocaleString('es-AR', {
                              style: 'currency',
                              currency: 'ARS',
                            })}
                          </small>
                        )}
                      </td>
                      <td>{manoObra}</td>
                      <td>{materiales}</td>
                      <td>{panosMonto}</td>
                      <td>{subtotal}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card full-width">
          <h3>Totales</h3>
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
              Paños
              <strong>
                {totals.subtotalPanos.toLocaleString('es-AR', {
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
        </section>

        <section className="card full-width">
          <h3>Adjuntos</h3>
          {budget.adjuntos?.length ? (
            <div className="attachments-grid">
              {budget.adjuntos.map((attachment) => (
                <a
                  key={attachment.storagePath}
                  className="attachment-existing"
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={attachment.url} alt={attachment.nombre} />
                  <div className="attachment-info">
                    <span title={attachment.nombre}>{attachment.nombre}</span>
                    <span>
                      {Math.round((attachment.size ?? 0) / 1024)} KB
                    </span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p>No hay adjuntos cargados.</p>
          )}
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

