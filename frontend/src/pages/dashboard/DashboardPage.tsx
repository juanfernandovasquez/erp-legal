import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { StatCard } from '@/components/common/StatCard'
import { CaseCard } from '@/components/cases/CaseCard'
import { TaskCard } from '@/components/tasks/TaskCard'
import { AlertCard } from '@/components/alerts/AlertCard'
import { Caso, Tarea, Alerta } from '@/types'
import { FileText, CheckSquare, AlertCircle, Clock, TrendingUp } from 'lucide-react'
import api from '@/lib/axios'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export function DashboardPage() {
  const navigate = useNavigate()
  const [cases, setCases] = useState<Caso[]>([])
  const [tasks, setTasks] = useState<Tarea[]>([])
  const [alerts, setAlerts] = useState<Alerta[]>([])
  const [stats, setStats] = useState({
    activeCases: 0,
    totalCases: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    alertCount: 0,
    hoursThisMonth: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      // Fetch in parallel — each independently so one failure doesn't break all
      const results = await Promise.allSettled([
        api.get('/cases?limit=6'),                          // recent cases
        api.get('/tasks?limit=5&status=pendiente'),        // pending tasks
        api.get('/alerts?limit=5&status=pending'),         // alerts
        api.get('/admin/dashboard'),                        // stats
      ])

      if (results[0].status === 'fulfilled') {
        setCases(results[0].value.data.data || [])
      }
      if (results[1].status === 'fulfilled') {
        setTasks(results[1].value.data.data || [])
      }
      if (results[2].status === 'fulfilled') {
        setAlerts(results[2].value.data.data || [])
      }
      if (results[3].status === 'fulfilled') {
        const statsData = results[3].value.data.data || {}
        setStats({
          activeCases: statsData.cases?.active ?? 0,
          totalCases: statsData.cases?.total ?? 0,
          pendingTasks: statsData.tasks?.pending ?? 0,
          overdueTasks: statsData.tasks?.overdue ?? 0,
          alertCount: statsData.alerts?.overdue ?? 0,
          hoursThisMonth: statsData.hours?.this_month ?? 0,
        })
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) return <AppLayout><div className="flex justify-center py-24"><LoadingSpinner /></div></AppLayout>

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Panel de Control</h1>
          <p className="text-slate-600">Resumen de actividad del bufete</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={FileText}
            title="Casos Activos"
            value={stats.activeCases}
            subtitle={`${stats.totalCases} en total`}
            bgColor="blue"
            onClick={() => navigate('/cases')}
          />
          <StatCard
            icon={CheckSquare}
            title="Tareas Pendientes"
            value={stats.pendingTasks}
            subtitle={stats.overdueTasks > 0 ? `${stats.overdueTasks} vencidas` : undefined}
            subtitleColor={stats.overdueTasks > 0 ? 'red' : undefined}
            bgColor="yellow"
            onClick={() => navigate('/tasks')}
          />
          <StatCard
            icon={AlertCircle}
            title="Alertas Vencidas"
            value={stats.alertCount}
            bgColor="red"
            onClick={() => navigate('/alerts')}
          />
          <StatCard
            icon={Clock}
            title="Horas Este Mes"
            value={stats.hoursThisMonth % 1 === 0 ? stats.hoursThisMonth : stats.hoursThisMonth.toFixed(1)}
            bgColor="green"
            onClick={() => navigate('/hours')}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-8">
            {/* Cases */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">Casos Recientes</h2>
                <button
                  onClick={() => navigate('/cases')}
                  className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                >
                  Ver todos →
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {cases.length > 0 ? (
                  cases.map((caso) => <CaseCard key={caso.id} caso={caso} />)
                ) : (
                  <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    No hay casos registrados aún.{' '}
                    <button
                      onClick={() => navigate('/cases/new')}
                      className="text-primary-600 hover:underline"
                    >
                      Crear el primero
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Tasks */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">Tareas Pendientes</h2>
                <button
                  onClick={() => navigate('/tasks')}
                  className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                >
                  Ver todas →
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {tasks.length > 0 ? (
                  tasks.map((task) => <TaskCard key={task.id} task={task} />)
                ) : (
                  <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    No hay tareas pendientes.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar: Alerts */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Alertas</h2>
              <button
                onClick={() => navigate('/alerts')}
                className="text-sm text-primary-600 hover:text-primary-800 font-medium"
              >
                Ver todas →
              </button>
            </div>
            <div className="space-y-3">
              {alerts.length > 0 ? (
                alerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onResolve={() => fetchDashboardData()}
                  />
                ))
              ) : (
                <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  Sin alertas pendientes.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
