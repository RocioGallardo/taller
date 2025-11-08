import { getDownloadURL, ref, uploadBytes, deleteObject } from 'firebase/storage'
import { storage } from '../lib/firebase'

export async function uploadBudgetAttachment(budgetId, file) {
  if (!storage) throw new Error('Firebase storage is not inicializado')
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  const path = `presupuestos/${budgetId}/${Date.now()}-${safeName}`
  const storageRef = ref(storage, path)
  const snapshot = await uploadBytes(storageRef, file)
  const url = await getDownloadURL(snapshot.ref)
  return {
    url,
    storagePath: snapshot.ref.fullPath,
    nombre: file.name,
    size: file.size,
    contentType: file.type || file.type === '' ? file.type : 'application/octet-stream',
    subidoEn: Date.now(),
  }
}

export async function deleteStoredFile(storagePath) {
  if (!storagePath) return
  const fileRef = ref(storage, storagePath)
  await deleteObject(fileRef)
}
