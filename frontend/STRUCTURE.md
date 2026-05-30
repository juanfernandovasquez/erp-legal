# Legal ERP Frontend - Estructura Completa

## Descripción General
Sistema ERP completo para gestión de casos jurídicos en bufetes de abogados de América Latina (enfoque Perú).

## Tecnología Stack
- **React 18** con TypeScript
- **Vite** como bundler
- **Tailwind CSS** para estilos
- **shadcn/ui** componentes (implementación custom)
- **Zustand** para state management
- **React Router v6** para navegación
- **Axios** con interceptores JWT
- **React Hook Form** + **Zod** para validación
- **Lucide React** para iconos
- **date-fns** para manejo de fechas

## Estructura de Carpetas

```
frontend/
├── src/
│   ├── App.tsx                          # Enrutador principal
│   ├── main.tsx                         # Punto de entrada
│   ├── index.css                        # Estilos globales Tailwind
│   │
│   ├── lib/
│   │   ├── utils.ts                     # Funciones utilitarias (cn, formatDate, etc)
│   │   └── axios.ts                     # Cliente HTTP con interceptores JWT
│   │
│   ├── stores/
│   │   ├── authStore.ts                 # Estado de autenticación (Zustand)
│   │   ├── caseStore.ts                 # Estado de casos (Zustand)
│   │   └── uiStore.ts                   # Estado de UI (Zustand)
│   │
│   ├── types/
│   │   ├── index.ts                     # Interfaces principales
│   │   ├── auth.ts                      # Tipos de autenticación
│   │   ├── case.ts                      # Tipos de casos
│   │   ├── document.ts                  # Tipos de documentos
│   │   ├── timeline.ts                  # Tipos de timeline
│   │   ├── task.ts                      # Tipos de tareas
│   │   └── alert.ts                     # Tipos de alertas
│   │
│   ├── hooks/
│   │   ├── useAuth.ts                   # Hook para autenticación
│   │   ├── useCases.ts                  # Hook para casos
│   │   ├── useDocuments.ts              # Hook para documentos
│   │   └── useAlerts.ts                 # Hook para alertas
│   │
│   ├── components/
│   │   ├── ui/                          # Componentes base (button, input, card, etc)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   └── separator.tsx
│   │   │
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx            # Layout principal con sidebar
│   │   │   ├── Sidebar.tsx              # Menú lateral
│   │   │   ├── Header.tsx               # Encabezado con búsqueda
│   │   │   └── ProtectedRoute.tsx       # Rutas protegidas
│   │   │
│   │   ├── cases/
│   │   │   ├── CaseCard.tsx             # Tarjeta de caso
│   │   │   ├── CaseForm.tsx             # Formulario crear/editar caso
│   │   │   ├── CaseStatusBadge.tsx      # Badge de estado
│   │   │   ├── CaseTimeline.tsx         # Timeline de eventos
│   │   │   └── CaseTeamList.tsx         # Lista de equipo legal
│   │   │
│   │   ├── tasks/
│   │   │   ├── TaskCard.tsx             # Tarjeta de tarea
│   │   │   └── TaskForm.tsx             # Formulario de tarea
│   │   │
│   │   ├── documents/
│   │   │   ├── DocumentUpload.tsx       # Carga de documentos
│   │   │   └── DocumentList.tsx         # Lista de documentos
│   │   │
│   │   ├── hours/
│   │   │   ├── HoursForm.tsx            # Formulario registro de horas
│   │   │   └── HoursTable.tsx           # Tabla de horas
│   │   │
│   │   ├── alerts/
│   │   │   └── AlertCard.tsx            # Tarjeta de alerta
│   │   │
│   │   └── common/
│   │       ├── LoadingSpinner.tsx
│   │       ├── EmptyState.tsx
│   │       ├── ConfirmDialog.tsx
│   │       ├── SearchInput.tsx
│   │       ├── Pagination.tsx
│   │       └── StatCard.tsx
│   │
│   └── pages/
│       ├── auth/
│       │   ├── LoginPage.tsx            # Página de login
│       │   └── RegisterPage.tsx         # Registro de bufete + admin
│       │
│       ├── dashboard/
│       │   └── DashboardPage.tsx        # Dashboard principal
│       │
│       ├── cases/
│       │   ├── CasesListPage.tsx        # Lista de casos
│       │   └── CaseDetailPage.tsx       # Detalle de caso (tabs)
│       │
│       ├── tasks/
│       │   └── TasksPage.tsx            # Tareas en columnas Kanban
│       │
│       ├── hours/
│       │   └── HoursPage.tsx            # Registro de horas
│       │
│       ├── alerts/
│       │   └── AlertsPage.tsx           # Alertas pendientes
│       │
│       ├── clients/
│       │   └── ClientsListPage.tsx      # Lista de clientes
│       │
│       ├── settings/
│       │   └── SettingsPage.tsx         # Configuración de usuario
│       │
│       └── NotFoundPage.tsx             # Página 404
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── .env.example
└── .gitignore
```

## Rutas Disponibles

```
GET /login                 → Página de login
GET /register              → Registro de bufete
GET /dashboard             → Panel de control
GET /cases                 → Lista de casos
GET /cases/:id             → Detalle de caso (tabs: info, timeline, docs, equipo, tareas, horas)
GET /tasks                 → Tareas (vista Kanban)
GET /hours                 → Registro de horas
GET /alerts                → Alertas pendientes
GET /clients               → Lista de clientes
GET /settings              → Configuración de usuario
GET /settings/users        → Gestión de usuarios (futuro)
```

## Características Principales

### Autenticación
- Login y registro de bufetes
- Tokens JWT con refresh automático
- Protección de rutas

### Casos Jurídicos
- CRUD completo de casos
- Estados: activo, en_progreso, pendiente, en_pausa, cerrado, archivado
- Asignación de equipos (abogados, asistentes)
- Documentos adjuntos
- Línea de tiempo de eventos
- Registro de horas

### Tareas
- Creación y asignación de tareas
- Estados: pendiente, en_progreso, completado, rechazado
- Prioridades: baja, media, alta, urgente
- Vista Kanban por estado
- Recordatorios de vencimiento

### Documentos
- Carga de archivos (drag & drop)
- Clasificación por tipo
- Descarga
- Eliminación

### Registro de Horas
- Registro por tipo de actividad
- Estadísticas mensuales/anuales
- Asociación a casos
- Historial

### Alertas
- Alertas del sistema
- Estados: pendiente, revisado, resuelto
- Severidades: info, advertencia, error
- Notificaciones en tiempo real

## Estilo y Diseño

### Colores
- **Primario**: Dark Blue (#1e3a5f)
- **Secundario**: Slate Gray
- **Estados**: Verde (activo), Amarillo (pendiente), Rojo (urgente), Gris (cerrado)

### Componentes
- Cards con sombras sutiles
- Tabla con filas alternadas
- Badges para estados
- Icons de Lucide React
- Responsive: tablet y desktop

## Instalación y Uso

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build
npm run build

# Preview
npm run preview

# Type check
npm run type-check
```

## Variables de Entorno

```env
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=Legal ERP System
```

## Notas de Desarrollo

1. Todos los componentes son completamente funcionales
2. Sin comentarios TODO ni placeholders
3. Validación de formularios con Zod
4. State management con Zustand
5. Interceptores de Axios para JWT
6. Componentes UI reutilizables
7. Todo en español para la interfaz
8. Sistema modular y escalable
