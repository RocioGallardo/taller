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

const COLLECTION = 'gastos'

const expensesCollection = collection(db, COLLECTION)

export async function listExpenses() {
  const q = query(expensesCollection, orderBy('fecha', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(parseExpenseSnapshot)
}

export async function getExpense(id) {
  const ref = doc(db, COLLECTION, id)
  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) return null
  return parseExpenseSnapshot(snapshot)
}

export async function createExpense(data) {
  const payload = {
    ...formatExpenseData(data),
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  }
  const docRef = await addDoc(expensesCollection, payload)
  const saved = await getDoc(docRef)
  return parseExpenseSnapshot(saved)
}

export async function updateExpense(id, data) {
  const ref = doc(db, COLLECTION, id)
  await updateDoc(ref, {
    ...formatExpenseData(data),
    actualizadoEn: serverTimestamp(),
  })
  return getExpense(id)
}

export async function deleteExpense(id) {
  const ref = doc(db, COLLECTION, id)
  await deleteDoc(ref)
}

function parseExpenseSnapshot(snapshot) {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    tipo: data.tipo ?? 'general',
    descripcion: data.descripcion ?? '',
    monto: Number(data.monto ?? 0),
    fecha: data.fecha ?? null,
    metodoPago: data.metodoPago ?? '',
    comprobante: data.comprobante ?? null,
    notas: data.notas ?? '',
    periodo: data.periodo ?? '',
    ordenId: data.ordenId ?? null,
    empleadoNombre: data.empleadoNombre ?? '',
    creadoEn: data.creadoEn ?? null,
    actualizadoEn: data.actualizadoEn ?? null,
  }
}

function formatExpenseData(data) {
  const fecha = data.fecha
  let periodo = data.periodo ?? ''
  if (!periodo && fecha?.toDate) {
    const jsDate = fecha.toDate()
    periodo = `${jsDate.getFullYear()}-${String(jsDate.getMonth() + 1).padStart(2, '0')}`
  } else if (!periodo && typeof fecha === 'string' && fecha.length >= 7) {
    periodo = fecha.slice(0, 7)
  }

  return {
    tipo: data.tipo ?? 'general',
    descripcion: data.descripcion ?? '',
    monto: Number(data.monto ?? 0),
    fecha: data.fecha ?? null,
    metodoPago: data.metodoPago ?? '',
    comprobante: data.comprobante ?? null,
    notas: data.notas ?? '',
    periodo,
    ordenId: data.ordenId ?? null,
    empleadoNombre: data.empleadoNombre ?? '',
  }
}

