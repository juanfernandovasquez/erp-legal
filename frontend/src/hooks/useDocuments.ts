import { useState } from 'react'
import { Documento } from '@/types'
import api from '@/lib/axios'

export function useDocuments() {
  const [documents, setDocuments] = useState<Documento[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = async (casoId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get(`/documents/cases/${casoId}/documents`)
      setDocuments(response.data.data || [])
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Error al cargar documentos')
    } finally {
      setIsLoading(false)
    }
  }

  const uploadDocument = async (casoId: string, file: File, data: any) => {
    setIsLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('nombre', data.nombre)
      formData.append('tipo', data.tipo)
      if (data.descripcion) {
        formData.append('descripcion', data.descripcion)
      }

      const response = await api.post(`/documents/cases/${casoId}/documents/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setDocuments((prev) => [...prev, response.data.data])
      return response.data.data
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Error al subir documento')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const deleteDocument = async (casoId: string, documentoId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      // Documents are deleted by doc_id directly, not by case+doc combo
      await api.delete(`/documents/documents/${documentoId}`)
      setDocuments((prev) => prev.filter((d) => d.id !== documentoId))
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Error al eliminar documento')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    documents,
    isLoading,
    error,
    fetchDocuments,
    uploadDocument,
    deleteDocument,
  }
}
