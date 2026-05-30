import React, { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HoursForm } from '@/components/hours/HoursForm'
import { HoursTable } from '@/components/hours/HoursTable'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Horas } from '@/types'
import api from '@/lib/axios'

export function HoursPage() {
  const [stats, setStats] = useState({
    thisMonth: 0,
    thisYear: 0,
    total: 0,
  })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await api.get('/hours/my-hours?limit=1000')
      const hoursData = response.data.data || []
      const now = new Date()
      const thisMonth = hoursData
        .filter((h: any) => new Date(h.work_date).getMonth() === now.getMonth() && new Date(h.work_date).getFullYear() === now.getFullYear())
        .reduce((acc: number, h: any) => acc + (h.hours || 0), 0)
      const thisYear = hoursData
        .filter((h: any) => new Date(h.work_date).getFullYear() === now.getFullYear())
        .reduce((acc: number, h: any) => acc + (h.hours || 0), 0)
      const total = hoursData.reduce((acc: number, h: any) => acc + (h.hours || 0), 0)
      setStats({ thisMonth, thisYear, total })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Registro de Horas</h1>
          <p className="text-slate-600">Registra y visualiza tus horas de trabajo</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-slate-600 font-medium mb-1">Este Mes</p>
                <p className="text-3xl font-bold text-slate-900">{stats.thisMonth}</p>
                <p className="text-xs text-slate-500 mt-1">horas registradas</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-slate-600 font-medium mb-1">Este Año</p>
                <p className="text-3xl font-bold text-slate-900">{stats.thisYear}</p>
                <p className="text-xs text-slate-500 mt-1">horas registradas</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-slate-600 font-medium mb-1">Total</p>
                <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-500 mt-1">horas registradas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="register">
          <TabsList className="mb-6">
            <TabsTrigger value="register">Registrar Horas</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="register">
            <HoursForm onSuccess={() => {
              fetchStats()
            }} />
          </TabsContent>

          <TabsContent value="history">
            <HoursTable onUpdate={() => fetchStats()} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
