'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { calculateReturnPct, formatReturnPct, isKoreanTicker } from '@/lib/stock'

interface Entry {
  id: string
  ticker: string
  company_name: string
  purchase_price: number
  notes: string | null
  recommender: string | null
  created_at: string
}

interface DashboardClientProps {
  entries: Entry[]
  isAdmin: boolean
}

export default function DashboardClient({ entries, isAdmin }: DashboardClientProps) {
  const router = useRouter()
  const [prices, setPrices] = useState<Record<string, number | null>>({})
  const [pricesLoading, setPricesLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ ticker: '', company_name: '', purchase_price: '', recommender: '', notes: '' })
  const [savingId, setSavingId] = useState<string | null>(null)

  const fetchPrices = useCallback(async () => {
    if (entries.length === 0) return
    setPricesLoading(true)
    try {
      const tickers = entries.map((e) => e.ticker).join(',')
      const res = await fetch(`/api/stock-price?tickers=${tickers}`)
      if (res.ok) {
        const data = await res.json()
        setPrices(data)
      }
    } finally {
      setPricesLoading(false)
    }
  }, [entries])

  useEffect(() => {
    fetchPrices()
  }, [fetchPrices])

  function startEdit(entry: Entry) {
    setEditingId(entry.id)
    setEditForm({
      ticker: entry.ticker,
      company_name: entry.company_name,
      purchase_price: String(entry.purchase_price),
      recommender: entry.recommender ?? '',
      notes: entry.notes ?? '',
    })
  }

  async function handleSave(id: string) {
    setSavingId(id)
    try {
      const res = await fetch(`/api/dashboard/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error ?? '수정 실패'); return }
      setEditingId(null)
      router.refresh()
    } catch {
      alert('네트워크 오류')
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 항목을 삭제하시겠습니까?`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/dashboard/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? '삭제 실패')
        return
      }
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  const HEADERS = ['순위', '종목명', '종목코드', '추천인', '매입단가', '현재가', '수익률', '메모', '등록일', '']

  // Sort entries by return % descending; entries with no price go to bottom
  const sortedEntries = [...entries].sort((a, b) => {
    const pa = prices[a.ticker]
    const pb = prices[b.ticker]
    if (pa == null && pb == null) return 0
    if (pa == null) return 1
    if (pb == null) return -1
    const ra = (pa - a.purchase_price) / a.purchase_price
    const rb = (pb - b.purchase_price) / b.purchase_price
    return rb - ra
  })

  // Leaderboard: top 2 by return %
  const ranked = entries
    .map((e) => {
      const price = prices[e.ticker]
      if (price == null) return null
      return { entry: e, returnPct: ((price - e.purchase_price) / e.purchase_price) * 100 }
    })
    .filter((x): x is { entry: Entry; returnPct: number } => x !== null)
    .sort((a, b) => b.returnPct - a.returnPct)

  const medals = ['1위', '2위', '3위']

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            대시보드
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {entries.length}개 종목
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchPrices}
            disabled={pricesLoading}
            className="text-sm px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--text-muted)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            {pricesLoading ? '갱신 중...' : '가격 갱신'}
          </button>
          <Link
            href="/add-entry"
            className="text-sm px-4 py-1.5 rounded-lg font-medium text-white transition-colors"
            style={{ background: 'var(--accent)' }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = 'var(--accent-hover)')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = 'var(--accent)')
            }
          >
            + 종목 추가
          </Link>
        </div>
      </div>

      {/* Leaderboard */}
      {!pricesLoading && ranked.length >= 1 && (
        <div className="flex gap-3 mb-6">
          {ranked.slice(0, 3).map(({ entry, returnPct }, i) => {
            const medalStyle = [
              { border: 'rgba(234,179,8,0.4)', bg: 'rgba(234,179,8,0.05)', badgeBg: 'rgba(234,179,8,0.15)', badgeColor: '#a16207' },
              { border: 'rgba(148,163,184,0.4)', bg: 'rgba(148,163,184,0.05)', badgeBg: 'rgba(148,163,184,0.15)', badgeColor: '#475569' },
              { border: 'rgba(180,120,60,0.4)',  bg: 'rgba(180,120,60,0.05)',  badgeBg: 'rgba(180,120,60,0.15)',  badgeColor: '#92400e' },
            ][i]
            return (
              <div
                key={entry.id}
                className="flex-1 rounded-xl px-5 py-4"
                style={{ border: `1px solid ${medalStyle.border}`, background: medalStyle.bg }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded"
                    style={{ background: medalStyle.badgeBg, color: medalStyle.badgeColor }}
                  >
                    {medals[i]}
                  </span>
                  <span
                    className="text-sm font-bold tabular-nums"
                    style={{ color: returnPct >= 0 ? 'var(--positive)' : 'var(--negative)' }}
                  >
                    {formatReturnPct(returnPct)}
                  </span>
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {entry.company_name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {entry.ticker} · 추천: {entry.recommender ?? '—'}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        {entries.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            등록된 종목이 없습니다.{' '}
            <Link href="/add-entry" style={{ color: 'var(--accent)' }}>
              종목을 추가해보세요.
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {HEADERS.map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 font-medium text-xs whitespace-nowrap"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry, i) => {
                const price = prices[entry.ticker]
                const returnPct =
                  price != null ? calculateReturnPct(entry.purchase_price, price) : null
                const isEditing = editingId === entry.id
                const borderStyle = i < sortedEntries.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined
                const cellInput = (field: keyof typeof editForm, opts?: { mono?: boolean; numeric?: boolean }) => (
                  <input
                    value={editForm[field]}
                    onChange={(e) => setEditForm((f) => ({ ...f, [field]: e.target.value }))}
                    className={`w-full rounded px-2 py-1 text-sm outline-none ${opts?.mono ? 'font-mono' : ''} ${opts?.numeric ? 'tabular-nums text-right' : ''}`}
                    style={{ background: 'var(--bg)', border: '1px solid var(--accent)', color: 'var(--text-primary)', minWidth: 0 }}
                  />
                )

                return (
                  <tr key={entry.id} style={borderStyle}>
                    {/* 순위 */}
                    <td className="px-4 py-3 text-xs font-bold tabular-nums text-center">
                      {i === 0 ? (
                        <span style={{ color: '#a16207' }}>🥇</span>
                      ) : i === 1 ? (
                        <span style={{ color: '#475569' }}>🥈</span>
                      ) : i === 2 ? (
                        <span style={{ color: '#92400e' }}>🥉</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                      )}
                    </td>

                    {/* 종목명 */}
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                      {isEditing ? cellInput('company_name') : entry.company_name}
                    </td>

                    {/* 종목코드 */}
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                      {isEditing ? cellInput('ticker', { mono: true }) : entry.ticker}
                    </td>

                    {/* 추천인 */}
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                      {isEditing ? cellInput('recommender') : (entry.recommender ?? '—')}
                    </td>

                    {/* 매입단가 */}
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>
                      {isEditing ? cellInput('purchase_price', { numeric: true }) : (
                        isKoreanTicker(entry.ticker)
                          ? Number(entry.purchase_price).toLocaleString('ko-KR')
                          : `$${Number(entry.purchase_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      )}
                    </td>

                    {/* 현재가 */}
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>
                      {pricesLoading ? (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      ) : price != null ? (
                        isKoreanTicker(entry.ticker)
                          ? price.toLocaleString('ko-KR')
                          : `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>조회 실패</span>
                      )}
                    </td>

                    {/* 수익률 */}
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {!pricesLoading && returnPct != null ? (
                        <span style={{ color: returnPct >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                          {formatReturnPct(returnPct)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>

                    {/* 메모 */}
                    <td className="px-4 py-3 max-w-xs truncate" style={{ color: 'var(--text-muted)' }} title={entry.notes ?? undefined}>
                      {isEditing ? cellInput('notes') : (entry.notes ?? '—')}
                    </td>

                    {/* 등록일 */}
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {new Date(entry.created_at).toLocaleDateString('ko-KR')}
                    </td>

                    {/* 수정/삭제 (admin only) */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {isAdmin && (
                        isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSave(entry.id)}
                              disabled={savingId === entry.id}
                              className="text-xs px-2.5 py-1 rounded font-medium text-white disabled:opacity-50"
                              style={{ background: 'var(--accent)' }}
                            >
                              {savingId === entry.id ? '...' : '저장'}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-xs px-2.5 py-1 rounded"
                              style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => startEdit(entry)}
                              className="text-xs px-2.5 py-1 rounded transition-colors"
                              style={{ color: 'var(--accent)', border: '1px solid rgba(59,130,246,0.3)' }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(59,130,246,0.08)')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id, entry.company_name)}
                              disabled={deletingId === entry.id}
                              className="text-xs px-2.5 py-1 rounded transition-colors disabled:opacity-40"
                              style={{ color: 'var(--negative)', border: '1px solid rgba(239,68,68,0.3)' }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              {deletingId === entry.id ? '...' : '삭제'}
                            </button>
                          </div>
                        )
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
