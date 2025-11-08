import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const COLLECTION = 'presupuestos'

const budgetsCollection = collection(db, COLLECTION)

export async function listBudgets() {
  const q = query(budgetsCollection, orderBy('creadoEn', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(parseBudgetSnapshot)
}

export async function getBudget(id) {
  const ref = doc(db, COLLECTION, id)
  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) return null
  return parseBudgetSnapshot(snapshot)
}

export async function createBudget(data) {
  const payload = {
    ...formatBudgetData(data),
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  }
  const docRef = await addDoc(budgetsCollection, payload)
  const saved = await getDoc(docRef)
  return parseBudgetSnapshot(saved)
}

export async function updateBudget(id, data) {
  const ref = doc(db, COLLECTION, id)
  await updateDoc(ref, {
    ...formatBudgetData(data),
    actualizadoEn: serverTimestamp(),
  })
  return getBudget(id)
}

export async function deleteBudget(id) {
  const ref = doc(db, COLLECTION, id)
  await deleteDoc(ref)
}

export async function setBudgetStatus(id, estado) {
  const refBudget = doc(db, COLLECTION, id)
  await updateDoc(refBudget, {
    estado: estado ?? 'aprobado',
    actualizadoEn: serverTimestamp(),
  })
}

function parseBudgetSnapshot(snapshot) {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    clienteId: data.clienteId ?? null,
    clienteNombre: data.clienteNombre ?? '',
    clienteTelefono: data.clienteTelefono ?? '',
    estado: data.estado ?? 'borrador',
    vehiculo: data.vehiculo ?? '',
    aseguradora: data.aseguradora ?? '',
    numeroPoliza: data.numeroPoliza ?? '',
    numeroSiniestro: data.numeroSiniestro ?? '',
    items: data.items ?? [],
    subtotalManoObra: data.subtotalManoObra ?? 0,
    subtotalMateriales: data.subtotalMateriales ?? 0,
    totalGeneral: data.totalGeneral ?? 0,
    observaciones: data.observaciones ?? '',
    adjuntos: data.adjuntos ?? [],
    enviadoPorWhatsapp: data.enviadoPorWhatsapp ?? null,
    creadoEn: data.creadoEn ?? null,
    actualizadoEn: data.actualizadoEn ?? null,
  }
}

function formatBudgetData(data) {
  const items = (data.items ?? []).map((item) => ({
    descripcion: item.descripcion ?? '',
    manoObra: Number(item.manoObra ?? 0),
    materiales: Number(item.materiales ?? 0),
    subtotal: Number(item.subtotal ?? 0),
    usaPanos: Boolean(item.usaPanos ?? false),
    cantidadPanos: Number(item.cantidadPanos ?? 0),
    precioPorPano: Number(item.precioPorPano ?? 0),
  }))

  return {
    clienteId: data.clienteId ?? null,
    clienteNombre: data.clienteNombre ?? '',
    clienteTelefono: data.clienteTelefono ?? '',
    estado: data.estado ?? 'borrador',
    vehiculo: data.vehiculo ?? '',
    aseguradora: data.aseguradora ?? '',
    numeroPoliza: data.numeroPoliza ?? '',
    numeroSiniestro: data.numeroSiniestro ?? '',
    items,
    subtotalManoObra: Number(data.subtotalManoObra ?? 0),
    subtotalMateriales: Number(data.subtotalMateriales ?? 0),
    totalGeneral: Number(data.totalGeneral ?? 0),
    observaciones: data.observaciones ?? '',
    adjuntos: data.adjuntos ?? [],
    enviadoPorWhatsapp: data.enviadoPorWhatsapp ?? null,
  }
}

export async function setBudgetAttachments(id, attachments) {
  const refBudget = doc(db, COLLECTION, id)
  await updateDoc(refBudget, {
    adjuntos: attachments,
    actualizadoEn: serverTimestamp(),
  })
}

