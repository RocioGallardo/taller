import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { listClients, createClient } from '../services/clients'
import { getBudget, updateBudget, setBudgetAttachments } from '../services/budgets'
import { uploadBudgetAttachment, deleteStoredFile } from '../services/storage'
import './Budgets.css'
import './Clients.css'

const ESTADOS = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'aprobado', label: 'Aprobado' },
  { value: 'rechazado', label: 'Rechazado' },
]

const EMPTY_ITEM = {
  descripcion: '',
  manoObra: '',
  materiales: '',
  usaPanos: false,
  cantidadPanos: '',
  precioPorPano: '',
  subtotal: 0,
}

const INITIAL_FORM = {
  clienteId: '',
  estado: 'borrador',
  vehiculo: '',
  aseguradora: '',
  numeroPoliza: '',
  numeroSiniestro: '',
  items: [{ ...EMPTY_ITEM }],
  observaciones: '',
}

const INITIAL_NEW_CLIENT = {
  nombre: '',
  telefono: '',
  email: '',
  direccion: '',
}

function calculateSubtotal(item) {
  const manoObra = Number(item.manoObra || 0)
  const materiales = Number(item.materiales || 0)
  const panos = item.usaPanos
    ? Number(item.cantidadPanos || 0) * Number(item.precioPorPano || 0)
    : 0
  return manoObra + materiales + panos
}

function BudgetEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClient, setNewClient] = useState(INITIAL_NEW_CLIENT)
  const [creatingClient, setCreatingClient] = useState(false)

  const [existingAttachments, setExistingAttachments] = useState([])
  const [attachments, setAttachments] = useState([])

  useEffect(() => {
    return () => {
      attachments.forEach((attachment) => {
        if (attachment.preview) URL.revokeObjectURL(attachment.preview)
      })
    }
  }, [attachments])

  useEffect(() => {
    const loadClients = async () => {
      try {
        setLoadingClients(true)
        const data = await listClients()
        setClients(data)
      } catch (err) {
        console.error(err)
        setError('No pudimos cargar los clientes disponibles.')
      } finally {
        setLoadingClients(false)
      }
    }

    loadClients()
  }, [])

  useEffect(() => {
    const loadBudget = async () => {
      try {
        setLoading(true)
        const data = await getBudget(id)
        if (!data) {
          setError('No encontramos este presupuesto.')
          return
        }
        setForm({
          clienteId: data.clienteId ?? '',
          estado: data.estado ?? 'borrador',
          vehiculo: data.vehiculo ?? '',
          aseguradora: data.aseguradora ?? '',
          numeroPoliza: data.numeroPoliza ?? '',
          numeroSiniestro: data.numeroSiniestro ?? '',
          items: data.items?.length
            ? data.items.map((item) => ({
                descripcion: item.descripcion ?? '',
                manoObra: item.manoObra?.toString() ?? '',
                materiales: item.materiales?.toString() ?? '',
                usaPanos: Boolean(item.usaPanos),
                cantidadPanos: item.cantidadPanos?.toString() ?? '',
                precioPorPano: item.precioPorPano?.toString() ?? '',
                subtotal: Number(item.subtotal ?? calculateSubtotal(item)),
              }))
            : [{ ...EMPTY_ITEM }],
          observaciones: data.observaciones ?? '',
        })
        setExistingAttachments(data.adjuntos ?? [])
      } catch (err) {
        console.error(err)
        setError('No pudimos cargar el presupuesto.')
      } finally {
        setLoading(false)
      }
    }

    loadBudget()
  }, [id])

  useEffect(() => {
    if (clients.length === 0 || !form.clienteId) return
    const selected = clients.find((client) => client.id === form.clienteId)
    if (selected) {
      setSearchTerm(selected.nombre)
    }
  }, [clients, form.clienteId])

  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return clients
    const normalized = searchTerm.trim().toLowerCase()
    return clients.filter((client) =>
      client.nombre.toLowerCase().includes(normalized),
    )
  }, [clients, searchTerm])

  const suggestedName = useMemo(() => {
    const term = searchTerm.trim()
    if (!term) return ''
    const exists = clients.some(
      (client) => client.nombre.toLowerCase() === term.toLowerCase(),
    )
    return exists ? '' : term
  }, [clients, searchTerm])

  const totals = useMemo(() => {
    const subtotalManoObra = form.items.reduce(
      (acc, item) => acc + Number(item.manoObra || 0),
      0,
    )
    const subtotalMateriales = form.items.reduce(
      (acc, item) => acc + Number(item.materiales || 0),
      0,
    )
    const subtotalPanos = form.items.reduce((acc, item) => {
      if (!item.usaPanos) return acc
      return (
        acc + Number(item.cantidadPanos || 0) * Number(item.precioPorPano || 0)
      )
    }, 0)
    const totalGeneral = subtotalManoObra + subtotalMateriales + subtotalPanos
    return { subtotalManoObra, subtotalMateriales, subtotalPanos, totalGeneral }
  }, [form.items])

  const handleFormChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleItemChange = (index, field, value) => {
    setForm((prev) => {
      const items = prev.items.map((item, idx) => {
        if (idx !== index) return item
        const updated = {
          ...item,
          [field]: field === 'usaPanos' ? Boolean(value) : value,
        }
        return { ...updated, subtotal: calculateSubtotal(updated) }
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

  const handleAttachmentChange = (event) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return
    const mapped = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))
    setAttachments((prev) => [...prev, ...mapped])
  }

  const removeAttachment = (index) => {
    setAttachments((prev) => {
      const next = [...prev]
      const [removed] = next.splice(index, 1)
      if (removed?.preview) URL.revokeObjectURL(removed.preview)
      return next
    })
  }

  const removeExistingAttachment = async (attachmentIndex) => {
    const attachment = existingAttachments[attachmentIndex]
    if (!attachment) return
    let updated = existingAttachments
    try {
      await deleteStoredFile(attachment.storagePath)
    } catch (storageError) {
      console.warn('No se pudo eliminar el archivo de storage', storageError)
    }
    updated = existingAttachments.filter((_, index) => index !== attachmentIndex)
    setExistingAttachments(updated)
    try {
      await setBudgetAttachments(id, updated)
    } catch (updateError) {
      console.warn('No se pudo actualizar los adjuntos del presupuesto', updateError)
    }
  }

  const handleCreateClient = async (event) => {
    event.preventDefault()
    if (!newClient.nombre.trim()) {
      setError('Ingresá el nombre del nuevo cliente.')
      return
    }

    try {
      setCreatingClient(true)
      setError(null)
      const payload = {
        nombre: newClient.nombre.trim(),
        telefono: newClient.telefono.trim(),
        email: newClient.email.trim() || null,
        direccion: newClient.direccion.trim() || null,
        vehiculos: [],
        trabajosActivos: 0,
      }
      const created = await createClient(payload)
      setClients((prev) => [created, ...prev])
      setForm((prev) => ({ ...prev, clienteId: created.id }))
      setSearchTerm(created.nombre)
      setShowNewClient(false)
      setNewClient(INITIAL_NEW_CLIENT)
    } catch (clientError) {
      console.error(clientError)
      setError('No pudimos crear el cliente. Revisá los datos e intentá nuevamente.')
    } finally {
      setCreatingClient(false)
    }
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
      const payload = {
        clienteId: form.clienteId,
        clienteNombre: cliente?.nombre ?? '',
        clienteTelefono: cliente?.telefono ?? '',
        estado: form.estado,
        vehiculo: form.vehiculo,
        aseguradora: form.aseguradora,
        numeroPoliza: form.numeroPoliza,
        numeroSiniestro: form.numeroSiniestro,
        items: form.items.map((item) => ({
          ...item,
          manoObra: Number(item.manoObra || 0),
          materiales: Number(item.materiales || 0),
          cantidadPanos: Number(item.cantidadPanos || 0),
          precioPorPano: Number(item.precioPorPano || 0),
          subtotal: calculateSubtotal(item),
        })),
        subtotalManoObra: totals.subtotalManoObra,
        subtotalMateriales: totals.subtotalMateriales,
        totalGeneral: totals.totalGeneral,
        observaciones: form.observaciones,
        adjuntos: existingAttachments,
      }

      await updateBudget(id, payload)

      const uploaded = []
      for (const attachment of attachments) {
        try {
          const meta = await uploadBudgetAttachment(id, attachment.file)
          uploaded.push(meta)
        } catch (uploadError) {
          console.error('No se pudo subir un adjunto:', uploadError)
        }
      }

      const finalAttachments = [...existingAttachments, ...uploaded]
      await setBudgetAttachments(id, finalAttachments)

      attachments.forEach((attachment) => {
        if (attachment.preview) URL.revokeObjectURL(attachment.preview)
      })

      navigate(`/presupuestos/${id}`)
    } catch (submitError) {
      console.error(submitError)
      setError('No pudimos actualizar el presupuesto. Probá nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="budgets-page">
        <p>Cargando presupuesto…</p>
      </div>
    )
  }

  if (error && !submitting) {
    return (
      <div className="budgets-page">
        <header className="page-header">
          <h2>Editar presupuesto</h2>
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

  return (
    <div className="budgets-page">
      <header className="page-header">
        <div>
          <h2>Editar presupuesto</h2>
          <p>Actualizá los datos del presupuesto, incluidos paños y adjuntos.</p>
        </div>
        <Link to={`/presupuestos/${id}`} className="button">
          ← Ver detalle
        </Link>
      </header>

      <div className="card">
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-field full-width">
            <label>Cliente</label>
            <div className="client-picker">
              <input
                type="text"
                placeholder="Buscá por nombre…"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="client-search"
              />
              <select
                value={form.clienteId}
                onChange={(event) => setForm((prev) => ({ ...prev, clienteId: event.target.value }))}
                disabled={loadingClients}
              >
                <option value="">Seleccioná un cliente…</option>
                {filteredClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.nombre}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="button ghost"
                onClick={() => {
                  setShowNewClient((prev) => !prev)
                  if (!showNewClient && suggestedName) {
                    setNewClient((prev) => ({ ...prev, nombre: suggestedName }))
                  }
                }}
              >
                + Nuevo cliente
              </button>
            </div>
            {suggestedName && !showNewClient && (
              <p className="helper-text">
                Sugerencia: crear cliente "{suggestedName}" (según tu búsqueda).
              </p>
            )}
            {showNewClient && (
              <div className="new-client-form">
                <h4>Crear cliente rápido</h4>
                <div className="quick-grid">
                  <div className="form-field">
                    <label htmlFor="nuevo-nombre">Nombre</label>
                    <input
                      id="nuevo-nombre"
                      name="nuevoNombre"
                      value={newClient.nombre}
                      onChange={(event) =>
                        setNewClient((prev) => ({ ...prev, nombre: event.target.value }))
                      }
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="nuevo-telefono">Teléfono</label>
                    <input
                      id="nuevo-telefono"
                      name="nuevoTelefono"
                      value={newClient.telefono}
                      onChange={(event) =>
                        setNewClient((prev) => ({ ...prev, telefono: event.target.value }))
                      }
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="nuevo-email">Email</label>
                    <input
                      id="nuevo-email"
                      name="nuevoEmail"
                      type="email"
                      value={newClient.email}
                      onChange={(event) =>
                        setNewClient((prev) => ({ ...prev, email: event.target.value }))
                      }
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="nuevo-direccion">Dirección</label>
                    <input
                      id="nuevo-direccion"
                      name="nuevoDireccion"
                      value={newClient.direccion}
                      onChange={(event) =>
                        setNewClient((prev) => ({ ...prev, direccion: event.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="quick-actions">
                  <button
                    type="button"
                    className="button ghost"
                    onClick={() => {
                      setShowNewClient(false)
                      setNewClient(INITIAL_NEW_CLIENT)
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="button primary"
                    onClick={handleCreateClient}
                    disabled={creatingClient}
                  >
                    {creatingClient ? 'Creando…' : 'Crear y seleccionar'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="estado">Estado</label>
            <select
              id="estado"
              name="estado"
              value={form.estado}
              onChange={handleFormChange}
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
              onChange={handleFormChange}
            />
          </div>

          <div className="form-field">
            <label htmlFor="aseguradora">Aseguradora</label>
            <input
              id="aseguradora"
              name="aseguradora"
              value={form.aseguradora}
              onChange={handleFormChange}
            />
          </div>

          <div className="form-field">
            <label htmlFor="numeroPoliza">N° de póliza</label>
            <input
              id="numeroPoliza"
              name="numeroPoliza"
              value={form.numeroPoliza}
              onChange={handleFormChange}
            />
          </div>

          <div className="form-field">
            <label htmlFor="numeroSiniestro">N° de siniestro</label>
            <input
              id="numeroSiniestro"
              name="numeroSiniestro"
              value={form.numeroSiniestro}
              onChange={handleFormChange}
            />
          </div>

          <div className="form-field full-width">
            <label>Ítems del trabajo</label>
            <div className="item-grid">
              <div className="item-row item-header">
                <strong>Descripción</strong>
                <strong>Mano de obra</strong>
                <strong>Materiales</strong>
                <strong>Subtotal</strong>
                <span></span>
              </div>
              {form.items.map((item, index) => (
                <div className="item-row" key={`item-${index}`}>
                  <div className="item-body">
                    <input
                      placeholder="Ej: Capot - Reparación de golpe"
                      value={item.descripcion}
                      onChange={(event) =>
                        handleItemChange(index, 'descripcion', event.target.value)
                      }
                    />
                    <div className="item-numbers">
                      <input
                        type="number"
                        min="0"
                        value={item.manoObra}
                        onChange={(event) =>
                          handleItemChange(index, 'manoObra', event.target.value)
                        }
                        placeholder="Mano de obra"
                      />
                      <input
                        type="number"
                        min="0"
                        value={item.materiales}
                        onChange={(event) =>
                          handleItemChange(index, 'materiales', event.target.value)
                        }
                        placeholder="Materiales"
                      />
                      <input type="number" value={calculateSubtotal(item)} readOnly />
                    </div>
                    <div className="item-panos">
                      <label>
                        <input
                          type="checkbox"
                          checked={Boolean(item.usaPanos)}
                          onChange={(event) =>
                            handleItemChange(index, 'usaPanos', event.target.checked)
                          }
                        />
                        Incluir paños de pintura
                      </label>
                      {item.usaPanos && (
                        <div className="panos-grid">
                          <input
                            type="number"
                            min="0"
                            value={item.cantidadPanos}
                            onChange={(event) =>
                              handleItemChange(index, 'cantidadPanos', event.target.value)
                            }
                            placeholder="Cantidad"
                          />
                          <input
                            type="number"
                            min="0"
                            value={item.precioPorPano}
                            onChange={(event) =>
                              handleItemChange(index, 'precioPorPano', event.target.value)
                            }
                            placeholder="Precio por paño"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="button ghost remove"
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
              onChange={handleFormChange}
            />
          </div>

          <div className="form-field full-width">
            <label htmlFor="adjuntos">Adjuntos</label>
            <input
              id="adjuntos"
              type="file"
              accept="image/*"
              multiple
              onChange={handleAttachmentChange}
            />
            {(existingAttachments.length > 0 || attachments.length > 0) && (
              <div className="attachments-grid">
                {existingAttachments.map((attachment, index) => (
                  <div className="attachment-existing" key={`existing-${index}`}>
                    <img src={attachment.url} alt={attachment.nombre} />
                    <div className="attachment-info">
                      <span title={attachment.nombre}>{attachment.nombre}</span>
                      <button
                        type="button"
                        className="button ghost remove"
                        onClick={() => removeExistingAttachment(index)}
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}
                {attachments.map((attachment, index) => (
                  <div className="attachment-preview" key={`new-${index}`}>
                    <img src={attachment.preview} alt={attachment.file.name} />
                    <div className="attachment-info">
                      <span title={attachment.file.name}>{attachment.file.name}</span>
                      <button
                        type="button"
                        className="button ghost remove"
                        onClick={() => removeAttachment(index)}
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

export default BudgetEdit

