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

const COLLECTION = 'ordenes'
const ordersCollection = collection(db, COLLECTION)

export async function listOrders() {
  const q = query(ordersCollection, orderBy('fechaCreacion', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(parseOrderSnapshot)
}

export async function getOrder(id) {
  const ref = doc(db, COLLECTION, id)
  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) return null
  return parseOrderSnapshot(snapshot)
}

export async function createOrder(data) {
  const payload = {
    ...formatOrderData(data),
    fechaCreacion: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  }
  const docRef = await addDoc(ordersCollection, payload)
  const saved = await getDoc(docRef)
  return parseOrderSnapshot(saved)
}

export async function updateOrder(id, data) {
  const ref = doc(db, COLLECTION, id)
  await updateDoc(ref, {
    ...formatOrderData(data),
    actualizadoEn: serverTimestamp(),
  })
  return getOrder(id)
}

export async function deleteOrder(id) {
  const ref = doc(db, COLLECTION, id)
  await deleteDoc(ref)
}

function parseOrderSnapshot(snapshot) {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    clienteId: data.clienteId ?? null,
    clienteNombre: data.clienteNombre ?? '',
    clienteTelefono: data.clienteTelefono ?? '',
    presupuestoId: data.presupuestoId ?? null,
    vehiculo: data.vehiculo ?? '',
    estado: data.estado ?? 'pendiente',
    fechaCreacion: data.fechaCreacion ?? null,
    fechaInicio: data.fechaInicio ?? null,
    fechaEntregaEstimada: data.fechaEntregaEstimada ?? null,
    fechaEntregaReal: data.fechaEntregaReal ?? null,
    totalEstimado: Number(data.totalEstimado ?? 0),
    totalGastado: Number(data.totalGastado ?? 0),
    notas: data.notas ?? '',
    creadoEn: data.creadoEn ?? null,
    actualizadoEn: data.actualizadoEn ?? null,
  }
}

function formatOrderData(data) {
  return {
    clienteId: data.clienteId ?? null,
    clienteNombre: data.clienteNombre ?? '',
    clienteTelefono: data.clienteTelefono ?? '',
    presupuestoId: data.presupuestoId ?? null,
    vehiculo: data.vehiculo ?? '',
    estado: data.estado ?? 'pendiente',
    fechaInicio: data.fechaInicio ?? null,
    fechaEntregaEstimada: data.fechaEntregaEstimada ?? null,
    fechaEntregaReal: data.fechaEntregaReal ?? null,
    totalEstimado: Number(data.totalEstimado ?? 0),
    totalGastado: Number(data.totalGastado ?? 0),
    notas: data.notas ?? '',
  }
}

