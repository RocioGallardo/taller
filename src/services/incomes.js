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

const COLLECTION = 'ingresos'

const incomesCollection = collection(db, COLLECTION)

export async function listIncomes() {
  const q = query(incomesCollection, orderBy('fecha', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(parseIncomeSnapshot)
}

export async function getIncome(id) {
  const ref = doc(db, COLLECTION, id)
  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) return null
  return parseIncomeSnapshot(snapshot)
}

export async function createIncome(data) {
  const payload = {
    ...formatIncomeData(data),
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  }
  const docRef = await addDoc(incomesCollection, payload)
  const saved = await getDoc(docRef)
  return parseIncomeSnapshot(saved)
}

export async function updateIncome(id, data) {
  const ref = doc(db, COLLECTION, id)
  await updateDoc(ref, {
    ...formatIncomeData(data),
    actualizadoEn: serverTimestamp(),
  })
  return getIncome(id)
}

export async function deleteIncome(id) {
  const ref = doc(db, COLLECTION, id)
  await deleteDoc(ref)
}

function parseIncomeSnapshot(snapshot) {
  const data = snapshot.data()
  const aplicacionesRaw = Array.isArray(data.aplicaciones)
    ? data.aplicaciones
    : []

  const aplicaciones = aplicacionesRaw
    .map((item) => ({
      ordenId: item.ordenId ?? null,
      ordenNombre: item.ordenNombre ?? '',
      clienteId: item.clienteId ?? null,
      clienteNombre: item.clienteNombre ?? '',
      monto: Number(item.monto ?? 0),
    }))
    .filter((item) => item.ordenId && item.monto > 0)

  // Compatibilidad con registros antiguos
  if (aplicaciones.length === 0 && data.ordenId) {
    aplicaciones.push({
      ordenId: data.ordenId,
      ordenNombre: data.ordenNombre ?? '',
      clienteId: data.clienteId ?? null,
      clienteNombre: data.clienteNombre ?? '',
      monto: Number(data.monto ?? 0),
    })
  }

  return {
    id: snapshot.id,
    tipo: data.tipo ?? 'cobro',
    descripcion: data.descripcion ?? '',
    monto: Number(data.monto ?? 0),
    fecha: data.fecha ?? null,
    metodoPago: data.metodoPago ?? '',
    notas: data.notas ?? '',
    periodo: data.periodo ?? '',
    ordenId: data.ordenId ?? aplicaciones[0]?.ordenId ?? null,
    clienteId: data.clienteId ?? aplicaciones[0]?.clienteId ?? null,
    clienteNombre: data.clienteNombre ?? aplicaciones[0]?.clienteNombre ?? '',
    aplicaciones,
    saldoDisponible: Number(data.saldoDisponible ?? Math.max(0, Number(data.monto ?? 0) - aplicaciones.reduce((acc, ap) => acc + ap.monto, 0))),
    creadoEn: data.creadoEn ?? null,
    actualizadoEn: data.actualizadoEn ?? null,
  }
}

function formatIncomeData(data) {
  const fecha = data.fecha
  let periodo = data.periodo ?? ''
  if (!periodo && fecha?.toDate) {
    const jsDate = fecha.toDate()
    periodo = `${jsDate.getFullYear()}-${String(jsDate.getMonth() + 1).padStart(2, '0')}`
  } else if (!periodo && typeof fecha === 'string' && fecha.length >= 7) {
    periodo = fecha.slice(0, 7)
  }

  const aplicaciones = Array.isArray(data.aplicaciones)
    ? data.aplicaciones
        .map((item) => ({
          ordenId: item.ordenId ?? null,
          ordenNombre: item.ordenNombre ?? '',
          clienteId: item.clienteId ?? null,
          clienteNombre: item.clienteNombre ?? '',
          monto: Number(item.monto ?? 0),
        }))
        .filter((item) => item.ordenId && item.monto > 0)
    : []

  const monto = Number(data.monto ?? 0)
  const totalAplicado = aplicaciones.reduce((acc, item) => acc + Number(item.monto ?? 0), 0)
  const saldoDisponible = Number(
    data.saldoDisponible ?? Math.max(0, Number((monto - totalAplicado).toFixed(2))),
  )

  const primerAplicacion = aplicaciones[0]

  return {
    tipo: data.tipo ?? 'cobro',
    descripcion: data.descripcion ?? '',
    monto,
    fecha: data.fecha ?? null,
    metodoPago: data.metodoPago ?? '',
    notas: data.notas ?? '',
    periodo,
    ordenId: data.ordenId ?? primerAplicacion?.ordenId ?? null,
    clienteId: data.clienteId ?? primerAplicacion?.clienteId ?? null,
    clienteNombre: data.clienteNombre ?? primerAplicacion?.clienteNombre ?? '',
    aplicaciones,
    saldoDisponible,
  }
}
