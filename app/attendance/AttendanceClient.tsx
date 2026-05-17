'use client'

import { useState } from 'react'

interface Member {
  id: string
  name: string | null
}

interface Presentation {
  member_id: string
  month: number
  presented: boolean
}

interface Props {
  initialYear: number
  initialMembers: Member[]
  initialPresentations: Presentation[]
}

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

type Grid = Record<string, Record<number, boolean>>

function buildGrid(presentations: Presentation[]): Grid {
  const grid: Grid = {}
  for (const p of presentations) {
    if (!grid[p.member_id]) grid[p.member_id] = {}
    grid[p.member_id][p.month] = p.presented
  }
  return grid
}

export default function AttendanceClient({ initialYear, initialMembers, initialPresentations }: Props) {
  const [year, setYear] = useState(initialYear)
  const [members, setMembers] = useState(initialMembers)
  const [grid, setGrid] = useState<Grid>(() => buildGrid(initialPresentations))
  const [yearLoading, setYearLoading] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)

  async function changeYear(newYear: number) {
    setYearLoading(true)
    setYear(newYear)
    try {
      const res = await fetch(`/api/presentations?year=${newYear}`)
      const data = await res.json()
      setMembers(data.members ?? [])
      setGrid(buildGrid(data.presentations ?? []))
    } finally {
      setYearLoading(false)
    }
  }

  async function toggle(memberId: string, month: number) {
    const key = `${memberId}-${month}`
    if (toggling === key) return

    const current = grid[memberId]?.[month] ?? false
    const newVal = !current

    setGrid(prev => ({
      ...prev,
      [memberId]: { ...(prev[memberId] ?? {}), [month]: newVal },
    }))
    setToggling(key)

    try {
      const res = await fetch('/api/presentations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId, year, month, presented: newVal }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setGrid(prev => ({
        ...prev,
        [memberId]: { ...(prev[memberId] ?? {}), [month]: current },
      }))
    } finally {
      setToggling(null)
    }
  }

  const rowTotals = members.map(m =>
    Array.from({ length: 12 }, (_, i) => i + 1).filter(month => grid[m.id]?.[month]).length
  )

  const colTotals = Array.from({ length: 12 }, (_, i) =>
    members.filter(m => grid[m.id]?.[i + 1]).length
  )

  const grandTotal = rowTotals.reduce((a, b) => a + b, 0)

  return (
    <>
      <style>{`
        .att-cell-btn:hover { opacity: 0.8; }
        .att-row:hover td { background: var(--bg); }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>발표 현황</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            월별 주식스터디 발표 현황
          </p>
        </div>

        {/* Year selector */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => changeYear(year - 1)}
            disabled={yearLoading}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-colors disabled:opacity-40"
            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', background: 'transparent' }}
          >
            ‹
          </button>
          <span
            className="text-sm font-semibold px-3 text-center"
            style={{ color: 'var(--text-primary)', minWidth: '56px' }}
          >
            {year}
          </span>
          <button
            onClick={() => changeYear(year + 1)}
            disabled={yearLoading}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-colors disabled:opacity-40"
            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', background: 'transparent' }}
          >
            ›
          </button>
        </div>
      </div>

      {/* Table */}
      <div
        className="overflow-x-auto rounded-xl"
        style={{ border: '1px solid var(--border)', background: 'var(--surface)', opacity: yearLoading ? 0.6 : 1, transition: 'opacity 0.15s' }}
      >
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
              <th
                className="px-4 py-3 text-left text-xs font-semibold sticky left-0"
                style={{ color: 'var(--text-muted)', minWidth: '100px', background: 'var(--bg)' }}
              >
                이름
              </th>
              {MONTHS.map((m, i) => (
                <th
                  key={i}
                  className="py-3 text-center text-xs font-semibold"
                  style={{ color: 'var(--text-muted)', minWidth: '52px' }}
                >
                  {m}
                </th>
              ))}
              <th
                className="px-4 py-3 text-center text-xs font-semibold"
                style={{ color: 'var(--text-muted)', minWidth: '56px', borderLeft: '1px solid var(--border)' }}
              >
                합계
              </th>
            </tr>
          </thead>

          <tbody>
            {members.length === 0 ? (
              <tr>
                <td
                  colSpan={14}
                  className="px-4 py-10 text-sm text-center"
                  style={{ color: 'var(--text-muted)' }}
                >
                  멤버가 없습니다.
                </td>
              </tr>
            ) : (
              members.map((member, rowIdx) => (
                <tr
                  key={member.id}
                  className="att-row transition-colors"
                  style={{ borderBottom: rowIdx < members.length - 1 ? '1px solid var(--border)' : undefined }}
                >
                  {/* Name */}
                  <td
                    className="px-4 py-3 font-medium sticky left-0"
                    style={{ color: 'var(--text-primary)', background: 'inherit' }}
                  >
                    {member.name ?? '(이름 없음)'}
                  </td>

                  {/* Month cells */}
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1
                    const key = `${member.id}-${month}`
                    const checked = grid[member.id]?.[month] ?? false
                    const isToggling = toggling === key
                    return (
                      <td key={month} className="py-3 text-center">
                        <button
                          onClick={() => toggle(member.id, month)}
                          disabled={isToggling}
                          className="att-cell-btn w-9 h-9 rounded-lg mx-auto flex items-center justify-center transition-all disabled:cursor-wait"
                          style={{
                            background: checked ? 'rgba(34,197,94,0.12)' : 'transparent',
                            border: `1px solid ${checked ? 'rgba(34,197,94,0.45)' : 'var(--border)'}`,
                            color: checked ? '#22c55e' : 'var(--border)',
                          }}
                        >
                          {isToggling ? (
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>…</span>
                          ) : checked ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                          )}
                        </button>
                      </td>
                    )
                  })}

                  {/* Row total */}
                  <td
                    className="px-4 py-3 text-center"
                    style={{ borderLeft: '1px solid var(--border)' }}
                  >
                    <span
                      className="text-sm font-semibold"
                      style={{ color: rowTotals[rowIdx] > 0 ? 'var(--accent)' : 'var(--text-muted)' }}
                    >
                      {rowTotals[rowIdx]}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {/* Footer: column totals */}
          {members.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--bg)' }}>
                <td
                  className="px-4 py-2.5 text-xs font-semibold sticky left-0"
                  style={{ color: 'var(--text-muted)', background: 'var(--bg)' }}
                >
                  합계
                </td>
                {colTotals.map((total, i) => (
                  <td key={i} className="py-2.5 text-center">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: total > 0 ? 'var(--accent)' : 'var(--text-muted)' }}
                    >
                      {total > 0 ? total : '—'}
                    </span>
                  </td>
                ))}
                <td
                  className="px-4 py-2.5 text-center"
                  style={{ borderLeft: '1px solid var(--border)' }}
                >
                  <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
                    {grandTotal}
                  </span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  )
}
