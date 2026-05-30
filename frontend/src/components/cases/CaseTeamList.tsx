import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { User } from '@/types'
import { X, Plus } from 'lucide-react'
import api from '@/lib/axios'

interface CaseTeamListProps {
  caseId: string
  abogados: User[]
  asistentes: User[]
  onUpdate?: () => void
}

export function CaseTeamList({
  caseId,
  abogados,
  asistentes,
  onUpdate,
}: CaseTeamListProps) {
  const [isRemoving, setIsRemoving] = useState<string | null>(null)

  // Add member modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [firmUsers, setFirmUsers] = useState<any[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState('abogado_junior')
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const allMembers = [
    ...abogados.map((a) => ({ ...a, rol: 'abogado' })),
    ...asistentes.map((a) => ({ ...a, rol: 'asistente' })),
  ]

  // IDs already on the team
  const teamIds = new Set(allMembers.map((m: any) => m.id))

  const openAddModal = async () => {
    setSelectedUserId('')
    setSelectedRole('abogado_junior')
    setAddError('')
    setShowAddModal(true)
    try {
      const res = await api.get('/users?limit=100')
      const all = res.data.data || []
      // Filter out users already on the team
      setFirmUsers(all.filter((u: any) => !teamIds.has(u.id)))
    } catch {
      setAddError('No se pudo cargar la lista de usuarios.')
    }
  }

  const handleAddMember = async () => {
    if (!selectedUserId) {
      setAddError('Selecciona un usuario.')
      return
    }
    setIsAdding(true)
    setAddError('')
    try {
      await api.post(`/cases/${caseId}/team`, {
        user_id: selectedUserId,
        role: selectedRole,
      })
      setShowAddModal(false)
      onUpdate?.()
    } catch (err: any) {
      setAddError(err?.response?.data?.detail || 'Error al agregar el miembro.')
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    setIsRemoving(userId)
    try {
      await api.delete(`/cases/${caseId}/team/${userId}`)
      onUpdate?.()
    } catch (error) {
      console.error('Error removing team member:', error)
    } finally {
      setIsRemoving(null)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Equipo Legal</CardTitle>
            <Button variant="ghost" size="sm" onClick={openAddModal}>
              <Plus size={16} className="mr-1" />
              Agregar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {allMembers.length === 0 ? (
            <p className="text-slate-600 text-center py-8">No hay miembros en el equipo</p>
          ) : (
            <div className="space-y-3">
              {allMembers.map((member: any) => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar
                      initials={member.nombre.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                      size="md"
                    />
                    <div>
                      <p className="font-medium text-slate-900">{member.nombre}</p>
                      <p className="text-sm text-slate-600">{member.email}</p>
                    </div>
                    <Badge variant={member.rol === 'abogado' ? 'default' : 'secondary'}>
                      {member.rol === 'abogado' ? 'Abogado' : 'Asistente'}
                    </Badge>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    disabled={isRemoving === member.id}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-40"
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add member modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Agregar miembro al caso</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {addError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                  {addError}
                </p>
              )}

              <Select
                label="Usuario"
                placeholder="Selecciona un usuario..."
                options={firmUsers.map((u) => ({
                  value: u.id,
                  label: u.nombre || `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email,
                }))}
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              />

            </div>

            <div className="flex justify-end gap-3 px-6 pb-6">
              <Button variant="ghost" onClick={() => setShowAddModal(false)} disabled={isAdding}>
                Cancelar
              </Button>
              <Button onClick={handleAddMember} isLoading={isAdding} className="gap-2">
                <Plus size={15} />
                Agregar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
