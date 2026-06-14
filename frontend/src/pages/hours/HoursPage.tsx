import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { HoursForm } from '@/components/hours/HoursForm'
import {
  Clock, DollarSign, TrendingUp, Filter, RotateCcw, Plus, X,
  ChevronRight, ChevronDown, Users, BarChart2, Activity, Loader, Zap, Table2,
} from 'lucide-react'
import api from '@/lib/axios'

// ── Types ─────────────────────────────────────────────────────────────────────

interface HEntry {
  id: string
  casoId: string
  tareaId?: string
  usuarioId: string
  horas?: number
  horasTrabajas?: number
  montoTotal?: number
  tarifaHora?: number
  fechaRegistro: string
  usuario?: { nombre: string }
}

interface CasoInfo {
  id: string
  titulo: string
  clienteId?: string
  clienteNombre?: string
  tipoFacturacion?: string | null
  monedaFacturacion?: string
  precioFacturacion?: number | null
  parentCaseId?: string | null        // null = caso raíz
  abogadoPrincipalId?: string
}

interface TaskGroup {
  tareaId: string
  horas: number
  monto: number
  registros: number
  entries: HEntry[]
}

interface AbogadoCasoGroup {
  casoId: string
  horas: number
  monto: number
  byTarea: Record<string, { tareaId: string; horas: number; monto: number; entries: HEntry[] }>
}

interface AbogadoGroup {
  userId: string
  horas: number
  monto: number
  registros: number
  byCaso: Record<string, AbogadoCasoGroup>
}

interface CasoGroup {
  casoId: string
  horas: number
  monto: number
  registros: number
  byTarea: Record<string, TaskGroup>
}

interface ChartPoint {
  label: string      // etiqueta corta para el eje X
  fullLabel?: string // nombre completo para el tooltip
  horas: number
  monto: number
}

interface SeriesData {
  key: string
  label: string
  color: string
  points: ChartPoint[]
}

const PALETTE = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16','#f97316']

// ── Helpers ───────────────────────────────────────────────────────────────────

const getH = (h: HEntry) => h.horas ?? h.horasTrabajas ?? 0
const getM = (h: HEntry) => h.montoTotal ?? 0

function formatDuration(horas: number): string {
  const m = Math.round(horas * 60)
  if (m < 60) return `${m} min`
  const hh = Math.floor(m / 60)
  const mm = m % 60
  return mm > 0 ? `${hh}h ${mm}min` : `${hh}h`
}

function formatMonto(v: number) {
  return v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const MONTHS      = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MONTHS_LONG = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto',
                     'Septiembre','Octubre','Noviembre','Diciembre']

// ── Multi-select filter ───────────────────────────────────────────────────────

