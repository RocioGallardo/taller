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

const COLLECTION = 'clientes'

const clientsCollection = collection(db, COLLECTION)

export async function listClients() {
  const q = query(clientsCollection, orderBy('creadoEn', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(parseClientSnapshot)
}

export async function getClient(id) {
  const ref = doc(db, COLLECTION, id)
  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) return null
  return parseClientSnapshot(snapshot)
}

export async function createClient(data) {
  const payload = {
    ...formatClientData(data),
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  }
  const docRef = await addDoc(clientsCollection, payload)
  const saved = await getDoc(docRef)
  return parseClientSnapshot(saved)
}

export async function updateClient(id, data) {
  const ref = doc(db, COLLECTION, id)
  await updateDoc(ref, {
    ...formatClientData(data),
    actualizadoEn: serverTimestamp(),
  })
  return getClient(id)
}

export async function deleteClient(id) {
  const ref = doc(db, COLLECTION, id)
  await deleteDoc(ref)
}

function parseClientSnapshot(snapshot) {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    nombre: data.nombre ?? '',
    telefono: data.telefono ?? '',
    email: data.email ?? null,
    direccion: data.direccion ?? null,
    vehiculos: data.vehiculos ?? [],
    notas: data.notas ?? '',
    trabajosActivos: data.trabajosActivos ?? 0,
    creadoEn: data.creadoEn ?? null,
    actualizadoEn: data.actualizadoEn ?? null,
  }
}

function formatClientData(data) {
  return {
    nombre: data.nombre ?? '',
    telefono: data.telefono ?? '',
    email: data.email ?? null,
    direccion: data.direccion ?? null,
    vehiculos: data.vehiculos ?? [],
    notas: data.notas ?? '',
    trabajosActivos: data.trabajosActivos ?? 0,
  }
}