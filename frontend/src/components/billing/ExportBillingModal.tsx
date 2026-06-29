import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, Download, Check } from 'lucide-react'
import api from '@/lib/axios'
// @ts-ignore
import XLSXStyle from 'xlsx-js-style'

interface LawFirm {
  name: string
  registration_number: string
  street_address: string
  city: string
  phone: string
}

interface HEntry {
  casoId: string
  fechaRegistro: string
  montoTotal?: number
  horas?: number
  horasTrabajas?: number
}

interface CasoInfo {
  id: string
  clienteId?: string
  monedaFacturacion?: string
}

interface Cliente {
  id: string
  nombre: string
  ruc?: string
  direccion?: string
}

interface Props {
  onClose: () => void
  allHours: HEntry[]
  casesMap: Record<string, CasoInfo>
  clients: Cliente[]
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const currentYear = new Date().getFullYear()
const YEARS = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1]

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  headerTitle: {
    font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E3A5F' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  headerSub: {
    font: { sz: 10, color: { rgb: 'CBD5E1' } },
    fill: { fgColor: { rgb: '1E3A5F' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  headerEmpty: {
    fill: { fgColor: { rgb: '1E3A5F' } },
  },
  firmLabel: {
    font: { sz: 9, color: { rgb: '93C5FD' }, bold: false },
    fill: { fgColor: { rgb: '1E3A5F' } },
    alignment: { horizontal: 'right', vertical: 'center' },
  },
  firmValue: {
    font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E3A5F' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  colHeader: {
    font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '2563EB' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top:    { style: 'thin', color: { rgb: '93C5FD' } },
      bottom: { style: 'thin', color: { rgb: '93C5FD' } },
      left:   { style: 'thin', color: { rgb: '93C5FD' } },
      right:  { style: 'thin', color: { rgb: '93C5FD' } },
    },
  },
  colHeaderLeft: {
    font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '2563EB' } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: {
      top:    { style: 'thin', color: { rgb: '93C5FD' } },
      bottom: { style: 'thin', color: { rgb: '93C5FD' } },
      left:   { style: 'thin', color: { rgb: '93C5FD' } },
      right:  { style: 'thin', color: { rgb: '93C5FD' } },
    },
  },
  dataEven: {
    font: { sz: 10 },
    fill: { fgColor: { rgb: 'F8FAFC' } },
    alignment: { vertical: 'center', wrapText: false },
    border: {
      top:    { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left:   { style: 'thin', color: { rgb: 'E2E8F0' } },
      right:  { style: 'thin', color: { rgb: 'E2E8F0' } },
    },
  },
  dataOdd: {
    font: { sz: 10 },
    fill: { fgColor: { rgb: 'FFFFFF' } },
    alignment: { vertical: 'center', wrapText: false },
    border: {
      top:    { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left:   { style: 'thin', color: { rgb: 'E2E8F0' } },
      right:  { style: 'thin', color: { rgb: 'E2E8F0' } },
    },
  },
  dataNum: (even: boolean) => ({
    font: { sz: 10 },
    fill: { fgColor: { rgb: even ? 'F8FAFC' : 'FFFFFF' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    numFmt: '#,##0.00',
    border: {
      top:    { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left:   { style: 'thin', color: { rgb: 'E2E8F0' } },
      right:  { style: 'thin', color: { rgb: 'E2E8F0' } },
    },
  }),
  totalLabel: {
    font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '059669' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top:    { style: 'medium', color: { rgb: '047857' } },
      bottom: { style: 'medium', color: { rgb: '047857' } },
      left:   { style: 'medium', color: { rgb: '047857' } },
      right:  { style: 'medium', color: { rgb: '047857' } },
    },
  },
  totalNum: {
    font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '059669' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    numFmt: '#,##0.00',
    border: {
      top:    { style: 'medium', color: { rgb: '047857' } },
      bottom: { style: 'medium', color: { rgb: '047857' } },
      left:   { style: 'medium', color: { rgb: '047857' } },
      right:  { style: 'medium', color: { rgb: '047857' } },
    },
  },
}

function cell(v: any, s: any): any {
  return { v, s, t: typeof v === 'number' ? 'n' : 's' }
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ExportBillingModal({ onClose, allHours, casesMap, clients }: Props) {
  const [year, setYear] = useState(currentYear)
  const [months, setMonths] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  const [exporting, setExporting] = useState(false)
  const [lawFirm, setLawFirm] = useState<LawFirm | null>(null)

  useEffect(() => {
    api.get('/law-firms/current').then(r => setLawFirm(r.data.data ?? null)).catch(() => {})
  }, [])

  const toggleMonth = (m: number) =>
    setMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m].sort((a, b) => a - b))

  const handleExport = () => {
    if (months.length === 0) return
    setExporting(true)
    try {
      generateExcel({ year, months, allHours, casesMap, clients, lawFirm })
    } finally {
      setExporting(false)
    }
  }

  const selectedLabel = months.length === 12
    ? 'Todo el año'
    : months.length === 0
    ? 'Ningún mes'
    : months.map(m => MONTH_SHORT[m - 1]).join(', ')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Exportar facturación a Excel</h2>
            <p className="text-xs text-slate-500 mt-0.5">Resumen por cliente con RUC, dirección y totales mensuales</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Año */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Año</label>
            <div className="flex gap-2">
              {YEARS.map(y => (
                <button
                  key={y}
                  onClick={() => setYear(y)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    year === y
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* Meses */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Meses a exportar</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setMonths([1,2,3,4,5,6,7,8,9,10,11,12])}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Todos
                </button>
                <span className="text-slate-300">·</span>
                <button
                  onClick={() => setMonths([])}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Limpiar
                </button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {MONTH_SHORT.map((name, idx) => {
                const m = idx + 1
                const sel = months.includes(m)
                return (
                  <button
                    key={m}
                    onClick={() => toggleMonth(m)}
                    className={`relative py-2 rounded-lg text-xs font-medium border transition-all ${
                      sel
                        ? 'bg-blue-50 text-blue-700 border-blue-400 ring-1 ring-blue-300'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-blue-200 hover:text-blue-500'
                    }`}
                  >
                    {sel && (
                      <span className="absolute top-0.5 right-0.5 w-3 h-3 bg-blue-600 rounded-full flex items-center justify-center">
                        <Check size={8} className="text-white" strokeWidth={3} />
                      </span>
                    )}
                    {name}
                  </button>
                )
              })}
            </div>
            {months.length > 0 && (
              <p className="text-xs text-slate-400 mt-2">
                {selectedLabel} {year}
              </p>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button
            size="sm"
            onClick={handleExport}
            disabled={months.length === 0 || exporting}
            isLoading={exporting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {!exporting && <Download size={14} className="mr-1.5" />}
            Descargar Excel
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Excel generation ───────────────────────────────────────────────────────────

function generateExcel({
  year,
  months,
  allHours,
  casesMap,
  clients,
  lawFirm,
}: {
  year: number
  months: number[]
  allHours: HEntry[]
  casesMap: Record<string, CasoInfo>
  clients: Cliente[]
  lawFirm: LawFirm | null
}) {
  const sortedMonths = [...months].sort((a, b) => a - b)
  const clientsById: Record<string, Cliente> = {}
  clients.forEach(c => { clientsById[c.id] = c })

  // Acumular monto por [clienteId][mes]
  const byClientMonth: Record<string, Record<number, number>> = {}

  allHours.forEach(h => {
    const caso = casesMap[h.casoId]
    if (!caso?.clienteId) return
    const date = new Date(h.fechaRegistro)
    const y = date.getFullYear()
    const m = date.getMonth() + 1
    if (y !== year || !sortedMonths.includes(m)) return
    const monto = h.montoTotal ?? 0
    if (!byClientMonth[caso.clienteId]) byClientMonth[caso.clienteId] = {}
    byClientMonth[caso.clienteId][m] = (byClientMonth[caso.clienteId][m] || 0) + monto
  })

  // Ordenar clientes por nombre
  const clientIds = Object.keys(byClientMonth).sort((a, b) => {
    const na = clientsById[a]?.nombre ?? a
    const nb = clientsById[b]?.nombre ?? b
    return na.localeCompare(nb, 'es')
  })

  // ── Construir hoja ──────────────────────────────────────────────────────────

  const ws: any = {}
  const range = { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }
  const setCell = (r: number, c: number, val: any) => {
    const addr = XLSXStyle.utils.encode_cell({ r, c })
    ws[addr] = val
    if (r > range.e.r) range.e.r = r
    if (c > range.e.c) range.e.c = c
  }

  const totalCols = 3 + sortedMonths.length + 1  // RazónSocial, RUC, Dir, meses, Total
  const periodStr = sortedMonths.length === 12
    ? `Año ${year}`
    : sortedMonths.length === 1
    ? `${MONTH_NAMES[sortedMonths[0] - 1]} ${year}`
    : `${MONTH_NAMES[sortedMonths[0] - 1]} – ${MONTH_NAMES[sortedMonths[sortedMonths.length - 1] - 1]} ${year}`

  const today = new Date()
  const todayStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`

  const firmAddress = lawFirm
    ? `${lawFirm.street_address}${lawFirm.city ? ', ' + lawFirm.city : ''}`
    : ''

  // Columna helper: convierte índice 0-based a letra(s) Excel
  const colLetter = (c: number): string => {
    let s = ''
    for (let n = c + 1; n > 0; n = Math.floor((n - 1) / 26))
      s = String.fromCharCode(65 + (n - 1) % 26) + s
    return s
  }

  // Columnas del bloque derecho: Período y Generado en las últimas 2 cols
  const cLabel = totalCols - 2
  const cValue = totalCols - 1

  const titleStyle = {
    font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E3A5F' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  }

  // Fila 0: título centrado, ancho completo
  setCell(0, 0, cell('REPORTE DE FACTURACIÓN', titleStyle))
  for (let c = 1; c < totalCols; c++) setCell(0, c, cell('', S.headerEmpty))

  // Filas 1-4: datos del bufete (izq) | espacio vacío (centro) | período/fecha (der)
  const infoRows = [
    { label: 'Razón Social:', value: lawFirm?.name ?? '',                rLabel: 'Período:',     rValue: periodStr  },
    { label: 'RUC:',          value: lawFirm?.registration_number ?? '', rLabel: 'Generado el:', rValue: todayStr   },
    { label: 'Dirección:',    value: firmAddress,                         rLabel: '',              rValue: ''         },
    { label: 'Teléfono:',     value: lawFirm?.phone ?? '',                rLabel: '',              rValue: ''         },
  ]
  infoRows.forEach(({ label, value, rLabel, rValue }, i) => {
    const row = i + 1
    setCell(row, 0, cell(label, S.firmLabel))
    setCell(row, 1, cell(value, S.firmValue))
    for (let c = 2; c < cLabel; c++) setCell(row, c, cell('', S.headerEmpty))
    setCell(row, cLabel, cell(rLabel, S.firmLabel))
    setCell(row, cValue, cell(rValue, S.firmValue))
  })

  // Fila 5: separadora
  for (let c = 0; c < totalCols; c++) setCell(5, c, cell('', {}))

  // Fila 6: encabezados de columna
  setCell(6, 0, cell('Razón Social', S.colHeaderLeft))
  setCell(6, 1, cell('RUC', S.colHeader))
  setCell(6, 2, cell('Dirección', S.colHeaderLeft))
  sortedMonths.forEach((m, i) => {
    setCell(6, 3 + i, cell(MONTH_NAMES[m - 1], S.colHeader))
  })
  setCell(6, 3 + sortedMonths.length, cell('TOTAL', S.colHeader))

  // Filas de datos (row 7 → Excel row 8)
  const DATA_START_EXCEL = 8
  let dataRow = 7

  clientIds.forEach((cid, idx) => {
    const cl = clientsById[cid]
    const even = idx % 2 === 0
    const ds = even ? S.dataEven : S.dataOdd
    const dn = S.dataNum(even)
    const excelRow = DATA_START_EXCEL + idx

    setCell(dataRow, 0, { ...cell(cl?.nombre ?? '—', ds), s: { ...ds, alignment: { horizontal: 'left', vertical: 'center' } } })
    setCell(dataRow, 1, { ...cell(cl?.ruc ?? '—', ds), s: { ...ds, alignment: { horizontal: 'center', vertical: 'center' } } })
    setCell(dataRow, 2, { ...cell(cl?.direccion ?? '—', ds), s: { ...ds, alignment: { horizontal: 'left', vertical: 'center' } } })

    sortedMonths.forEach((m, i) => {
      const v = byClientMonth[cid]?.[m] ?? 0
      setCell(dataRow, 3 + i, { v, s: dn, t: 'n', z: '#,##0.00' })
    })

    // Fórmula para total de la fila
    const firstMonthL = colLetter(3)
    const lastMonthL  = colLetter(3 + sortedMonths.length - 1)
    setCell(dataRow, 3 + sortedMonths.length, {
      f: `SUM(${firstMonthL}${excelRow}:${lastMonthL}${excelRow})`,
      s: { ...dn, font: { bold: true, sz: 10 } },
      t: 'n', z: '#,##0.00',
    })
    dataRow++
  })

  const lastDataExcelRow = DATA_START_EXCEL + clientIds.length - 1

  // Fila de totales con fórmulas SUM por columna
  setCell(dataRow, 0, cell('TOTAL', S.totalLabel))
  setCell(dataRow, 1, cell('', S.totalLabel))
  setCell(dataRow, 2, cell('', S.totalLabel))
  sortedMonths.forEach((_m, i) => {
    const colL = colLetter(3 + i)
    setCell(dataRow, 3 + i, {
      f: `SUM(${colL}${DATA_START_EXCEL}:${colL}${lastDataExcelRow})`,
      s: S.totalNum, t: 'n', z: '#,##0.00',
    })
  })
  const totalColL = colLetter(3 + sortedMonths.length)
  setCell(dataRow, 3 + sortedMonths.length, {
    f: `SUM(${totalColL}${DATA_START_EXCEL}:${totalColL}${lastDataExcelRow})`,
    s: S.totalNum, t: 'n', z: '#,##0.00',
  })

  ws['!ref'] = XLSXStyle.utils.encode_range(range)

  // Merges
  ws['!merges'] = [
    // Fila 0: título a todo lo ancho
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
    // Filas 1-4: sección central vacía (entre valor bufete y label período)
    ...[1, 2, 3, 4].map(r => ({ s: { r, c: 2 }, e: { r, c: cLabel - 1 } })),
    // Fila 5: separador completo
    { s: { r: 5, c: 0 }, e: { r: 5, c: totalCols - 1 } },
    // Fila total: "TOTAL" abarca las 3 primeras celdas
    { s: { r: dataRow, c: 0 }, e: { r: dataRow, c: 2 } },
  ]

  // Anchos de columna
  ws['!cols'] = [
    { wch: 30 },  // col 0: Razón Social cliente / label bufete (right-aligned corto)
    { wch: 20 },  // col 1: RUC cliente / valor bufete (nombres cortos de firma OK)
    { wch: 36 },  // col 2: Dirección cliente (merged en header)
    ...sortedMonths.map(() => ({ wch: 13 })),
    { wch: 14 },
  ]

  // Alturas de fila
  ws['!rows'] = [
    { hpt: 32 }, // fila 0: título grande
    { hpt: 20 }, // fila 1: Razón Social + Período
    { hpt: 20 }, // fila 2: RUC + Generado el
    { hpt: 20 }, // fila 3: Dirección
    { hpt: 20 }, // fila 4: Teléfono
    { hpt: 6  }, // fila 5: separador
    { hpt: 30 }, // fila 6: encabezados columnas
  ]

  const wb = XLSXStyle.utils.book_new()
  XLSXStyle.utils.book_append_sheet(wb, ws, 'Facturación')

  const fileName = `Facturacion_${year}_${sortedMonths.map(m => MONTH_SHORT[m - 1]).join('-')}.xlsx`
  XLSXStyle.writeFile(wb, fileName)
}
