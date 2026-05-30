import React, { useRef } from 'react'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Upload, FileIcon, X } from 'lucide-react'
import api from '@/lib/axios'

interface DocumentUploadProps {
  caseId: string
  onSuccess?: () => void
}

export function DocumentUpload({ caseId, onSuccess }: DocumentUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const droppedFiles = Array.from(e.dataTransfer.files)
    setFiles(droppedFiles)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : []
    setFiles(selectedFiles)
  }

  const handleUpload = async () => {
    if (!files.length || !nombre || !tipo) {
      alert('Por favor completa todos los campos')
      return
    }

    setIsUploading(true)
    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('nombre', nombre)
        formData.append('tipo', tipo)
        if (descripcion) {
          formData.append('descripcion', descripcion)
        }

        await api.post(`/documents/cases/${caseId}/documents/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }

      setFiles([])
      setNombre('')
      setTipo('')
      setDescripcion('')
      onSuccess?.()
    } catch (error) {
      console.error('Error uploading documents:', error)
      alert('Error al subir documentos')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cargar Documentos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={32} className="mx-auto mb-3 text-slate-400" />
          <p className="font-medium text-slate-900 mb-1">Arrastra archivos aquí o haz clic</p>
          <p className="text-sm text-slate-600">Soporta PDF, DOCX, XLSX, TXT y más</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.docx,.xlsx,.txt,.jpg,.png"
          />
        </div>

        {files.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-slate-900">Archivos seleccionados:</h4>
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <FileIcon size={18} className="text-slate-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
                <button
                  onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                  className="text-red-600 hover:bg-red-50 p-2 rounded"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-4">
          <Input
            label="Nombre del Documento"
            placeholder="Ej: Demanda Inicial"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />

          <Select
            label="Tipo de Documento"
            placeholder="Selecciona un tipo"
            options={[
              { value: 'demanda', label: 'Demanda' },
              { value: 'sentencia', label: 'Sentencia' },
              { value: 'escrito', label: 'Escrito' },
              { value: 'prueba', label: 'Prueba' },
              { value: 'contrato', label: 'Contrato' },
              { value: 'otro', label: 'Otro' },
            ]}
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Descripción (opcional)
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe el contenido del documento..."
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
            />
          </div>
        </div>

        <Button
          onClick={handleUpload}
          isLoading={isUploading}
          disabled={files.length === 0}
          className="w-full"
        >
          Subir Documentos
        </Button>
      </CardContent>
    </Card>
  )
}
