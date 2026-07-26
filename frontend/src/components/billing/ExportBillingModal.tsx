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
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]
const MONTH_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const currentYear = new Date().getFullYear()
const YEARS = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1]

// Fila del tipo de cambio (0-indexed en JS → Excel row = TC_ROW_JS + 1)
const TC_ROW_JS = 6

// ── Helpers ────────────────────────────────────────────────────────────────────
function colLetter(c: number): string {
  let s = ''
  for (let n = c + 1; n > 0; n = Math.floor((n - 1) / 26))
    s = String.fromCharCode(65 + (n - 1) % 26) + s
  return s
}

// Referencia absoluta al TC del mes i: e.g. $E$7, $F$7, …
function tcRef(monthIdx: number): string {
  return `$${colLetter(4 + monthIdx)}$${TC_ROW_JS + 1}`
}

function clientName(cl: Cliente | undefined): string { return cl?.nombre || cl?.name || '—' }
function clientRuc(cl: Cliente | undefined): string  { return cl?.ruc || cl?.taxId || '' }
function clientAddr(cl: Cliente | undefined): string { return cl?.direccion || cl?.streetAddress || '' }

// ── Estilos ────────────────────────────────────────────────────────────────────
const thinBorder = (rgb = 'E2E8F0') => ({
  top:    { style: 'thin', color: { rgb } },
  bottom: { style: 'thin', color: { rgb } },
  left:   { style: 'thin', color: { rgb } },
  right:  { style: 'thin', color: { rgb } },
})
const medBorder = (rgb = '047857') => ({
  top:    { style: 'medium', color: { rgb } },
  bottom: { style: 'medium', color: { rgb } },
  left:   { style: 'medium', color: { rgb } },
  right:  { style: 'medium', color: { rgb } },
})

