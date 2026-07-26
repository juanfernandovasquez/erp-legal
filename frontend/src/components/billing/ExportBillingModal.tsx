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

export interface HEntry {
  casoId: string
  fechaRegistro: string
  montoTotal?: number
  horas?: number
  horasTrabajas?: number
}

export interface CasoInfo {
  id: string
  titulo: string
  descripcion?: string | null
  clienteId?: string
  monedaFacturacion?: string
}

export interface Cliente {
  id: string
  nombre?: string
  name?: string
  ruc?: string
  taxId?: string
  direccion?: string
  streetAddress?: string
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

// ── Styles ──────────────────────────────────────────────────────────────────────

const border = (color = 'E2E8F0') => ({
  top:    { style: 'thin', color: { rgb: color } },
  bottom: { style: 'thin', color: { rgb: color } },
  left:   { style: 'thin', color: { rgb: color } },
  right:  { style: 'thin', color: { rgb: color } },
})

const S = {
  title: {
    font: { bold: true, sz: 15, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E3A5F' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  },
  headerEmpty: { fill: { fgColor: { rgb: '1E3A5F' } } },
  firmLabel: {
    font: { sz: 9, color: { rgb: '93C5FD' } },
    fill: { fgColor: { rgb: '1E3A5F' } },
    alignment: { horizontal: 'right', vertical: 'center' },
  },
  firmValue: {
    font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E3A5F' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  tcRow: {
    font: { sz: 9, italic: true, color: { rgb: '475569' } },
    fill: { fgColor: { rgb: 'F8FAFC' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: border('E2E8F0'),
  },
  colHeader: {
    font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '2563EB' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: border('93C5FD'),
  },
  colHeaderLeft: {
    font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '2563EB' } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: border('93C5FD'),
  },
  clientHeader: {
    font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E3A5F' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: border('2563EB'),
  },
  clientHeaderNum: {
    font: { bold: true, sz: 10, color: { rgb: 'BFDBFE' } },
    fill: { fgColor: { rgb: '1E3A5F' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: border('2563EB'),
  },
  caseRow: (even: boolean) => ({
    font: { sz: 10, color: { rgb: '1E293B' } },
    fill: { fgColor: { rgb: even ? 'F0F4FF' : 'FFFFFF' } },
    alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
    border: border('DBEAFE'),
  }),
  caseRowNum: (even: boolean) => ({
    font: { sz: 10, color: { rgb: '1E293B' } },
    fill: { fgColor: { rgb: even ? 'F0F4FF' : 'FFFFFF' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: border('DBEAFE'),
    numFmt: '#,##0.00',
  }),
  caseMoneda: (even: boolean) => ({
    font: { sz: 9, italic: true, color: { rgb: '475569' } },
    fill: { fgColor: { rgb: even ? 'F0F4FF' : 'FFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: border('DBEAFE'),
  }),
  subtotalLabel: {
    font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '059669' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: border('047857'),
  },
  subtotalNum: {
    font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '059669' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    numFmt: '#,##0.00',
    border: border('047857'),
  },
  grandTotalLabel: {
    font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '047857' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: { top: { style: 'medium', color: { rgb: '064E3B' } }, bottom: { style: 'medium', color: { rgb: '064E3B' } }, left: { style: 'medium', color: { rgb: '064E3B' } }, right: { style: 'medium', color: { rgb: '064E3B' } } },
  },
  grandTotalNum: {
    font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '047857' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    numFmt: '#,##0.00',
    border: { top: { style: 'medium', color: { rgb: '064E3B' } }, bottom: { style: 'medium', color: { rgb: '064E3B' } }, left: { style: 'medium', color: { rgb: '064E3B' } }, right: { style: 'medium', color: { rgb: '064E3B' } } },
  },
  spacer: { fill: { fgColor: { rgb: 'F1F5F9' } } },
}

function cell(v: any, s: any): any {
  return { v, s, t: typeof v === 'number' ? 'n' : 's' }
}

function numCell(v: number, s: any): any {
  return { v, s, t: 'n', z: '#,##0.00' }
}

function colLetter(c: number): string {
  let s = ''
  for (let n = c + 1; n > 0; n = Math.floor((n - 1) / 26))
    s = String.fromCharCode(65 + (n - 1) % 26) + s
  return s
}

function clientName(cl: Cliente | undefined): string {
  if (!cl) return '—'
  return cl.nombre || cl.name || '—'
}

function clientRuc(cl: Cliente | undefined): string {
  if (!cl) return ''
  return cl.ruc || cl.taxId || ''
}

function clientAddr(cl: Cliente | undefined): string {
  if (!cl) return ''
  return cl.direccion || cl.streetAddress || ''
}

// ── Excel generator (exported for reuse) ────────────────────────────────────────

export function generateBillingExcel({
  year,
  months,
  allHours,
  casesMap,
  clients,
  lawFirm,
  tipoCambio,
}: {
  year: number
  months: number[]
  allHours: HEntry[]
  casesMap: Record<string, CasoInfo>
  clients: Cliente[]
  lawFirm: LawFirm | null
  tipoCambio: number
}) {
  const sortedMonths = [...months].sort((a, b) => a - b)
  const N = sortedMonths.length
  // Cols: Concepto | RUC | Info | Moneda | [months N] | Total S/
  const TOTAL_COLS = 4 + N + 1

  const clientsById: Record<string, Cliente> = {}
  clients.forEach(c => { clientsById[c.id] = c })

  // ── Build tree: clientId → caseId → month → montoPEN ──────────────────────
  const tree: Record<string, Record<string, Record<number, number>>> = {}
  const caseCurrency: Record<string, string> = {}

  allHours.forEach(h => {
    const caso = casesMap[h.casoId]
    if (!caso?.clienteId) return
    const date = new Date(h.fechaRegistro)
    if (date.getFullYear() !== year) return
    const m = date.getMonth() + 1
    if (!sortedMonths.includes(m)) return
    const monto = h.montoTotal ?? 0
    const moneda = caso.monedaFacturacion ?? 'PEN'
    const montoPEN = moneda === 'USD' ? monto * tipoCambio : monto
    caseCurrency[h.casoId] = moneda
    if (!tree[caso.clienteId]) tree[caso.clienteId] = {}
    if (!tree[caso.clienteId][h.casoId]) tree[caso.clienteId][h.casoId] = {}
    tree[caso.clienteId][h.casoId][m] = (tree[caso.clienteId][h.casoId][m] ?? 0) + montoPEN
  })

  const clientIds = Object.keys(tree).sort((a, b) =>
    clientName(clientsById[a]).localeCompare(clientName(clientsById[b]), 'es')
  )

  const hasUSD = Object.values(caseCurrency).some(c => c === 'USD')

  // ── Build worksheet ─────────────────────────────────────────────────────────
  const ws: any = {}
  const range = { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }
  const merges: any[] = []

  const setCell = (r: number, c: number, val: any) => {
    ws[XLSXStyle.utils.encode_cell({ r, c })] = val
    if (r > range.e.r) range.e.r = r
    if (c > range.e.c) range.e.c = c
  }

  const merge = (r1: number, c1: number, r2: number, c2: number) =>
    merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } })

  const periodStr = sortedMonths.length === 12
    ? `Año ${year}`
    : sortedMonths.length === 1
    ? `${MONTH_NAMES[sortedMonths[0] - 1]} ${year}`
    : `${MONTH_NAMES[sortedMonths[0] - 1]} – ${MONTH_NAMES[sortedMonths[sortedMonths.length - 1] - 1]} ${year}`

  const today = new Date()
  const todayStr = `${String(today.getDate()).padStart(2,'0')}/${String(today.getMonth()+1).padStart(2,'0')}/${today.getFullYear()}`
  const firmAddr = lawFirm ? [lawFirm.street_address, lawFirm.city].filter(Boolean).join(', ') : ''
  const cLabel = TOTAL_COLS - 2
  const cValue = TOTAL_COLS - 1

  // Row 0: title
  setCell(0, 0, cell('REPORTE DE FACTURACIÓN', S.title))
  for (let c = 1; c < TOTAL_COLS; c++) setCell(0, c, cell('', S.headerEmpty))
  merge(0, 0, 0, TOTAL_COLS - 1)

  // Rows 1-4: firm info
  const infoRows = [
    { label: 'Razón Social:', value: lawFirm?.name ?? '',                rLabel: 'Período:',     rValue: periodStr },
    { label: 'RUC:',          value: lawFirm?.registration_number ?? '', rLabel: 'Generado el:', rValue: todayStr  },
    { label: 'Dirección:',    value: firmAddr,                            rLabel: '',              rValue: ''        },
    { label: 'Teléfono:',     value: lawFirm?.phone ?? '',               rLabel: '',              rValue: ''        },
  ]
  infoRows.forEach(({ label, value, rLabel, rValue }, i) => {
    const row = i + 1
    setCell(row, 0, cell(label, S.firmLabel))
    setCell(row, 1, cell(value, S.firmValue))
    for (let c = 2; c < cLabel; c++) setCell(row, c, cell('', S.headerEmpty))
    setCell(row, cLabel, cell(rLabel, S.firmLabel))
    setCell(row, cValue, cell(rValue, S.firmValue))
    merge(row, 1, row, cLabel - 1)
  })

  // Row 5: separator
  for (let c = 0; c < TOTAL_COLS; c++) setCell(5, c, cell('', S.spacer))
  merge(5, 0, 5, TOTAL_COLS - 1)

  // Row 6: tipo de cambio info
  const tcLabel = hasUSD
    ? `Tipo de cambio aplicado: 1 USD = S/ ${tipoCambio.toFixed(2)}  ·  Todos los montos expresados en Soles (S/)`
    : 'Todos los montos expresados en Soles (S/)'
  setCell(6, 0, cell(tcLabel, S.tcRow))
  for (let c = 1; c < TOTAL_COLS; c++) setCell(6, c, cell('', S.tcRow))
  merge(6, 0, 6, TOTAL_COLS - 1)

  // Row 7: separator
  for (let c = 0; c < TOTAL_COLS; c++) setCell(7, c, cell('', S.spacer))
  merge(7, 0, 7, TOTAL_COLS - 1)

  // Row 8: column headers
  setCell(8, 0, cell('Concepto', S.colHeaderLeft))
  setCell(8, 1, cell('RUC', S.colHeader))
  setCell(8, 2, cell('Dirección / Descripción', S.colHeaderLeft))
  setCell(8, 3, cell('Moneda', S.colHeader))
  sortedMonths.forEach((m, i) => setCell(8, 4 + i, cell(MONTH_NAMES[m - 1], S.colHeader)))
  setCell(8, 4 + N, cell('TOTAL S/', S.colHeader))

  // ── Data rows ───────────────────────────────────────────────────────────────
  let row = 9
  const grandMonths: Record<number, number> = {}
  let grandTotal = 0

  clientIds.forEach(clientId => {
    const cl = clientsById[clientId]
    const caseIds = Object.keys(tree[clientId]).sort((a, b) =>
      (casesMap[a]?.titulo ?? a).localeCompare(casesMap[b]?.titulo ?? b, 'es')
    )

    // Client header row
    setCell(row, 0, cell(`▶  ${clientName(cl)}`, S.clientHeader))
    setCell(row, 1, cell(clientRuc(cl), S.clientHeader))
    setCell(row, 2, cell(clientAddr(cl), S.clientHeader))
    setCell(row, 3, cell('', S.clientHeader))
    for (let i = 0; i < N; i++) setCell(row, 4 + i, cell('', S.clientHeaderNum))
    setCell(row, 4 + N, cell('', S.clientHeaderNum))
    row++

    // Case rows
    const clientMonths: Record<number, number> = {}
    let clientTotal = 0
    let caseIdx = 0

    caseIds.forEach(caseId => {
      const caso = casesMap[caseId]
      const moneda = caseCurrency[caseId] ?? 'PEN'
      const monedaLabel = moneda === 'USD' ? `USD → S/ ×${tipoCambio.toFixed(2)}` : 'S/.'
      const even = caseIdx % 2 === 0
      const caseTotal = sortedMonths.reduce((sum, m) => sum + (tree[clientId][caseId][m] ?? 0), 0)

      setCell(row, 0, cell(`   └  ${caso?.titulo ?? caseId}`, S.caseRow(even)))
      setCell(row, 1, cell('', S.caseRow(even)))
      setCell(row, 2, cell(caso?.descripcion ?? '', { ...S.caseRow(even), font: { sz: 9, color: { rgb: '64748B' }, italic: true } }))
      setCell(row, 3, cell(monedaLabel, S.caseMoneda(even)))

      sortedMonths.forEach((m, i) => {
        const v = tree[clientId][caseId][m] ?? 0
        setCell(row, 4 + i, numCell(v, S.caseRowNum(even)))
        clientMonths[m] = (clientMonths[m] ?? 0) + v
        grandMonths[m]  = (grandMonths[m]  ?? 0) + v
      })
      setCell(row, 4 + N, numCell(caseTotal, { ...S.caseRowNum(even), font: { bold: true, sz: 10, color: { rgb: '1E3A5F' } } }))
      clientTotal += caseTotal
      grandTotal  += caseTotal

      row++
      caseIdx++
    })

    // Client subtotal row
    setCell(row, 0, cell(`SUBTOTAL  ${clientName(cl)}`, S.subtotalLabel))
    setCell(row, 1, cell('', S.subtotalLabel))
    setCell(row, 2, cell('', S.subtotalLabel))
    setCell(row, 3, cell('S/.', S.subtotalLabel))
    merge(row, 0, row, 2)
    sortedMonths.forEach((m, i) => setCell(row, 4 + i, numCell(clientMonths[m] ?? 0, S.subtotalNum)))
    setCell(row, 4 + N, numCell(clientTotal, S.subtotalNum))
    row++

    // Blank spacer between clients
    for (let c = 0; c < TOTAL_COLS; c++) setCell(row, c, cell('', S.spacer))
    merge(row, 0, row, TOTAL_COLS - 1)
    row++
  })

  // Grand total row
  setCell(row, 0, cell('TOTAL GENERAL', S.grandTotalLabel))
  setCell(row, 1, cell('', S.grandTotalLabel))
  setCell(row, 2, cell('', S.grandTotalLabel))
  setCell(row, 3, cell('S/.', S.grandTotalLabel))
  merge(row, 0, row, 2)
  sortedMonths.forEach((m, i) => setCell(row, 4 + i, numCell(grandMonths[m] ?? 0, S.grandTotalNum)))
  setCell(row, 4 + N, numCell(grandTotal, S.grandTotalNum))

  // ── Sheet config ────────────────────────────────────────────────────────────
  ws['!ref'] = XLSXStyle.utils.encode_range(range)
  ws['!merges'] = merges
  ws['!cols'] = [
    { wch: 36 }, // Concepto
    { wch: 14 }, // RUC
    { wch: 38 }, // Dirección / Descripción
    { wch: 14 }, // Moneda
    ...sortedMonths.map(() => ({ wch: 13 })),
    { wch: 14 }, // Total S/
  ]
  ws['!rows'] = [
    { hpt: 30 }, // 0 title
    { hpt: 18 }, // 1-4 firm info
    { hpt: 18 },
    { hpt: 18 },
    { hpt: 18 },
    { hpt: 4  }, // 5 sep
    { hpt: 16 }, // 6 TC
    { hpt: 4  }, // 7 sep
    { hpt: 30 }, // 8 col headers
  ]

  const wb = XLSXStyle.utils.book_new()
  XLSXStyle.utils.book_append_sheet(wb, ws, 'Facturación')
  const fileName = `Facturacion_${year}_${sortedMonths.map(m => MONTH_SHORT[m - 1]).join('-')}.xlsx`
  XLSXStyle.writeFile(wb, fileName)
}

// ── Modal component ──────────────────────────────────────────────────────────────

export function ExportBillingModal({ onClose, allHours, casesMap, clients }: Props) {
  const [year, setYear]         = useState(currentYear)
  const [months, setMonths]     = useState<number[]>([1,2,3,4,5,6,7,8,9,10,11,12])
  const [tipoCambio, setTC]     = useState(3.75)
  const [exporting, setExporting] = useState(false)
  const [lawFirm, setLawFirm]   = useState<LawFirm | null>(null)

  useEffect(() => {
    api.get('/law-firms/current').then(r => setLawFirm(r.data.data ?? null)).catch(() => {})
  }, [])

  const hasUSD = Object.values(casesMap).some(c => c.monedaFacturacion === 'USD')

  const toggleMonth = (m: number) =>
    setMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m].sort((a, b) => a - b))

  const handleExport = () => {
    if (months.length === 0) return
    setExporting(true)
    try {
      generateBillingExcel({ year, months, allHours, casesMap, clients, lawFirm, tipoCambio })
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

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Exportar facturación a Excel</h2>
            <p className="text-xs text-slate-500 mt-0.5">Desglose por cliente y caso · Todo en Soles</p>
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
                <button key={y} onClick={() => setYear(y)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    year === y ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                  }`}>{y}</button>
              ))}
            </div>
          </div>

          {/* Meses */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Meses a exportar</label>
              <div className="flex gap-2">
                <button onClick={() => setMonths([1,2,3,4,5,6,7,8,9,10,11,12])} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Todos</button>
                <span className="text-slate-300">·</span>
                <button onClick={() => setMonths([])} className="text-xs text-slate-500 hover:text-slate-700">Limpiar</button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {MONTH_SHORT.map((name, idx) => {
                const m = idx + 1
                const sel = months.includes(m)
                return (
                  <button key={m} onClick={() => toggleMonth(m)}
                    className={`relative py-2 rounded-lg text-xs font-medium border transition-all ${
                      sel ? 'bg-blue-50 text-blue-700 border-blue-400 ring-1 ring-blue-300' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-200 hover:text-blue-500'
                    }`}>
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
              <p className="text-xs text-slate-400 mt-2">{selectedLabel} {year}</p>
            )}
          </div>

          {/* Tipo de cambio (siempre visible para que el contador pueda anotarlo) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Tipo de cambio{' '}
              <span className="text-slate-400 font-normal">(USD → S/)</span>
              {!hasUSD && <span className="ml-2 text-xs text-slate-400 italic">No hay casos en USD</span>}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 font-medium">1 USD =</span>
              <input
                type="number"
                min={1}
                step={0.01}
                value={tipoCambio}
                onChange={e => setTC(parseFloat(e.target.value) || 3.75)}
                className="w-28 border border-slate-300 rounded-md px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-500 font-medium">S/</span>
            </div>
          </div>

        </div>

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