function MultiSelect({
  label, opts, selected, onChange,
}: {
  label: string
  opts: { v: string; l: string }[]
  selected: string[]
  onChange: (vals: string[]) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [pos, setPos]   = React.useState({ top: 0, left: 0, width: 0 })
  const btnRef = React.useRef<HTMLButtonElement>(null)
  const dropRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        dropRef.current && !dropRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    setOpen(o => !o)
  }

  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v])

  const displayLabel = selected.length === 0
    ? 'Todos'
    : selected.length === 1
    ? (opts.find(o => o.v === selected[0])?.l ?? selected[0])
    : `${selected.length} seleccionados`

  return (
    <div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <button
        ref={btnRef}
        onClick={handleToggle}
        className="w-full text-xs border border-slate-200 rounded-md bg-white text-slate-700 px-2 py-1.5 text-left flex items-center justify-between hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown size={10} className={`flex-shrink-0 ml-1 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          ref={dropRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
          className="bg-white border border-slate-200 rounded-md shadow-lg max-h-44 overflow-y-auto"
        >
          {opts.map(o => (
            <label key={o.v} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(o.v)}
                onChange={() => toggle(o.v)}
                className="w-3 h-3 rounded accent-blue-600 flex-shrink-0"
              />
              <span className="text-xs text-slate-700 truncate">{o.l}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Chart ─────────────────────────────────────────────────────────────────────

function HoursChart({
  data,
  mode = 'bar',
  metric = 'horas',
  series,
  rotateLabels = false,
}: {
  data: ChartPoint[]
  mode?: 'bar' | 'line'
  metric?: 'horas' | 'monto'
  series?: SeriesData[]
  rotateLabels?: boolean
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [hovSeries, setHovSeries] = useState<number | null>(null)
  const fmtV    = (v: number) => metric === 'horas' ? formatDuration(v) : `$ ${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0)}`
  const fmtTick = (v: number) => metric === 'horas' ? String(v) : (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))
  const W = 640; const H = 320
  const PL = 50; const PR = 10; const PT = 30
  const PB = 140         // espacio para labels a 45° en dos líneas
  const plotW = W - PL - PR; const plotH = H - PT - PB
  // Split label into up to 2 lines at word boundaries (max ~20 chars per line)
  const wrapLabel = (s: string, max = 20): [string, string] => {
    if (s.length <= max) return [s, '']
    const words = s.split(' ')
    let l1 = '', l2 = ''
    for (const w of words) {
      if (!l1 || (l1 + ' ' + w).length <= max) { l1 = l1 ? l1 + ' ' + w : w }
      else { l2 = l2 ? l2 + ' ' + w : w }
    }
    return [l1, l2]
  }

  // ── Multi-series grouped bar chart ────────────────────────────────────────
  if (series && series.length > 0) {
    const valS   = (p: ChartPoint) => metric === 'horas' ? p.horas : p.monto
    const n2     = series[0]?.points.length || 1
    const slot2  = plotW / Math.max(n2, 1)
    const ns     = series.length
    const groupW = Math.min(slot2 * 0.85, ns * 36)
    const bw2    = groupW / ns
    const maxV   = Math.max(...series.flatMap(s => s.points.map(valS)), 1)
    const bh2    = (v: number) => (v / maxV) * plotH
    const by2    = (v: number) => PT + plotH - bh2(v)
    const bx2    = (si: number, i: number) => PL + i * slot2 + (slot2 - groupW) / 2 + si * bw2
    const cx2    = (i: number) => PL + i * slot2 + slot2 / 2
    const ticks2 = [0, 0.25, 0.5, 0.75, 1].map(p => ({
      v: Math.round(maxV * p * 10) / 10,
      y: PT + plotH - p * plotH,
    }))
    const fs2 = n2 > 15 ? 9 : 11

    return (
      <div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 300 }}>
          {/* Grid */}
          {ticks2.map(t => (
            <g key={t.v}>
              <line x1={PL} y1={t.y} x2={W - PR} y2={t.y} stroke="#e2e8f0" strokeWidth={1} />
              <text x={PL - 6} y={t.y + 4} textAnchor="end" fontSize={10} fill="#94a3b8">{fmtTick(t.v)}</text>
            </g>
          ))}
          {/* Grouped bars */}
          {series.map((s, si) => (
            s.points.map((p, i) => {
              const v    = valS(p)
              const barH = bh2(v)
              const isHov = hovSeries === si
              return (
                <g key={`${si}-${i}`}
                  onMouseEnter={() => setHovSeries(si)}
                  onMouseLeave={() => setHovSeries(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x={bx2(si, i)} y={by2(v)} width={Math.max(bw2 - 1, 1)} height={Math.max(barH, 0)} rx={2}
                    fill={s.color} opacity={hovSeries !== null && !isHov ? 0.35 : 0.85}
                  />
                  {isHov && v > 0 && (() => {
                    const tx = bx2(si, i) + bw2 / 2
                    const MAX_S = 22
                    const sLabel = s.label.length > MAX_S ? s.label.slice(0, MAX_S - 1) + '…' : s.label
                    const sW = Math.max(sLabel.length * 6.5, 76)
                    const ty = Math.max(by2(v) - 44, PT + 2)
                    return (
                      <g>
                        <rect x={tx - sW / 2} y={ty} width={sW} height={36} rx={4} fill="#1e293b" />
                        <text x={tx} y={ty + 13} textAnchor="middle" fontSize={9} fill={s.color} fontWeight={600}>{sLabel}</text>
                        <text x={tx} y={ty + 27} textAnchor="middle" fontSize={10} fill="white" fontWeight={600}>{fmtV(v)}</text>
                      </g>
                    )
                  })()}
                </g>
              )
            })
          ))}
          {/* X labels — rotated 45° */}
          {(series[0]?.points || []).map((p, i) => {
            const lx2 = cx2(i); const ly2 = H - PB + 6
            return (
              <text key={i} textAnchor="end" fontSize={fs2}
                fill={hovSeries !== null ? '#94a3b8' : '#64748b'}
                transform={`rotate(-45,${lx2},${ly2})`}>
                {(() => { const [a, b] = wrapLabel(p.label); return (<><tspan x={lx2} y={ly2}>{a}</tspan>{b && <tspan x={lx2} y={ly2 + 11}>{b}</tspan>}</>) })()}
              </text>
            )
          })}
          <line x1={PL} y1={PT + plotH} x2={W - PR} y2={PT + plotH} stroke="#cbd5e1" strokeWidth={1.5} />
        </svg>
        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', padding: '2px 0 0 50px' }}>
          {series.map((s, si) => (
            <div key={s.key}
              style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', opacity: hovSeries !== null && hovSeries !== si ? 0.4 : 1, transition: 'opacity .15s' }}
              onMouseEnter={() => setHovSeries(si)}
              onMouseLeave={() => setHovSeries(null)}
            >
              <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#64748b' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Single-series bar / line chart ────────────────────────────────────────
  const val   = (d: ChartPoint) => metric === 'horas' ? d.horas : d.monto
  const maxH  = Math.max(...data.map(d => val(d)), 1)
  const n    = data.length
  const slot = plotW / n
  const bw   = Math.min(Math.max(slot * 0.55, 4), 40)
  const cx   = (i: number) => PL + i * slot + slot / 2
  const bx   = (i: number) => PL + i * slot + (slot - bw) / 2
  const bh   = (h: number) => (h / maxH) * plotH
  const by   = (h: number) => PT + plotH - bh(h)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(p => ({
    v: Math.round(maxH * p * 10) / 10,
    y: PT + plotH - p * plotH,
  }))
  const pts      = data.map((d, i) => ({ x: cx(i), y: val(d) > 0 ? by(val(d)) : PT + plotH }))
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = pts.length > 1
    ? `${linePath} L ${pts[pts.length - 1].x} ${PT + plotH} L ${pts[0].x} ${PT + plotH} Z`
    : ''
  const fs = n > 20 ? 9 : 11

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 300 }}>
      {ticks.map(t => (
        <g key={t.v}>
          <line x1={PL} y1={t.y} x2={W - PR} y2={t.y} stroke="#e2e8f0" strokeWidth={1} />
          <text x={PL - 6} y={t.y + 4} textAnchor="end" fontSize={10} fill="#94a3b8">{fmtTick(t.v)}</text>
        </g>
      ))}

      {mode === 'bar' ? (
        data.map((d, i) => {
          const barH  = bh(val(d))
          const isHov = hovered === i
          const lx = cx(i); const ly = PT + plotH + 6
          const tooltipLabel = d.fullLabel || d.label
          return (
            <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
               style={{ cursor: 'pointer' }}>
              <rect
                x={bx(i)} y={by(val(d))} width={bw} height={Math.max(barH, 0)} rx={3}
                fill={val(d) > 0 ? (isHov ? '#1d4ed8' : '#3b82f6') : '#e2e8f0'}
                opacity={isHov ? 1 : 0.85}
              />
              {/* Etiqueta eje X — rotada 45° en modo categórico */}
              <text
                fontSize={fs} fill={isHov ? '#1d4ed8' : '#64748b'}
                fontWeight={isHov ? 600 : 400}
                textAnchor="end"
                transform={`rotate(-45,${lx},${ly})`}
              >
                {(() => { const [a, b] = wrapLabel(d.label); return (<><tspan x={lx} y={ly}>{a}</tspan>{b && <tspan x={lx} y={ly + 11}>{b}</tspan>}</>) })()}
              </text>
              {val(d) > 0 && n <= 15 && (
                <text x={cx(i)} y={by(val(d)) - 4} textAnchor="middle" fontSize={9}
                  fill={isHov ? '#1d4ed8' : '#475569'} fontWeight={500}>{fmtV(val(d))}</text>
              )}
              {isHov && (() => {
                const v = val(d)

                // Split long labels into max 2 lines so text never overflows the box
                const CHARS_PER_LINE = 26
                const splitLabel = (lbl: string): string[] => {
                  if (lbl.length <= CHARS_PER_LINE) return [lbl]
                  const words = lbl.split(' ')
                  let l1 = '', l2 = ''
                  for (const w of words) {
                    if (!l1 || (l1 + ' ' + w).length <= CHARS_PER_LINE) {
                      l1 = l1 ? l1 + ' ' + w : w
                    } else {
                      l2 = l2 ? l2 + ' ' + w : w
                    }
                  }
                  if (l2.length > CHARS_PER_LINE) l2 = l2.slice(0, CHARS_PER_LINE - 1) + '…'
                  return l2 ? [l1, l2] : [l1]
                }
                const labelLines = splitLabel(tooltipLabel)
                const maxLineLen = Math.max(...labelLines.map(l => l.length))
                const tW = Math.max(maxLineLen * 6.5, 80)
                const tx = Math.min(Math.max(cx(i) - tW / 2, PL), W - PR - tW)
                const labelH = labelLines.length * 13
                const hasExtra = v > 0 && (metric === 'horas' ? d.monto > 0 : d.horas > 0)
                const tH = labelH + (hasExtra ? 28 : 20)
                const ty = v > 0 ? Math.max(by(v) - tH - 6, PT + 2) : PT + plotH - tH - 6
                return (
                  <g>
                    <rect x={tx} y={ty} width={tW} height={tH} rx={4} fill="#1e293b" />
                    {labelLines.map((line, li) => (
                      <text key={li} x={tx + tW / 2} y={ty + 12 + li * 13}
                        textAnchor="middle" fontSize={9} fill="#94a3b8">{line}</text>
                    ))}
                    <text x={tx + tW / 2} y={ty + labelH + 13} textAnchor="middle" fontSize={10}
                      fill="white" fontWeight={600}>{v > 0 ? fmtV(v) : '—'}</text>
                    {v > 0 && metric === 'horas' && d.monto > 0 && (
                      <text x={tx + tW / 2} y={ty + labelH + 25} textAnchor="middle" fontSize={9} fill="#94a3b8">
                        $ {d.monto.toFixed(0)}
                      </text>
                    )}
                    {v > 0 && metric === 'monto' && d.horas > 0 && (
                      <text x={tx + tW / 2} y={ty + labelH + 25} textAnchor="middle" fontSize={9} fill="#94a3b8">
                        {formatDuration(d.horas)}
                      </text>
                    )}
                  </g>
                )
              })()}
            </g>
          )
        })
      ) : (
        <>
          <path d={areaPath} fill="#3b82f6" fillOpacity={0.08} />
          <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" />
          {data.map((d, i) => {
            const isHov = hovered === i
            return (
              <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
                 style={{ cursor: 'pointer' }}>
                {val(d) > 0 && (
                  <circle cx={pts[i].x} cy={pts[i].y} r={isHov ? 5 : 3}
                    fill={isHov ? '#1d4ed8' : '#3b82f6'} stroke="white" strokeWidth={1.5} />
                )}
                <text textAnchor="end" fontSize={fs}
                  fill={isHov ? '#1d4ed8' : '#64748b'}
                  transform={`rotate(-45,${pts[i].x},${H - PB + 6})`}>
                  {(() => { const lx0 = pts[i].x; const ly0 = H - PB + 6; const [a, b] = wrapLabel(d.label); return (<><tspan x={lx0} y={ly0}>{a}</tspan>{b && <tspan x={lx0} y={ly0 + 11}>{b}</tspan>}</>) })()}
                </text>
                {isHov && val(d) > 0 && (() => {
                  const ty = Math.max(pts[i].y - 46, PT + 2)
                  return (
                  <g>
                    <rect x={pts[i].x - 40} y={ty} width={80} height={38} rx={4} fill="#1e293b" />
                    <text x={pts[i].x} y={ty + 17} textAnchor="middle" fontSize={10}
                      fill="white" fontWeight={600}>{fmtV(val(d))}</text>
                    {metric === 'horas' && d.monto > 0 && (
                      <text x={pts[i].x} y={ty + 31} textAnchor="middle" fontSize={9} fill="#94a3b8">
                        $ {d.monto.toFixed(0)}
                      </text>
                    )}
                    {metric === 'monto' && d.horas > 0 && (
                      <text x={pts[i].x} y={ty + 31} textAnchor="middle" fontSize={9} fill="#94a3b8">
                        {formatDuration(d.horas)}
                      </text>
                    )}
                  </g>
                  )
                })()}
              </g>
            )
          })}
        </>
      )}

      <line x1={PL} y1={PT + plotH} x2={W - PR} y2={PT + plotH} stroke="#cbd5e1" strokeWidth={1.5} />
    </svg>
  )


}

// ── Pivot Table ───────────────────────────────────────────────────────────────

function PivotTable({
  data,
  series,
  metric,
}: {
  data: ChartPoint[]
  series?: SeriesData[]
  metric: 'horas' | 'monto'
}) {
  const fmtH = (v: number) => formatDuration(v)
  const fmtM = (v: number) => v > 0 ? `$ ${v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'
  const fmtVal = (v: number) => metric === 'horas' ? fmtH(v) : fmtM(v)
  const getVal = (p: ChartPoint) => metric === 'horas' ? p.horas : p.monto

  const thCls = 'px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-200 whitespace-nowrap'
  const tdCls = 'px-3 py-2 text-xs text-slate-700 border-b border-slate-100'
  const tdNum = 'px-3 py-2 text-xs text-right tabular-nums border-b border-slate-100'
  const tdTot = 'px-3 py-2 text-xs font-semibold text-right tabular-nums border-b border-slate-200 bg-slate-50'

  // ── Multi-series pivot ──────────────────────────────────────────────────────
  if (series && series.length > 0) {
    const grandTotal = series.reduce((a, s) => a + s.points.reduce((b, p) => b + getVal(p), 0), 0)
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className={thCls}>Categoría</th>
              {series.map(s => (
                <th key={s.key} className={thCls + ' text-right'}>
                  <span className="inline-flex items-center gap-1">
                    <span style={{ display:'inline-block', width:8, height:8, borderRadius:2, background:s.color }} />
                    {s.label}
                  </span>
                </th>
              ))}
              <th className={thCls + ' text-right'}>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => {
              const rowTotal = series.reduce((a, s) => a + getVal(s.points[i] || { horas: 0, monto: 0 }), 0)
              const pct = grandTotal > 0 ? Math.round((rowTotal / grandTotal) * 100) : 0
              return (
                <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                  <td className={tdCls + ' font-medium'} title={d.fullLabel}>{d.fullLabel || d.label}</td>
                  {series.map(s => {
                    const v = getVal(s.points[i] || { horas: 0, monto: 0 })
                    return (
                      <td key={s.key} className={tdNum + (v > 0 ? ' text-slate-800' : ' text-slate-300')}>
                        {v > 0 ? fmtVal(v) : '—'}
                      </td>
                    )
                  })}
                  <td className={tdTot}>
                    {fmtVal(rowTotal)}
                    {pct > 0 && <span className="ml-1.5 text-[10px] text-slate-400 font-normal">{pct}%</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50">
              <td className="px-3 py-2 text-xs font-semibold text-slate-700 border-t-2 border-slate-200">Total</td>
              {series.map(s => {
                const col = s.points.reduce((a, p) => a + getVal(p), 0)
                return <td key={s.key} className={tdTot + ' border-t-2 border-slate-200'}>{fmtVal(col)}</td>
              })}
              <td className={tdTot + ' border-t-2 border-slate-300 text-slate-900'}>{fmtVal(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    )
  }

  // ── Simple pivot (sin segunda agrupación) ───────────────────────────────────
  const totalHoras = data.reduce((a, d) => a + d.horas, 0)
  const totalMonto = data.reduce((a, d) => a + d.monto, 0)

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className={thCls}>Categoría</th>
            <th className={thCls + ' text-right'}>Horas</th>
            <th className={thCls + ' text-right'}>Facturación</th>
            <th className={thCls + ' text-right'}>% del total</th>
          </tr>
        </thead>
        <tbody>
          {data.filter(d => d.horas > 0 || d.monto > 0).map((d, i) => {
            const pct = metric === 'horas'
              ? (totalHoras > 0 ? Math.round((d.horas / totalHoras) * 100) : 0)
              : (totalMonto > 0 ? Math.round((d.monto / totalMonto) * 100) : 0)
            return (
              <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                <td className={tdCls + ' font-medium'} title={d.fullLabel}>{d.fullLabel || d.label}</td>
                <td className={tdNum}>{fmtH(d.horas)}</td>
                <td className={tdNum}>{fmtM(d.monto)}</td>
                <td className={tdNum}>
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span>{pct}%</span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50">
            <td className="px-3 py-2 text-xs font-semibold text-slate-700 border-t-2 border-slate-200">Total</td>
            <td className={tdTot + ' border-t-2 border-slate-200'}>{fmtH(totalHoras)}</td>
            <td className={tdTot + ' border-t-2 border-slate-200'}>{fmtM(totalMonto)}</td>
            <td className={tdTot + ' border-t-2 border-slate-200'}>100%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function HoursPage() {
  const navigate = useNavigate()

  // ── Data ──────────────────────────────────────────────────────────────────
  const [allHours, setAllHours]       = useState<HEntry[]>([])
  const [cases, setCases]             = useState<CasoInfo[]>([])
  const [rootCaseIds, setRootCaseIds] = useState<Set<string>>(new Set())
  const [clients, setClients]         = useState<any[]>([])
  const [users, setUsers]             = useState<any[]>([])
  const [loading, setLoading]   = useState(true)

  // ── Modals ─────────────────────────────────────────────────────────────────
  const [showModal, setShowModal]                     = useState(false)
  const [quickRegisterCaso, setQuickRegisterCaso]     = useState<string | null>(null)
  useEscapeKey(() => { setShowModal(false); setQuickRegisterCaso(null) }, showModal || !!quickRegisterCaso)

  // ── Expandable rows ────────────────────────────────────────────────────────
  const [expandedCasos, setExpandedCasos]             = useState<Set<string>>(new Set())
  const [casoTareas, setCasoTareas]                   = useState<Record<string, { id: string; titulo: string }[]>>({})
  const [casoTareasLoading, setCasoTareasLoading]     = useState<Set<string>>(new Set())
  const [expandedTareas, setExpandedTareas]           = useState<Set<string>>(new Set())
  const [expandedAbogados, setExpandedAbogados]       = useState<Set<string>>(new Set())
  const [expandedAbgCasos, setExpandedAbgCasos]       = useState<Set<string>>(new Set())
  const [expandedAbgTareas, setExpandedAbgTareas]     = useState<Set<string>>(new Set())

  // ── Chart mode ─────────────────────────────────────────────────────────────
  const [chartMode, setChartMode]     = useState<'bar' | 'line'>('bar')
  const [chartMetric, setChartMetric] = useState<'horas' | 'monto'>('horas')
  const [chartGroupBy, setChartGroupBy] = useState<'mes' | 'tarifa' | 'abogado' | 'cliente' | 'proceso'>('mes')
  const [chartGroupBy2, setChartGroupBy2] = useState<'none' | 'tarifa' | 'abogado' | 'cliente' | 'proceso' | 'mes'>('none')
  const [chartView, setChartView] = useState<'chart' | 'table'>('chart')

  // ── Filters ────────────────────────────────────────────────────────────────
  const now = new Date()
  const [yearFilter,   setYearFilter]   = useState(now.getFullYear())
  const [monthFilter,  setMonthFilter]  = useState<string[]>([])
  const [casoFilter,   setCasoFilter]   = useState<string[]>([])
  const [clientFilter, setClientFilter] = useState<string[]>([])
  const [userFilter,   setUserFilter]   = useState<string[]>([])
  const [tarifaFilter, setTarifaFilter] = useState<string[]>([])

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.allSettled([
      api.get('/hours/firm-hours?limit=1000'),
      api.get('/cases?limit=500'),                           // solo raíz → para la lista y conteo
      api.get('/cases?limit=500&include_subcases=true'),     // todos → para el mapa (evita huérfanos)
      api.get('/clients?limit=100'),
      api.get('/users?limit=100'),
    ]).then(([hRes, rootRes, allCasesRes, clRes, uRes]) => {
      if (hRes.status === 'fulfilled') setAllHours(hRes.value.data.data || [])

      const mapCase = (c: any): CasoInfo => ({
        id: c.id,
        titulo: c.titulo || c.title || c.id,
        clienteId: c.clienteId,
        clienteNombre: c.cliente?.nombre,
        tipoFacturacion: c.tipoFacturacion,
        monedaFacturacion: c.monedaFacturacion || 'PEN',
        precioFacturacion: c.precioFacturacion ?? null,
        parentCaseId: c.parentCaseId ?? null,
        abogadoPrincipalId: c.abogadoPrincipalId,
      })

      // Casos raíz: los que ve el usuario en la pestaña Procesos
      if (rootRes.status === 'fulfilled') {
        const rootRaw = rootRes.value.data.data || []
        setRootCaseIds(new Set(rootRaw.map((c: any) => c.id as string)))
        // cases se usa para dropdowns de filtro — solo raíz
        setCases(rootRaw.map(mapCase))
      }

      // casesMap también incluye subcasos para evitar horas huérfanas
      if (allCasesRes.status === 'fulfilled') {
        const allRaw = allCasesRes.value.data.data || []
        // Merge: setCases ya tiene raíz; aquí seteamos todos en el mapa internamente
        // usando el estado cases como fuente: reemplazamos con la lista completa
        setCases(allRaw.map(mapCase))
      }

      if (clRes.status === 'fulfilled') setClients(clRes.value.data.data || [])
      if (uRes.status === 'fulfilled')  setUsers(uRes.value.data.data || [])
    }).finally(() => setLoading(false))
  }, [])

  // ── Carga de tareas (reutilizable desde cualquier sección) ────────────────
  const ensureTareasLoaded = useCallback(async (casoId: string) => {
    if (casoTareas[casoId] !== undefined) return
    setCasoTareasLoading(prev => new Set(prev).add(casoId))
    try {
      const res    = await api.get(`/cases/${casoId}/tasks`)
      const tareas = res.data.data || []
      setCasoTareas(prev => ({
        ...prev,
        [casoId]: tareas.map((t: any) => ({ id: t.id, titulo: t.titulo || t.title || t.id })),
      }))
    } catch {
      setCasoTareas(prev => ({ ...prev, [casoId]: [] }))
    } finally {
      setCasoTareasLoading(prev => { const s = new Set(prev); s.delete(casoId); return s })
    }
  }, [casoTareas])

  const toggleCasoExpand = useCallback(async (casoId: string) => {
    setExpandedCasos(prev => {
      const next = new Set(prev)
      next.has(casoId) ? next.delete(casoId) : next.add(casoId)
      return next
    })
    await ensureTareasLoaded(casoId)
  }, [ensureTareasLoaded])

  // ── Maps ───────────────────────────────────────────────────────────────────
  const casesMap = useMemo(() => {
    const m: Record<string, CasoInfo> = {}
    cases.forEach(c => { m[c.id] = c })
    return m
  }, [cases])

  const usersMap = useMemo(() => {
    const m: Record<string, any> = {}
    users.forEach(u => { m[u.id] = u })
    return m
  }, [users])

  const hasFilters   = casoFilter.length > 0 || clientFilter.length > 0 || userFilter.length > 0 || tarifaFilter.length > 0 || monthFilter.length > 0
  const clearFilters = () => {
    setCasoFilter([]); setClientFilter([]); setUserFilter([]); setTarifaFilter([]); setMonthFilter([])
  }

  // ── Único punto de verdad: horas con caso válido ─────────────────────────
  // Todos los useMemo que consumen horas parten de aquí.
  // Si en el futuro se agrega un nuevo cómputo, debe usar baseHours, no allHours.
  const baseHours = useMemo(
    () => allHours.filter(h => !!casesMap[h.casoId]),
    [allHours, casesMap]
  )

  // ── Filtros en cascada ────────────────────────────────────────────────────
  // Para cada filtro se calculan las opciones disponibles usando TODOS los demás
  // filtros activos (excluyendo el propio). Así los filtros se acotan entre sí.

  // Helper interno: aplica todos los filtros excepto uno
  const applyFiltersExcept = useCallback((
    exclude: 'caso' | 'client' | 'user' | 'tarifa' | 'month'
  ) => baseHours.filter(h => {
    const d = new Date(h.fechaRegistro + 'T00:00:00')
    if (d.getFullYear() !== yearFilter) return false
    if (exclude !== 'month'  && monthFilter.length  > 0 && !monthFilter.includes(String(d.getMonth()))) return false
    if (exclude !== 'caso'   && casoFilter.length   > 0 && !casoFilter.includes(h.casoId)) return false
    const caso = casesMap[h.casoId]
    if (exclude !== 'client' && clientFilter.length > 0 && !clientFilter.includes(caso?.clienteId ?? '')) return false
    if (exclude !== 'tarifa' && tarifaFilter.length > 0 && !tarifaFilter.includes(caso?.tipoFacturacion ?? '')) return false
    if (exclude !== 'user'   && userFilter.length   > 0 && !userFilter.includes(h.usuarioId)) return false
    return true
  }), [baseHours, yearFilter, monthFilter, casoFilter, clientFilter, tarifaFilter, userFilter, casesMap])

  const availableCasoIds = useMemo(
    () => new Set(applyFiltersExcept('caso').map(h => h.casoId)),
    [applyFiltersExcept]
  )
  const availableClientIds = useMemo(
    () => new Set(applyFiltersExcept('client').map(h => casesMap[h.casoId]?.clienteId).filter(Boolean) as string[]),
    [applyFiltersExcept, casesMap]
  )
  const availableUserIds = useMemo(
    () => new Set(applyFiltersExcept('user').map(h => h.usuarioId)),
    [applyFiltersExcept]
  )
  const availableTarifas = useMemo(
    () => new Set(applyFiltersExcept('tarifa').map(h => casesMap[h.casoId]?.tipoFacturacion ?? '').filter(Boolean) as string[]),
    [applyFiltersExcept, casesMap]
  )
  const availableMonths = useMemo(
    () => new Set(applyFiltersExcept('month').map(h => String(new Date(h.fechaRegistro + 'T00:00:00').getMonth()))),
    [applyFiltersExcept]
  )

  // Auto-deseleccionar opciones que ya no están disponibles cuando cambian los demás filtros
  useEffect(() => { setCasoFilter  (prev => prev.filter(v => availableCasoIds.has(v)))   }, [availableCasoIds])
  useEffect(() => { setClientFilter(prev => prev.filter(v => availableClientIds.has(v))) }, [availableClientIds])
  useEffect(() => { setUserFilter  (prev => prev.filter(v => availableUserIds.has(v)))   }, [availableUserIds])
  useEffect(() => { setTarifaFilter(prev => prev.filter(v => availableTarifas.has(v)))   }, [availableTarifas])
  useEffect(() => { setMonthFilter (prev => prev.filter(v => availableMonths.has(v)))    }, [availableMonths])

  // ── Filtered hours (table, by-proceso, by-abogado) ────────────────────────
  const filtered = useMemo(() => {
    return baseHours.filter(h => {
      const d = new Date(h.fechaRegistro + 'T00:00:00')
      if (d.getFullYear() !== yearFilter) return false
      if (monthFilter.length > 0 && !monthFilter.includes(String(d.getMonth()))) return false
      if (casoFilter.length > 0 && !casoFilter.includes(h.casoId)) return false
      const caso = casesMap[h.casoId]
      if (clientFilter.length > 0 && !clientFilter.includes(caso?.clienteId ?? '')) return false
      if (tarifaFilter.length > 0 && !tarifaFilter.includes(caso?.tipoFacturacion ?? '')) return false
      if (userFilter.length > 0 && !userFilter.includes(h.usuarioId)) return false
      return true
    })
  }, [baseHours, yearFilter, monthFilter, casoFilter, clientFilter, tarifaFilter, userFilter, casesMap])

  // ── Stats — se derivan de `filtered` (todos los filtros del sidebar) ───────

  // Para flat: el backend ya almacena total_amount proporcional por registro.
  // Sumamos montoTotal directamente igual que para los casos por hora.
  const flatBillingFor = useCallback((hours: HEntry[]) => {
    return hours
      .filter(h => casesMap[h.casoId]?.tipoFacturacion === 'flat')
      .reduce((a, h) => a + getM(h), 0)
  }, [casesMap])

  const statsFiltered = useMemo(() => {
    const flatM    = flatBillingFor(filtered)
    const hourlyM  = filtered
      .filter(h => casesMap[h.casoId]?.tipoFacturacion !== 'flat')
      .reduce((a, h) => a + getM(h), 0)
    return {
      horas:       filtered.reduce((a, h) => a + getH(h), 0),
      monto:       hourlyM + flatM,
      flatMonto:   flatM,
      hourlyMonto: hourlyM,
      registros:   filtered.length,
      // Solo contar casos raíz (los mismos que aparecen en la pestaña Procesos)
      procesos: new Set(
        filtered.map(h => h.casoId).filter(id => rootCaseIds.has(id))
      ).size,
    }
  }, [filtered, casesMap, flatBillingFor])

  // Días laborables (L–V) en el período seleccionado
  const workingDaysInPeriod = useMemo(() => {
    const wd = (y: number, m: number, maxD: number) => {
      let n = 0
      for (let d = 1; d <= maxD; d++) {
        const dow = new Date(y, m, d).getDay()
        if (dow !== 0 && dow !== 6) n++
      }
      return n
    }
    const isCurrYear = yearFilter === now.getFullYear()
    const months = monthFilter.length > 0
      ? monthFilter.map(Number)
      : Array.from({ length: 12 }, (_, i) => i)
    let count = 0
    for (const m of months) {
      if (isCurrYear && m > now.getMonth()) continue
      const days = new Date(yearFilter, m + 1, 0).getDate()
      const max  = isCurrYear && m === now.getMonth() ? now.getDate() : days
      count += wd(yearFilter, m, max)
    }
    return count
  }, [yearFilter, monthFilter])

  const avgHrsPerDay = workingDaysInPeriod > 0 ? statsFiltered.horas / workingDaysInPeriod : 0

  // Etiqueta dinámica del período
  const periodLabel = monthFilter.length === 0
    ? String(yearFilter)
    : monthFilter.length === 1
    ? `${MONTHS_LONG[parseInt(monthFilter[0])]} ${yearFilter}`
    : monthFilter.length <= 3
    ? `${monthFilter.map(m => MONTHS[parseInt(m)]).join(', ')} ${yearFilter}`
    : `${monthFilter.length} meses ${yearFilter}`

  // ── Chart data — monthly OR daily OR por categoría, respects all active filters ─
  const chartData = useMemo((): ChartPoint[] => {
    const base = baseHours.filter(h => {
      if (casoFilter.length > 0 && !casoFilter.includes(h.casoId)) return false
      const caso = casesMap[h.casoId]
      if (clientFilter.length > 0 && !clientFilter.includes(caso?.clienteId ?? '')) return false
      if (tarifaFilter.length > 0 && !tarifaFilter.includes(caso?.tipoFacturacion ?? '')) return false
      if (userFilter.length > 0 && !userFilter.includes(h.usuarioId)) return false
      return true
    })

    // Computa horas y monto para un bucket.
    // El backend almacena total_amount proporcional en cada registro (flat y por hora),
    // así que sumamos montoTotal directamente sin lógica de deduplicación.
    const bucket = (dh: HEntry[]) => {
      const horas = dh.reduce((a, h) => a + getH(h), 0)
      const monto = dh.reduce((a, h) => a + getM(h), 0)
      return { horas, monto }
    }

    // ── Agrupar por categoría ──────────────────────────────────────────────────
    const trunc = (s: string, max = 18) => s.length > max ? s.slice(0, max) + '…' : s

    if (chartGroupBy !== 'mes') {
      const yearBase = base.filter(h => {
        const d = new Date(h.fechaRegistro + 'T00:00:00')
        if (d.getFullYear() !== yearFilter) return false
        if (monthFilter.length > 0 && !monthFilter.includes(String(d.getMonth()))) return false
        return true
      })
      const groups: Record<string, { label: string; fullLabel: string; entries: HEntry[] }> = {}
      yearBase.forEach(h => {
        const caso = casesMap[h.casoId]
        let key = '', fullLabel = ''
        if (chartGroupBy === 'tarifa') {
          const t = caso?.tipoFacturacion || ''
          key       = t || 'sin_tarifa'
          fullLabel = t === 'por_horas' ? 'Por horas' : t === 'flat' ? 'Flat' : 'Sin tarifa'
        } else if (chartGroupBy === 'abogado') {
          key = h.usuarioId || '__sin__'
          const u = usersMap[h.usuarioId]
          fullLabel = u ? (u.nombre || `${u.first_name || ''} ${u.last_name || ''}`.trim() || h.usuarioId.slice(0, 8)) : h.usuarioId.slice(0, 8)
        } else if (chartGroupBy === 'cliente') {
          key       = caso?.clienteId || '__sin__'
          fullLabel = caso?.clienteNombre || 'Sin cliente'
        } else if (chartGroupBy === 'proceso') {
          key       = h.casoId
          fullLabel = caso?.titulo || h.casoId
        }
        if (!key) return
        if (!groups[key]) groups[key] = { label: trunc(fullLabel), fullLabel, entries: [] }
        groups[key].entries.push(h)
      })
      return Object.entries(groups)
        .map(([, g]) => ({ label: g.label, fullLabel: g.fullLabel, ...bucket(g.entries) }))
        .sort((a, b) => b.horas - a.horas)
        .slice(0, 10)
    }

    // ── Vista temporal (mes / día) ─────────────────────────────────────────────

    // Vista diaria: solo cuando se selecciona exactamente 1 mes
    if (monthFilter.length === 1) {
      const month       = parseInt(monthFilter[0])
      const daysInMonth = new Date(yearFilter, month + 1, 0).getDate()
      return Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1
        const dh  = base.filter(h => {
          const d = new Date(h.fechaRegistro + 'T00:00:00')
          return d.getFullYear() === yearFilter && d.getMonth() === month && d.getDate() === day
        })
        return { label: String(day), ...bucket(dh) }
      })
    }

    // Vista mensual: mostrar solo los meses seleccionados (o todos si no hay selección)
    const monthsToShow = monthFilter.length > 0
      ? monthFilter.map(Number).sort((a, b) => a - b)
      : Array.from({ length: 12 }, (_, i) => i)

    return monthsToShow.map(i => {
      const mh = base.filter(h => {
        const d = new Date(h.fechaRegistro + 'T00:00:00')
        return d.getMonth() === i && d.getFullYear() === yearFilter
      })
      return { label: MONTHS[i], ...bucket(mh) }
    })
  }, [baseHours, yearFilter, monthFilter, casoFilter, clientFilter, tarifaFilter, userFilter, casesMap, chartGroupBy, usersMap])

  // ── Chart series (segunda agrupación) ────────────────────────────────────
  // Cuando chartGroupBy2 !== 'none', devuelve SeriesData[] para el gráfico multi-series.
  // Cada serie corresponde a un valor del segundo eje; los puntos comparten el mismo
  // eje X que chartData. seenFlat es global (un caso flat se cuenta UNA sola vez).
  const chartSeries = React.useMemo((): SeriesData[] | null => {
    if (chartGroupBy2 === 'none') return null

    const base = baseHours.filter(h => {
      if (casoFilter.length > 0 && !casoFilter.includes(h.casoId)) return false
      const caso = casesMap[h.casoId]
      if (clientFilter.length > 0 && !clientFilter.includes(caso?.clienteId ?? '')) return false
      if (tarifaFilter.length > 0 && !tarifaFilter.includes(caso?.tipoFacturacion ?? '')) return false
      if (userFilter.length > 0 && !userFilter.includes(h.usuarioId)) return false
      return true
    })

    // Helper: obtiene la clave y etiqueta del eje X (primera agrupación)
    const getX = (h: HEntry, d: Date): string | null => {
      if (chartGroupBy === 'mes') {
        if (monthFilter.length === 1) return `day:${d.getDate()}`
        const mi = d.getMonth()
        const monthsToShow = monthFilter.length > 0 ? monthFilter.map(Number) : Array.from({ length: 12 }, (_, i) => i)
        return monthsToShow.includes(mi) ? `m:${mi}` : null
      }
      if (chartGroupBy === 'tarifa') return `t:${casesMap[h.casoId]?.tipoFacturacion || 'sin_tarifa'}`
      if (chartGroupBy === 'abogado') return `u:${h.usuarioId}`
      if (chartGroupBy === 'cliente') return `c:${casesMap[h.casoId]?.clienteId || '__sin__'}`
      if (chartGroupBy === 'proceso') return `p:${h.casoId}`
      return null
    }

    // Helper: obtiene la clave y etiqueta de la serie (segunda agrupación)
    const getSeries = (h: HEntry): { key: string; label: string } | null => {
      const caso = casesMap[h.casoId]
      if (chartGroupBy2 === 'tarifa') {
        const t = caso?.tipoFacturacion || ''
        return { key: t || 'sin_tarifa', label: t === 'por_horas' ? 'Por horas' : t === 'flat' ? 'Flat' : 'Sin tarifa' }
      }
      if (chartGroupBy2 === 'abogado') {
        const u = usersMap[h.usuarioId]
        const label = u ? (u.nombre || `${u.first_name || ''} ${u.last_name || ''}`.trim() || h.usuarioId.slice(0, 8)) : h.usuarioId.slice(0, 8)
        return { key: h.usuarioId, label }
      }
      if (chartGroupBy2 === 'cliente') {
        return { key: caso?.clienteId || '__sin__', label: caso?.clienteNombre || 'Sin cliente' }
      }
      if (chartGroupBy2 === 'proceso') {
        return { key: h.casoId, label: caso?.titulo || h.casoId.slice(0, 14) + '…' }
      }
      if (chartGroupBy2 === 'mes') {
        const d = new Date(h.fechaRegistro + 'T00:00:00')
        return { key: `m:${d.getMonth()}`, label: MONTHS[d.getMonth()] }
      }
      return null
    }

    // Construye grupos[seriesKey][xKey] = entries[]
    const groups: Record<string, { label: string; byX: Record<string, HEntry[]> }> = {}
    const seriesOrder: string[] = []
    const xOrder: string[] = []
    const xLabels: Record<string, string> = {}

    // Construir xOrder desde chartData (mismas posiciones que el gráfico simple)
    if (chartGroupBy === 'mes') {
      const yearBase = base.filter(h => new Date(h.fechaRegistro + 'T00:00:00').getFullYear() === yearFilter)
      if (monthFilter.length === 1) {
        const m = parseInt(monthFilter[0])
        const days = new Date(yearFilter, m + 1, 0).getDate()
        for (let d = 1; d <= days; d++) { const k = `day:${d}`; xOrder.push(k); xLabels[k] = String(d) }
      } else {
        const ms = monthFilter.length > 0 ? monthFilter.map(Number).sort((a,b)=>a-b) : Array.from({length:12},(_,i)=>i)
        ms.forEach(mi => { const k = `m:${mi}`; xOrder.push(k); xLabels[k] = MONTHS[mi] })
      }
    } else {
      // Para agrupaciones no-temporales, construir xOrder desde los datos
    }

    base.forEach(h => {
      const d = new Date(h.fechaRegistro + 'T00:00:00')
      if (d.getFullYear() !== yearFilter) return
      if (monthFilter.length > 0 && !monthFilter.includes(String(d.getMonth()))) {
        if (monthFilter.length !== 1) return
      }

      const xKey = getX(h, d)
      if (!xKey) return
      const sg = getSeries(h)
      if (!sg) return

      if (!xLabels[xKey]) {
        // Non-temporal x labels
        const caso = casesMap[h.casoId]
        if (chartGroupBy === 'tarifa') { const t = caso?.tipoFacturacion||''; xLabels[xKey] = t==='por_horas'?'Por horas':t==='flat'?'Flat':'Sin tarifa' }
        else if (chartGroupBy === 'abogado') { const u=usersMap[h.usuarioId]; xLabels[xKey]=u?(u.nombre||`${u.first_name||''} ${u.last_name||''}`.trim()||h.usuarioId.slice(0,8)):h.usuarioId.slice(0,8) }
        else if (chartGroupBy === 'cliente') { xLabels[xKey] = caso?.clienteNombre || 'Sin cliente' }
        else if (chartGroupBy === 'proceso') { xLabels[xKey] = caso?.titulo || h.casoId.slice(0,14)+'…' }
        if (!xOrder.includes(xKey)) xOrder.push(xKey)
      } else if (chartGroupBy !== 'mes' && !xOrder.includes(xKey)) {
        xOrder.push(xKey)
      }

      if (!groups[sg.key]) { groups[sg.key] = { label: sg.label, byX: {} }; seriesOrder.push(sg.key) }
      if (!groups[sg.key].byX[xKey]) groups[sg.key].byX[xKey] = []
      groups[sg.key].byX[xKey].push(h)
    })

    if (seriesOrder.length === 0) return null

    // Calcular montos — el backend almacena total_amount proporcional en cada registro.
    const calcBucket = (entries: HEntry[]) => {
      const horas = entries.reduce((a, h) => a + getH(h), 0)
      const monto = entries.reduce((a, h) => a + getM(h), 0)
      return { horas, monto }
    }

    // Limitar a top 8 series por total de horas
    const seriesSorted = seriesOrder
      .map(key => ({
        key,
        total: xOrder.reduce((a, xk) => a + (groups[key].byX[xk] || []).reduce((s, h) => s + getH(h), 0), 0),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
      .map(({ key }) => key)

    return seriesSorted.map((key, idx) => ({
      key,
      label: groups[key].label,
      color: PALETTE[idx % PALETTE.length],
      points: xOrder.map(xk => ({
        label: xLabels[xk] || xk,
        ...calcBucket(groups[key].byX[xk] || []),
      })),
    }))
  }, [baseHours, yearFilter, monthFilter, casoFilter, clientFilter, tarifaFilter, userFilter,
      casesMap, usersMap, chartGroupBy, chartGroupBy2])

  // ── Group by caso (with per-task breakdown) ───────────────────────────────
  const byCaso = useMemo((): CasoGroup[] => {
    const groups: Record<string, CasoGroup> = {}
    filtered.forEach(h => {
      // Excluir horas cuyo proceso no existe en el sistema (eliminados o inaccesibles)
      if (!casesMap[h.casoId]) return
      if (!groups[h.casoId]) {
        groups[h.casoId] = { casoId: h.casoId, horas: 0, monto: 0, registros: 0, byTarea: {} }
      }
      groups[h.casoId].horas     += getH(h)
      groups[h.casoId].monto     += getM(h)
      groups[h.casoId].registros += 1
      const key = h.tareaId || '__sin_tarea__'
      if (!groups[h.casoId].byTarea[key]) {
        groups[h.casoId].byTarea[key] = { tareaId: key, horas: 0, monto: 0, registros: 0, entries: [] }
      }
      groups[h.casoId].byTarea[key].horas     += getH(h)
      groups[h.casoId].byTarea[key].monto     += getM(h)
      groups[h.casoId].byTarea[key].registros += 1
      groups[h.casoId].byTarea[key].entries.push(h)
    })
    // Solo mostrar casos raíz (los que aparecen en la pestaña Procesos)
    return Object.values(groups)
      .filter(g => rootCaseIds.has(g.casoId))
      .sort((a, b) => b.horas - a.horas)
  }, [filtered, casesMap, rootCaseIds])

  // ── Group by abogado (with nested caso → tarea → entries) ──────────────────
  const byAbogado = useMemo((): AbogadoGroup[] => {
    const groups: Record<string, AbogadoGroup> = {}
    filtered.forEach(h => {
      if (!h.usuarioId || !casesMap[h.casoId]) return
      if (!groups[h.usuarioId]) {
        groups[h.usuarioId] = { userId: h.usuarioId, horas: 0, monto: 0, registros: 0, byCaso: {} }
      }
      const ug = groups[h.usuarioId]
      ug.horas += getH(h); ug.monto += getM(h); ug.registros += 1

      if (!ug.byCaso[h.casoId]) {
        ug.byCaso[h.casoId] = { casoId: h.casoId, horas: 0, monto: 0, byTarea: {} }
      }
      const cg = ug.byCaso[h.casoId]
      cg.horas += getH(h); cg.monto += getM(h)

      const tk = h.tareaId || '__sin_tarea__'
      if (!cg.byTarea[tk]) {
        cg.byTarea[tk] = { tareaId: tk, horas: 0, monto: 0, entries: [] }
      }
      cg.byTarea[tk].horas += getH(h)
      cg.byTarea[tk].monto += getM(h)
      cg.byTarea[tk].entries.push(h)
    })
    return Object.values(groups).sort((a, b) => b.horas - a.horas)
  }, [filtered, casesMap])

  // ── Misc ───────────────────────────────────────────────────────────────────
  const years              = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)
  // Totales desde byCaso para que el header de la sección cuadre con las filas
  const totalFilteredHoras = useMemo(() => byCaso.reduce((a, g) => a + g.horas, 0), [byCaso])
  const totalFilteredMonto = useMemo(() => byCaso.reduce((a, g) => a + g.monto, 0), [byCaso])

  const chartTitle = chartGroupBy !== 'mes'
    ? `Por ${chartGroupBy === 'tarifa' ? 'Tarifa' : chartGroupBy === 'abogado' ? 'Abogado' : chartGroupBy === 'cliente' ? 'Cliente' : 'Proceso'} — ${periodLabel}`
    : monthFilter.length === 1
    ? `Evolución diaria — ${MONTHS_LONG[parseInt(monthFilter[0])]} ${yearFilter}`
    : `Evolución mensual — ${periodLabel}`

  const getTareaTitulo = (casoId: string, tareaId: string): string => {
    if (tareaId === '__sin_tarea__') return 'Sin tarea asignada'
    const found = (casoTareas[casoId] || []).find(t => t.id === tareaId)
    return found?.titulo || `Tarea ${tareaId.slice(0, 8)}…`
  }

  const getUserName = (userId: string): string => {
    const u = usersMap[userId]
    if (!u) return userId.slice(0, 8) + '…'
    return u.nombre || `${u.first_name || ''} ${u.last_name || ''}`.trim() || userId.slice(0, 8)
  }

  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) =>
    setter(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next })

  const formatDate = (s: string) => {
    const d = new Date(s + (s.includes('T') ? '' : 'T12:00:00'))
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-1">Facturación</h1>
            <p className="text-slate-500 text-sm">Horas trabajadas y facturación por proceso</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {([
            {
              label: `Horas ${periodLabel}`,
              value: formatDuration(statsFiltered.horas),
              sub: `${Math.round(statsFiltered.horas * 60)} min trabajados`,
              icon: Clock, color: 'blue',
            },
            {
              label: `Facturación ${periodLabel}`,
              value: `$ ${formatMonto(statsFiltered.monto)}`,
              sub: statsFiltered.flatMonto > 0
                ? `$ ${formatMonto(statsFiltered.hourlyMonto)} hrs + $ ${formatMonto(statsFiltered.flatMonto)} flat`
                : 'facturación del período',
              icon: DollarSign, color: 'green',
            },
            {
              label: 'Procesos',
              value: String(statsFiltered.procesos),
              sub: 'en el periodo',
              icon: TrendingUp, color: 'purple',
            },
            {
              label: 'Prom. / día laboral',
              value: formatDuration(avgHrsPerDay),
              sub: `${workingDaysInPeriod} días hábiles`,
              icon: Zap, color: 'amber',
            },
          ] as const).map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
              <div className={`p-2.5 rounded-lg flex-shrink-0 ${
                color === 'blue'   ? 'bg-blue-50'   :
                color === 'green'  ? 'bg-green-50'  :
                color === 'purple' ? 'bg-purple-50' :
                color === 'amber'  ? 'bg-amber-50'  : 'bg-rose-50'
              }`}>
                <Icon size={18} className={
                  color === 'blue'   ? 'text-blue-600'   :
                  color === 'green'  ? 'text-green-600'  :
                  color === 'purple' ? 'text-purple-600' :
                  color === 'amber'  ? 'text-amber-600'  : 'text-rose-600'
                } />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 font-medium truncate">{label}</p>
                <p className="text-xl font-bold text-slate-900 leading-tight">{value}</p>
                <p className="text-xs text-slate-400">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Chart + Filters — Option A: left sidebar */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

          {/* Body: sidebar + chart */}
          <div className="flex min-h-0">
            {/* Filters sidebar */}
            <div className="w-44 flex-shrink-0 border-r border-slate-100 p-4 flex flex-col gap-3 bg-slate-50/40">
              {/* Año — single select (dimensión primaria) */}
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Año</p>
                <select
                  value={String(yearFilter)}
                  onChange={e => setYearFilter(parseInt(e.target.value))}
                  className="w-full text-xs border border-slate-200 rounded-md bg-white text-slate-700 px-2 py-1.5 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-slate-300 transition-colors"
                  style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.4rem center', backgroundSize: '0.9rem 0.9rem', paddingRight: '1.6rem' }}
                >
                  {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
                </select>
              </div>

              {/* Filtros multi-select */}
              <MultiSelect
                label="Mes"
                opts={MONTHS_LONG.map((m, i) => ({ v: String(i), l: m })).filter(o => availableMonths.has(o.v))}
                selected={monthFilter}
                onChange={setMonthFilter}
              />
              <MultiSelect
                label="Proceso"
                opts={cases.filter(c => availableCasoIds.has(c.id)).map(c => ({ v: c.id, l: c.titulo }))}
                selected={casoFilter}
                onChange={setCasoFilter}
              />
              <MultiSelect
                label="Cliente"
                opts={clients.filter(c => availableClientIds.has(c.id)).map(c => ({ v: c.id, l: c.nombre || c.name || c.id }))}
                selected={clientFilter}
                onChange={setClientFilter}
              />
              <MultiSelect
                label="Abogado"
                opts={users.filter(u => availableUserIds.has(u.id)).map(u => ({ v: u.id, l: getUserName(u.id) }))}
                selected={userFilter}
                onChange={setUserFilter}
              />
              <MultiSelect
                label="Tarifa"
                opts={([{ v: 'por_horas', l: 'Por horas' }, { v: 'flat', l: 'Flat' }]).filter(o => availableTarifas.has(o.v))}
                selected={tarifaFilter}
                onChange={setTarifaFilter}
              />

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors mt-1"
                >
                  <RotateCcw size={11} />
                  Limpiar filtros
                </button>
              )}
            </div>

            {/* Chart area */}
            <div className="flex-1 p-4 min-w-0 flex flex-col gap-3">
              {/* Controls row */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                {/* Agrupar por */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">Agrupar por</span>
                  <div className="flex rounded-md border border-slate-200 overflow-hidden text-xs">
                    {([
                      { v: 'mes',     l: 'Mes'     },
                      { v: 'tarifa',  l: 'Tarifa'  },
                      { v: 'abogado', l: 'Abogado' },
                      { v: 'cliente', l: 'Cliente' },
                      { v: 'proceso', l: 'Proceso' },
                    ] as const).map(({ v, l }, i) => (
                      <button
                        key={v}
                        onClick={() => setChartGroupBy(v)}
                        className={`px-2 py-1 transition-colors ${i > 0 ? 'border-l border-slate-200' : ''} ${
                          chartGroupBy === v ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Métrica + modo */}
                <div className="flex items-center gap-1.5">
                  <div className="flex rounded-md border border-slate-200 overflow-hidden text-xs">
                    <button
                      onClick={() => setChartMetric('horas')}
                      className={`px-2.5 py-1 transition-colors ${chartMetric === 'horas' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                    >
                      Horas
                    </button>
                    <button
                      onClick={() => setChartMetric('monto')}
                      className={`px-2.5 py-1 border-l border-slate-200 transition-colors ${chartMetric === 'monto' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                    >
                      $
                    </button>
                  </div>
                  {chartView === 'chart' && (
                    <button
                      onClick={() => setChartMode(m => m === 'bar' ? 'line' : 'bar')}
                      className={`flex items-center text-xs px-2 py-1 rounded-md border transition-colors ${
                        chartMode === 'line'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                      }`}
                    >
                      {chartMode === 'bar' ? <Activity size={12} /> : <BarChart2 size={12} />}
                    </button>
                  )}
                  <div className="flex rounded-md border border-slate-200 overflow-hidden text-xs">
                    <button
                      onClick={() => setChartView('chart')}
                      title="Vista gráfico"
                      className={`flex items-center px-2 py-1 transition-colors ${chartView === 'chart' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                    >
                      <BarChart2 size={12} />
                    </button>
                    <button
                      onClick={() => setChartView('table')}
                      title="Vista tabla"
                      className={`flex items-center px-2 py-1 border-l border-slate-200 transition-colors ${chartView === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                    >
                      <Table2 size={12} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Segunda agrupación */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">Desglosar por</span>
                <div className="flex rounded-md border border-slate-200 overflow-hidden text-xs">
                  {([
                    { v: 'none',    l: 'Ninguno'  },
                    { v: 'tarifa',  l: 'Tarifa'   },
                    { v: 'abogado', l: 'Abogado'  },
                    { v: 'cliente', l: 'Cliente'  },
                    { v: 'proceso', l: 'Proceso'  },
                    { v: 'mes',     l: 'Mes'      },
                  ] as const).map(({ v, l }, i) => (
                    <button
                      key={v}
                      onClick={() => setChartGroupBy2(v)}
                      className={`px-2 py-1 transition-colors ${i > 0 ? 'border-l border-slate-200' : ''} ${
                        chartGroupBy2 === v ? 'bg-violet-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-12"><LoadingSpinner /></div>
              ) : chartView === 'table' ? (
                <PivotTable
                  data={chartData}
                  series={chartSeries ?? undefined}
                  metric={chartMetric}
                />
              ) : (
                <HoursChart
                  data={chartData}
                  mode={chartMode}
                  metric={chartMetric}
                  series={chartSeries ?? undefined}
                  rotateLabels={true}
                />
              )}
            </div>
          </div>
        </div>

        {/* Horas por proceso */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Horas por proceso</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {byCaso.length} proceso{byCaso.length !== 1 ? 's' : ''} ·{' '}
                {formatDuration(totalFilteredHoras)} · $ {formatMonto(totalFilteredMonto)}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : byCaso.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Clock size={28} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm text-slate-500">Sin registros para los filtros seleccionados</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {byCaso.map(({ casoId, horas, monto, registros, byTarea }) => {
                const caso       = casesMap[casoId]
                const simbolo    = caso?.monedaFacturacion === 'USD' ? '$' : '$'
                const pct        = totalFilteredHoras > 0 ? Math.round((horas / totalFilteredHoras) * 100) : 0
                const isExpanded = expandedCasos.has(casoId)
                const isTLoading = casoTareasLoading.has(casoId)
                const tareaKeys  = Object.keys(byTarea).sort((a, b) => byTarea[b].horas - byTarea[a].horas)

                return (
                  <div key={casoId}>
                    {/* Proceso row */}
                    <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors group">
                      {/* Expand toggle */}
                      <button
                        onClick={() => toggleCasoExpand(casoId)}
                        className="flex-shrink-0 p-0.5 text-slate-300 hover:text-blue-500 transition-colors"
                        title={isExpanded ? 'Colapsar tareas' : 'Ver tareas'}
                      >
                        {isTLoading
                          ? <Loader size={15} className="animate-spin text-blue-400" />
                          : <ChevronDown size={15}
                              className={`transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
                        }
                      </button>

                      {/* Progress accent */}
                      <div className="w-1 h-10 rounded-full bg-slate-100 flex-shrink-0 overflow-hidden">
                        <div className="w-full bg-blue-400 rounded-full transition-all" style={{ height: `${pct}%` }} />
                      </div>

                      {/* Case info — click to case hours */}
                      <button
                        onClick={() => navigate(`/cases/${casoId}?tab=horas`)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <p className="font-semibold text-slate-800 text-sm truncate group-hover:text-blue-700 transition-colors">
                          {caso?.titulo || casoId.slice(0, 16) + '…'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {caso?.clienteNombre && (
                            <span className="text-xs text-slate-400">{caso.clienteNombre}</span>
                          )}
                          {caso?.tipoFacturacion && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                              caso.tipoFacturacion === 'por_horas'
                                ? 'bg-blue-50 text-blue-600'
                                : 'bg-purple-50 text-purple-600'
                            }`}>
                              {caso.tipoFacturacion === 'por_horas' ? 'Por horas' : 'Flat'}
                            </span>
                          )}
                          <span className="text-xs text-slate-400">
                            {registros} registro{registros !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </button>

                      {/* Stats */}
                      <div className="flex items-center gap-3 flex-shrink-0 text-right">
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{formatDuration(horas)}</p>
                          <p className="text-xs text-slate-400">{pct}% del total</p>
                        </div>
                        {caso?.tipoFacturacion === 'flat' ? (
                          // Flat: mostrar el monto contratado del caso
                          caso.precioFacturacion ? (
                            <div>
                              <p className="text-sm font-semibold text-purple-700">
                                {simbolo} {formatMonto(caso.precioFacturacion)}
                              </p>
                              <p className="text-xs text-slate-400">contrato flat</p>
                            </div>
                          ) : null
                        ) : (
                          // Por horas: monto acumulado de los registros
                          monto > 0 && (
                            <div>
                              <p className="text-sm font-semibold text-green-700">
                                {simbolo} {formatMonto(monto)}
                              </p>
                              <p className="text-xs text-slate-400">facturado</p>
                            </div>
                          )
                        )}
                        <button
                          onClick={() => navigate(`/cases/${casoId}?tab=horas`)}
                          className="text-slate-300 group-hover:text-blue-500 transition-colors"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Expanded task breakdown */}
                    {isExpanded && (
                      <div className="bg-slate-50/50 border-t border-slate-100">
                        {isTLoading ? (
                          <div className="flex items-center gap-2 px-14 py-3 text-xs text-slate-400">
                            <Loader size={12} className="animate-spin" />
                            Cargando tareas…
                          </div>
                        ) : tareaKeys.length === 0 ? (
                          <p className="px-14 py-3 text-xs text-slate-400 italic">Sin tareas registradas</p>
                        ) : (
                          tareaKeys.map(key => {
                            const tg          = byTarea[key]
                            const titulo      = getTareaTitulo(casoId, key)
                            const tPct        = horas > 0 ? Math.round((tg.horas / horas) * 100) : 0
                            const tareaExpKey = `${casoId}::${key}`
                            const isTExpanded = expandedTareas.has(tareaExpKey)

                            return (
                              <div key={key} className="border-b border-slate-100 last:border-0">
                                {/* Tarea header row */}
                                <div className="flex items-center gap-3 px-14 py-2.5 hover:bg-blue-50/40 transition-colors group/task">
                                  <button
                                    onClick={() => toggle(setExpandedTareas, tareaExpKey)}
                                    className="flex-shrink-0 text-slate-300 hover:text-blue-500 transition-colors"
                                  >
                                    <ChevronDown size={13} className={`transition-transform duration-200 ${isTExpanded ? '' : '-rotate-90'}`} />
                                  </button>
                                  <div className="w-0.5 h-6 rounded-full bg-blue-200 flex-shrink-0" />
                                  <button
                                    onClick={() => navigate(`/cases/${casoId}?tab=horas`)}
                                    className="flex-1 min-w-0 text-left"
                                  >
                                    <p className="text-xs font-medium text-slate-600 truncate group-hover/task:text-blue-600 transition-colors">
                                      {titulo}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                      {tg.registros} registro{tg.registros !== 1 ? 's' : ''} · {tPct}% del proceso
                                    </p>
                                  </button>
                                  <div className="flex items-center gap-4 flex-shrink-0 text-right">
                                    <p className="text-xs font-semibold text-slate-600">{formatDuration(tg.horas)}</p>
                                    {tg.monto > 0 && (
                                      <p className="text-xs font-semibold text-green-600">
                                        {simbolo} {formatMonto(tg.monto)}
                                      </p>
                                    )}
                                    <button
                                      onClick={() => navigate(`/cases/${casoId}?tab=horas`)}
                                      className="text-slate-300 hover:text-blue-400 transition-colors"
                                    >
                                      <ChevronRight size={12} />
                                    </button>
                                  </div>
                                </div>

                                {/* Individual entries */}
                                {isTExpanded && (
                                  <div className="bg-white border-t border-slate-100">
                                    {tg.entries.map((entry, ei) => (
                                      <div key={entry.id} className={`flex items-start gap-3 px-20 py-2 border-b border-slate-50 last:border-0 ${ei % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                                        <span className="text-[10px] text-slate-400 font-medium mt-0.5 flex-shrink-0 w-12">{formatDate(entry.fechaRegistro)}</span>
                                        <p className="flex-1 text-xs text-slate-600 leading-relaxed min-w-0">
                                          {entry.usuario?.nombre && (
                                            <span className="font-medium text-slate-700">{entry.usuario.nombre} · </span>
                                          )}
                                          {(entry as any).descripcion || (entry as any).description || '—'}
                                        </p>
                                        <div className="flex items-center gap-3 flex-shrink-0 text-right">
                                          <span className="text-xs font-medium text-slate-500">{formatDuration(getH(entry))}</span>
                                          {getM(entry) > 0 && (
                                            <span className="text-xs font-semibold text-green-600">{simbolo} {formatMonto(getM(entry))}</span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Horas por abogado */}
        {byAbogado.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Users size={15} className="text-slate-400" />
                Horas por abogado
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {byAbogado.length} profesional{byAbogado.length !== 1 ? 'es' : ''}
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {byAbogado.map(({ userId, horas, monto, registros, byCaso: abgCasos }, idx) => {
                const nombre = getUserName(userId)
                const pct    = totalFilteredHoras > 0 ? Math.round((horas / totalFilteredHoras) * 100) : 0
                const isAbgExpanded = expandedAbogados.has(userId)
                const avatarColors = [
                  'from-blue-500 to-blue-700', 'from-purple-500 to-purple-700',
                  'from-teal-500 to-teal-700',  'from-rose-500 to-rose-700',
                  'from-amber-500 to-amber-700',
                ]
                const casoKeys = Object.keys(abgCasos).sort((a, b) => abgCasos[b].horas - abgCasos[a].horas)

                return (
                  <div key={userId} className="border-b border-slate-100 last:border-0">
                    {/* Abogado row */}
                    <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/40 transition-colors">
                      <button
                        onClick={() => toggle(setExpandedAbogados, userId)}
                        className="flex-shrink-0 text-slate-300 hover:text-blue-500 transition-colors"
                      >
                        <ChevronDown size={15} className={`transition-transform duration-200 ${isAbgExpanded ? '' : '-rotate-90'}`} />
                      </button>
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColors[idx % avatarColors.length]} flex items-center justify-center flex-shrink-0`}>
                        <span className="text-white text-xs font-bold">{nombre.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{nombre}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-36">
                            <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-slate-400">{pct}%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-5 flex-shrink-0 text-right">
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{formatDuration(horas)}</p>
                          <p className="text-xs text-slate-400">{registros} registro{registros !== 1 ? 's' : ''}</p>
                        </div>
                        {monto > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-green-700">$ {formatMonto(monto)}</p>
                            <p className="text-xs text-slate-400">facturado</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expanded: procesos */}
                    {isAbgExpanded && (
                      <div className="bg-slate-50/40 border-t border-slate-100">
                        {casoKeys.map(cId => {
                          const cg          = abgCasos[cId]
                          const casoInfo    = casesMap[cId]
                          const abgCasoKey  = `${userId}::${cId}`
                          const isCExpanded = expandedAbgCasos.has(abgCasoKey)
                          const cSimbolo    = casoInfo?.monedaFacturacion === 'USD' ? '$' : '$'
                          const tKeys       = Object.keys(cg.byTarea).sort((a, b) => cg.byTarea[b].horas - cg.byTarea[a].horas)

                          return (
                            <div key={cId} className="border-b border-slate-100 last:border-0">
                              {/* Proceso sub-row */}
                              <div className="flex items-center gap-3 px-10 py-2.5 hover:bg-blue-50/30 transition-colors group/abgcaso">
                                <button
                                  onClick={() => { toggle(setExpandedAbgCasos, abgCasoKey); ensureTareasLoaded(cId) }}
                                  className="flex-shrink-0 text-slate-300 hover:text-blue-500 transition-colors"
                                >
                                  <ChevronDown size={13} className={`transition-transform duration-200 ${isCExpanded ? '' : '-rotate-90'}`} />
                                </button>
                                <div className="w-0.5 h-6 rounded-full bg-blue-300 flex-shrink-0" />
                                <button
                                  onClick={() => navigate(`/cases/${cId}?tab=horas`)}
                                  className="flex-1 min-w-0 text-left"
                                >
                                  <p className="text-xs font-semibold text-slate-700 truncate group-hover/abgcaso:text-blue-700 transition-colors">
                                    {casoInfo?.titulo || cId.slice(0, 16) + '…'}
                                  </p>
                                  <p className="text-xs text-slate-400">{tKeys.length} tarea{tKeys.length !== 1 ? 's' : ''}</p>
                                </button>
                                <div className="flex items-center gap-4 flex-shrink-0 text-right">
                                  <p className="text-xs font-semibold text-slate-600">{formatDuration(cg.horas)}</p>
                                  {cg.monto > 0 && (
                                    <p className="text-xs font-semibold text-green-600">{cSimbolo} {formatMonto(cg.monto)}</p>
                                  )}
                                  <button onClick={() => navigate(`/cases/${cId}?tab=horas`)} className="text-slate-300 hover:text-blue-400 transition-colors">
                                    <ChevronRight size={12} />
                                  </button>
                                </div>
                              </div>

                              {/* Expanded: tareas dentro del proceso */}
                              {isCExpanded && (
                                <div className="bg-white border-t border-slate-100">
                                  {tKeys.map(tk => {
                                    const tg          = cg.byTarea[tk]
                                    const tTitulo     = getTareaTitulo(cId, tk)
                                    const abgTareaKey = `${userId}::${cId}::${tk}`
                                    const isTExpanded2 = expandedAbgTareas.has(abgTareaKey)

                                    return (
                                      <div key={tk} className="border-b border-slate-50 last:border-0">
                                        {/* Tarea sub-row */}
                                        <div className="flex items-center gap-3 px-16 py-2 hover:bg-blue-50/20 transition-colors group/abgtarea">
                                          <button
                                            onClick={() => toggle(setExpandedAbgTareas, abgTareaKey)}
                                            className="flex-shrink-0 text-slate-300 hover:text-blue-500 transition-colors"
                                          >
                                            <ChevronDown size={12} className={`transition-transform duration-200 ${isTExpanded2 ? '' : '-rotate-90'}`} />
                                          </button>
                                          <div className="w-0.5 h-5 rounded-full bg-purple-200 flex-shrink-0" />
                                          <p className="flex-1 text-xs font-medium text-slate-600 truncate group-hover/abgtarea:text-blue-600 transition-colors min-w-0">
                                            {tTitulo}
                                          </p>
                                          <div className="flex items-center gap-3 flex-shrink-0 text-right">
                                            <span className="text-xs text-slate-400">{tg.entries.length} reg.</span>
                                            <span className="text-xs font-semibold text-slate-600">{formatDuration(tg.horas)}</span>
                                            {tg.monto > 0 && (
                                              <span className="text-xs font-semibold text-green-600">{cSimbolo} {formatMonto(tg.monto)}</span>
                                            )}
                                          </div>
                                        </div>

                                        {/* Individual entries */}
                                        {isTExpanded2 && (
                                          <div className="bg-slate-50/60">
                                            {tg.entries.map((entry, ei) => (
                                              <div key={entry.id} className={`flex items-start gap-2 px-20 py-1.5 border-b border-slate-100 last:border-0 ${ei % 2 === 0 ? '' : 'bg-white/60'}`}>
                                                <span className="text-[10px] text-slate-400 font-medium mt-0.5 flex-shrink-0 w-12">{formatDate(entry.fechaRegistro)}</span>
                                                <p className="flex-1 text-xs text-slate-500 leading-relaxed min-w-0 truncate">
                                                  {(entry as any).descripcion || (entry as any).description || '—'}
                                                </p>
                                                <div className="flex items-center gap-2 flex-shrink-0 text-right">
                                                  <span className="text-xs font-medium text-slate-500">{formatDuration(getH(entry))}</span>
                                                  {getM(entry) > 0 && (
                                                    <span className="text-xs font-semibold text-green-600">{cSimbolo} {formatMonto(getM(entry))}</span>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })
                                }
                                </div>
                              )}
                            </div>
                          )
                        })
                      }
                      </div>
                    )}
                  </div>
                )
              })
            }
            </div>
          </div>
        )}
      </div>

      {/* Modal: registrar horas (general o pre-llenado con caso) */}
      {(showModal || quickRegisterCaso !== null) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Registrar horas</h2>
                {quickRegisterCaso && casesMap[quickRegisterCaso] && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Proceso: <span className="font-medium text-slate-700">
                      {casesMap[quickRegisterCaso]?.titulo}
                    </span>
                  </p>
                )}
              </div>
              <button
                onClick={() => { setShowModal(false); setQuickRegisterCaso(null) }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <HoursForm
                onSuccess={() => {
                  setShowModal(false)
                  setQuickRegisterCaso(null)
                  api.get('/hours/firm-hours?limit=1000').then(r => setAllHours(r.data.data || []))
                }}
                onCancel={() => { setShowModal(false); setQuickRegisterCaso(null) }}
                caseId={quickRegisterCaso || undefined}
                tipoFacturacion={(quickRegisterCaso ? casesMap[quickRegisterCaso]?.tipoFacturacion as any : null) ?? null}
                defaultRate={quickRegisterCaso ? (casesMap[quickRegisterCaso]?.precioFacturacion ?? 0) : 0}
                defaultMoneda={(quickRegisterCaso ? casesMap[quickRegisterCaso]?.monedaFacturacion as any : 'PEN') ?? 'PEN'}
              />
            </div>
          </div>
        </div>
      )}

    </AppLayout>
  )
}