const S = {
  title: {
    font: { bold: true, sz: 15, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E3A5F' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  },
  hdrEmpty: { fill: { fgColor: { rgb: '1E3A5F' } } },
  firmLbl: {
    font: { sz: 9, color: { rgb: '93C5FD' } },
    fill: { fgColor: { rgb: '1E3A5F' } },
    alignment: { horizontal: 'right', vertical: 'center' },
  },
  firmVal: {
    font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E3A5F' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  sep: { fill: { fgColor: { rgb: 'E2E8F0' } } },
  tcLabel: {
    font: { bold: true, sz: 10, color: { rgb: '92400E' } },
    fill: { fgColor: { rgb: 'FEF9C3' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: thinBorder('FDE68A'),
  },
  // Celda de valor TC por mes — en amarillo para que el contador la identifique fácilmente
  tcValue: {
    font: { bold: true, sz: 11, color: { rgb: '78350F' } },
    fill: { fgColor: { rgb: 'FEF08A' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top:    { style: 'medium', color: { rgb: 'F59E0B' } },
      bottom: { style: 'medium', color: { rgb: 'F59E0B' } },
      left:   { style: 'medium', color: { rgb: 'F59E0B' } },
      right:  { style: 'medium', color: { rgb: 'F59E0B' } },
    },
  },
  tcTotalEmpty: {
    fill: { fgColor: { rgb: 'FEF9C3' } },
    border: thinBorder('FDE68A'),
  },
  colHdrC: {
    font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '2563EB' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: thinBorder('93C5FD'),
  },
  colHdrL: {
    font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '2563EB' } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: thinBorder('93C5FD'),
  },
  clientHdr: {
    font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E3A5F' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: thinBorder('2563EB'),
  },
  caseRow: (even: boolean) => ({
    font: { sz: 10, color: { rgb: '1E293B' } },
    fill: { fgColor: { rgb: even ? 'F0F4FF' : 'FFFFFF' } },
    alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
    border: thinBorder('DBEAFE'),
  }),
  caseDesc: (even: boolean) => ({
    font: { sz: 9, italic: true, color: { rgb: '64748B' } },
    fill: { fgColor: { rgb: even ? 'F0F4FF' : 'FFFFFF' } },
    alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
    border: thinBorder('DBEAFE'),
  }),
  caseNum: (even: boolean) => ({
    font: { sz: 10, color: { rgb: '1E293B' } },
    fill: { fgColor: { rgb: even ? 'F0F4FF' : 'FFFFFF' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: thinBorder('DBEAFE'),
  }),
  caseNumBold: (even: boolean) => ({
    font: { bold: true, sz: 10, color: { rgb: '1E3A5F' } },
    fill: { fgColor: { rgb: even ? 'F0F4FF' : 'FFFFFF' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: thinBorder('DBEAFE'),
  }),
  caseMoneda: (even: boolean) => ({
    font: { sz: 9, italic: true, color: { rgb: '475569' } },
    fill: { fgColor: { rgb: even ? 'F0F4FF' : 'FFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: thinBorder('DBEAFE'),
  }),
  subLbl: {
    font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '059669' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: thinBorder('047857'),
  },
  subNum: {
    font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '059669' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: thinBorder('047857'),
  },
  grandLbl: {
    font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '047857' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: medBorder(),
  },
  grandNum: {
    font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '047857' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: medBorder(),
  },
}

function staticNum(v: number, s: any): any               { return { v, s, t: 'n', z: '#,##0.00' } }
// v = valor cacheado inicial; Excel lo reemplaza al evaluar la fórmula.
// Sin v, xlsx-js-style renderiza la celda en blanco en vez de fórmula.
function formulaNum(f: string, s: any, v = 0): any      { return { v, f, s, t: 'n', z: '#,##0.00' } }
function textCell(v: string, s: any): any               { return { v, s, t: 's' } }

// ── Generador principal (exportado para reutilizar en CaseDetailPage) ──────────
export function generateBillingExcel({
  year, months, allHours, casesMap, clients, lawFirm, tipoCambio,
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
  // Cols: 0=Concepto | 1=RUC | 2=Info | 3=Moneda | 4..3+N=meses | 4+N=Total S/
  const TOTAL_COLS = 5 + N

  const clientsById: Record<string, Cliente> = {}
  clients.forEach(cl => { clientsById[cl.id] = cl })

  // ── Acumular montos brutos (en moneda original) por [cliente][caso][mes] ─────
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
    caseCurrency[h.casoId] = caso.monedaFacturacion ?? 'PEN'
    if (!tree[caso.clienteId]) tree[caso.clienteId] = {}
    if (!tree[caso.clienteId][h.casoId]) tree[caso.clienteId][h.casoId] = {}
    tree[caso.clienteId][h.casoId][m] = (tree[caso.clienteId][h.casoId][m] ?? 0) + monto
  })

  const clientIds = Object.keys(tree).sort((a, b) =>
    clientName(clientsById[a]).localeCompare(clientName(clientsById[b]), 'es')
  )

  // ── Construir hoja ──────────────────────────────────────────────────────────
  const ws: any = {}
  const range = { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }
  const merges: any[] = []

  const setCell = (r: number, col: number, val: any) => {
    ws[XLSXStyle.utils.encode_cell({ r, c: col })] = val
    if (r   > range.e.r) range.e.r = r
    if (col > range.e.c) range.e.c = col
  }
  const merge = (r1: number, c1: number, r2: number, c2: number) =>
    merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } })

  const today = new Date()
  const todayStr = `${String(today.getDate()).padStart(2,'0')}/${String(today.getMonth()+1).padStart(2,'0')}/${today.getFullYear()}`
  const firmAddr = lawFirm ? [lawFirm.street_address, lawFirm.city].filter(Boolean).join(', ') : ''
  const periodStr = sortedMonths.length === 12
    ? `Año ${year}`
    : sortedMonths.length === 1
    ? `${MONTH_NAMES[sortedMonths[0] - 1]} ${year}`
    : `${MONTH_NAMES[sortedMonths[0] - 1]} – ${MONTH_NAMES[sortedMonths[sortedMonths.length - 1] - 1]} ${year}`

  const cLabel = TOTAL_COLS - 2
  const cValue = TOTAL_COLS - 1

  // ── Cabecera firma (filas 0-4) ──────────────────────────────────────────────
  setCell(0, 0, textCell('REPORTE DE FACTURACIÓN', S.title))
  for (let col = 1; col < TOTAL_COLS; col++) setCell(0, col, textCell('', S.hdrEmpty))
  merge(0, 0, 0, TOTAL_COLS - 1)

  const infoRows = [
    { lbl: 'Razón Social:', val: lawFirm?.name ?? '',                rLbl: 'Período:',     rVal: periodStr },
    { lbl: 'RUC:',          val: lawFirm?.registration_number ?? '', rLbl: 'Generado el:', rVal: todayStr  },
    { lbl: 'Dirección:',    val: firmAddr,                            rLbl: '',              rVal: ''        },
    { lbl: 'Teléfono:',     val: lawFirm?.phone ?? '',               rLbl: '',              rVal: ''        },
  ]
  infoRows.forEach(({ lbl, val, rLbl, rVal }, i) => {
    const row = i + 1
    setCell(row, 0, textCell(lbl, S.firmLbl))
    setCell(row, 1, textCell(val, S.firmVal))
    for (let col = 2; col < cLabel; col++) setCell(row, col, textCell('', S.hdrEmpty))
    setCell(row, cLabel, textCell(rLbl, S.firmLbl))
    setCell(row, cValue, textCell(rVal, S.firmVal))
    merge(row, 1, row, cLabel - 1)
  })

  // Fila 5: separador
  for (let col = 0; col < TOTAL_COLS; col++) setCell(5, col, textCell('', S.sep))
  merge(5, 0, 5, TOTAL_COLS - 1)

  // ── Fila 6: TIPO DE CAMBIO por mes (TC_ROW_JS = 6 → Excel fila 7) ────────────
  // Cols 0-3 merged → etiqueta descriptiva
  // Col 4+i         → TC editable para el mes i (celdas en amarillo)
  // Col 4+N         → nota orientativa
  setCell(6, 0, textCell('Tipo de cambio USD → S/ (por mes):', S.tcLabel))
  setCell(6, 1, textCell('', S.tcLabel))
  setCell(6, 2, textCell('', S.tcLabel))
  setCell(6, 3, textCell('', S.tcLabel))
  merge(6, 0, 6, 3)

  sortedMonths.forEach((_, i) => {
    // Un valor TC independiente por mes — el contador puede cambiarlos en Excel
    setCell(6, 4 + i, { v: tipoCambio, s: S.tcValue, t: 'n', z: '#,##0.000' })
  })
  setCell(6, 4 + N, textCell('← modificar por mes', S.tcTotalEmpty))

  // Fila 7: separador
  for (let col = 0; col < TOTAL_COLS; col++) setCell(7, col, textCell('', S.sep))
  merge(7, 0, 7, TOTAL_COLS - 1)

  // ── Fila 8: encabezados de columna ──────────────────────────────────────────
  setCell(8, 0, textCell('Concepto', S.colHdrL))
  setCell(8, 1, textCell('RUC', S.colHdrC))
  setCell(8, 2, textCell('Dirección / Descripción', S.colHdrL))
  setCell(8, 3, textCell('Moneda', S.colHdrC))
  sortedMonths.forEach((m, i) => setCell(8, 4 + i, textCell(MONTH_NAMES[m - 1], S.colHdrC)))
  setCell(8, 4 + N, textCell('TOTAL S/', S.colHdrC))

  // ── Filas de datos ──────────────────────────────────────────────────────────
  let row = 9
  const clientSubtotalExcelRows: number[] = []

  clientIds.forEach(clientId => {
    const cl = clientsById[clientId]
    const caseIds = Object.keys(tree[clientId]).sort((a, b) =>
      (casesMap[a]?.titulo ?? a).localeCompare(casesMap[b]?.titulo ?? b, 'es')
    )

    // Cabecera del cliente
    setCell(row, 0, textCell(`▶  ${clientName(cl)}`, S.clientHdr))
    setCell(row, 1, textCell(clientRuc(cl), S.clientHdr))
    setCell(row, 2, textCell(clientAddr(cl), S.clientHdr))
    setCell(row, 3, textCell('', S.clientHdr))
    for (let i = 0; i <= N; i++) setCell(row, 4 + i, textCell('', S.clientHdr))
    merge(row, 0, row, 2)
    row++

    const firstCaseJSRow = row

    let caseIdx = 0
    caseIds.forEach(caseId => {
      const caso   = casesMap[caseId]
      const moneda = caseCurrency[caseId] ?? caso?.monedaFacturacion ?? 'PEN'
      const isUSD  = moneda === 'USD'
      const even   = caseIdx % 2 === 0
      const excelRow = row + 1

      setCell(row, 0, textCell(`   └  ${caso?.titulo ?? caseId}`, S.caseRow(even)))
      setCell(row, 1, textCell('', S.caseRow(even)))
      setCell(row, 2, textCell(caso?.descripcion ?? '', S.caseDesc(even)))
      setCell(row, 3, textCell(isUSD ? 'USD' : 'S/.', S.caseMoneda(even)))

      let caseTotalSoles = 0
      sortedMonths.forEach((m, i) => {
        const rawAmount = tree[clientId][caseId][m] ?? 0
        if (isUSD) {
          // Fórmula: monto_bruto_USD × TC_del_mes_i  →  resultado en S/
          // tcRef(i) → $E$7 para mes 0, $F$7 para mes 1, etc. (ref. absoluta)
          // v = valor cacheado con el TC por defecto; Excel lo recalcula al abrir.
          const cached = rawAmount * tipoCambio
          setCell(row, 4 + i, formulaNum(`${rawAmount}*${tcRef(i)}`, S.caseNum(even), cached))
          caseTotalSoles += cached
        } else {
          setCell(row, 4 + i, staticNum(rawAmount, S.caseNum(even)))
          caseTotalSoles += rawAmount
        }
      })

      // Total del caso = SUM de sus columnas mensuales (ya en S/)
      const firstMonthL = colLetter(4)
      const lastMonthL  = colLetter(4 + N - 1)
      setCell(row, 4 + N, formulaNum(
        `SUM(${firstMonthL}${excelRow}:${lastMonthL}${excelRow})`,
        S.caseNumBold(even),
        caseTotalSoles,
      ))

      row++
      caseIdx++
    })

    const lastCaseJSRow = row - 1
    const subtotalExcelRow = row + 1
    clientSubtotalExcelRows.push(subtotalExcelRow)

    // Subtotal del cliente
    setCell(row, 0, textCell(`SUBTOTAL  ${clientName(cl)}`, S.subLbl))
    setCell(row, 1, textCell('', S.subLbl))
    setCell(row, 2, textCell('', S.subLbl))
    setCell(row, 3, textCell('S/.', S.subLbl))
    merge(row, 0, row, 2)

    const fromExcelRow = firstCaseJSRow + 1
    const toExcelRow   = lastCaseJSRow  + 1

    sortedMonths.forEach((_, i) => {
      const colL = colLetter(4 + i)
      setCell(row, 4 + i, formulaNum(
        `SUM(${colL}${fromExcelRow}:${colL}${toExcelRow})`,
        S.subNum,
      ))
    })
    const totalColL = colLetter(4 + N)
    setCell(row, 4 + N, formulaNum(
      `SUM(${totalColL}${fromExcelRow}:${totalColL}${toExcelRow})`,
      S.subNum,
    ))
    row++

    // Separador entre clientes
    for (let col = 0; col < TOTAL_COLS; col++) setCell(row, col, textCell('', S.sep))
    merge(row, 0, row, TOTAL_COLS - 1)
    row++
  })

  // ── TOTAL GENERAL ───────────────────────────────────────────────────────────
  setCell(row, 0, textCell('TOTAL GENERAL', S.grandLbl))
  setCell(row, 1, textCell('', S.grandLbl))
  setCell(row, 2, textCell('', S.grandLbl))
  setCell(row, 3, textCell('S/.', S.grandLbl))
  merge(row, 0, row, 2)

  if (clientSubtotalExcelRows.length > 0) {
    sortedMonths.forEach((_, i) => {
      const colL = colLetter(4 + i)
      const refs = clientSubtotalExcelRows.map(r => `${colL}${r}`).join(',')
      setCell(row, 4 + i, formulaNum(`SUM(${refs})`, S.grandNum))
    })
    const totalColL = colLetter(4 + N)
    const refs = clientSubtotalExcelRows.map(r => `${totalColL}${r}`).join(',')
    setCell(row, 4 + N, formulaNum(`SUM(${refs})`, S.grandNum))
  } else {
    for (let i = 0; i <= N; i++) setCell(row, 4 + i, staticNum(0, S.grandNum))
  }

  // ── Configuración del sheet ─────────────────────────────────────────────────
  ws['!ref'] = XLSXStyle.utils.encode_range(range)
  ws['!merges'] = merges
  ws['!cols'] = [
    { wch: 36 }, // Concepto
    { wch: 14 }, // RUC
    { wch: 38 }, // Dirección / Descripción
    { wch: 10 }, // Moneda
    ...sortedMonths.map(() => ({ wch: 14 })),
    { wch: 14 }, // Total S/
  ]
  ws['!rows'] = [
    { hpt: 30 },
    { hpt: 18 },
    { hpt: 18 },
    { hpt: 18 },
    { hpt: 18 },
    { hpt: 5  },
    { hpt: 26 }, // fila TC por mes
    { hpt: 5  },
    { hpt: 30 }, // headers
  ]

  const wb = XLSXStyle.utils.book_new()
  XLSXStyle.utils.book_append_sheet(wb, ws, 'Facturación')
  const fileName = `Facturacion_${year}_${sortedMonths.map(m => MONTH_SHORT[m - 1]).join('-')}.xlsx`
  XLSXStyle.writeFile(wb, fileName)
}

// ── Componente modal ───────────────────────────────────────────────────────────
export function ExportBillingModal({ onClose, allHours, casesMap, clients }: Props) {
  const [year, setYear]       = useState(currentYear)
  const [months, setMonths]   = useState<number[]>([1,2,3,4,5,6,7,8,9,10,11,12])
  const [tipoCambio, setTC]   = useState(3.75)
  const [exporting, setEx]    = useState(false)
  const [lawFirm, setLawFirm] = useState<LawFirm | null>(null)

  useEffect(() => {
    api.get('/law-firms/current').then(r => setLawFirm(r.data.data ?? null)).catch(() => {})
  }, [])

  const hasUSD = Object.values(casesMap).some(c => c.monedaFacturacion === 'USD')

  const toggleMonth = (m: number) =>
    setMonths(prev =>
      prev.includes(m)
        ? prev.filter(x => x !== m)
        : [...prev, m].sort((a, b) => a - b)
    )

  const handleExport = () => {
    if (months.length === 0) return
    setEx(true)
    try {
      generateBillingExcel({ year, months, allHours, casesMap, clients, lawFirm, tipoCambio })
    } finally {
      setEx(false)
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
            <p className="text-xs text-slate-500 mt-0.5">Desglose por cliente y caso · Todo formulado en Soles</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
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
                    year === y
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                  }`}>
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
                <button onClick={() => setMonths([1,2,3,4,5,6,7,8,9,10,11,12])}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium">Todos</button>
                <span className="text-slate-300">·</span>
                <button onClick={() => setMonths([])}
                  className="text-xs text-slate-500 hover:text-slate-700">Limpiar</button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {MONTH_SHORT.map((name, idx) => {
                const m = idx + 1
                const sel = months.includes(m)
                return (
                  <button key={m} onClick={() => toggleMonth(m)}
                    className={`relative py-2 rounded-lg text-xs font-medium border transition-all ${
                      sel
                        ? 'bg-blue-50 text-blue-700 border-blue-400 ring-1 ring-blue-300'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-blue-200 hover:text-blue-500'
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

          {/* Tipo de cambio */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <label className="block text-sm font-medium text-amber-900 mb-1.5">
              Tipo de cambio inicial <span className="font-normal text-amber-700">(USD → S/)</span>
              {!hasUSD && (
                <span className="ml-2 text-xs text-amber-600 italic">No hay casos en USD actualmente</span>
              )}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-amber-700 font-medium">1 USD =</span>
              <input
                type="number" min={1} step={0.001} value={tipoCambio}
                onChange={e => setTC(parseFloat(e.target.value) || 3.75)}
                className="w-28 border border-amber-300 rounded-md px-3 py-1.5 text-sm text-right bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <span className="text-sm text-amber-700 font-medium">S/</span>
            </div>
            <p className="text-xs text-amber-600 mt-1.5 leading-relaxed">
              Valor inicial aplicado a todos los meses. En el Excel, cada mes tiene su propia
              celda TC en la fila 7 (resaltada en amarillo) — el contador puede ajustar cada
              mes de forma independiente y todos los totales se recalculan automáticamente.
            </p>
          </div>

        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={handleExport}
            disabled={months.length === 0 || exporting}
            isLoading={exporting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {!exporting && <Download size={14} className="mr-1.5" />}
            Descargar Excel
          </Button>
        </div>
      </div>
    </div>
  )
}
