'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { calculateReturnPct, formatReturnPct } from '@/lib/stock'

interface Entry {
  id: string
  ticker: string
  company_name: string
  purchase_price: number
  notes: string | null
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

  const HEADERS = ['종목명', '종목코드', '매입단가', '현재가', '수익률', '메모', '등록일', '']

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
              {entries.map((entry, i) => {
                const price = prices[entry.ticker]
                const returnPct =
                  price != null ? calculateReturnPct(entry.purchase_price, price) : null

                return (
                  <tr
                    key={entry.id}
                    style={
                      i < entries.length - 1
                        ? { borderBottom: '1px solid var(--border)' }
                        : undefined
                    }
                  >
                    {/* 종목명 */}
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                      {entry.company_name}
                    </td>

                    {/* 종목코드 */}
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                      {entry.ticker}
                    </td>

                    {/* 매입단가 */}
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>
                      {Number(entry.purchase_price).toLocaleString('ko-KR')}
                    </td>

                    {/* 현재가 */}
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>
                      {pricesLoading ? (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      ) : price != null ? (
                        price.toLocaleString('ko-KR')
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>조회 실패</span>
                      )}
                    </td>

                    {/* 수익률 */}
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {!pricesLoading && returnPct != null ? (
                        <span
                          style={{ color: returnPct >= 0 ? 'var(--positive)' : 'var(--negative)' }}
                        >
                          {formatReturnPct(returnPct)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>

                    {/* 메모 */}
                    <td
                      className="px-4 py-3 max-w-xs truncate"
                      style={{ color: 'var(--text-muted)' }}
                      title={entry.notes ?? undefined}
                    >
                      {entry.notes ?? '—'}
                    </td>

                    {/* 등록일 */}
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {new Date(entry.created_at).toLocaleDateString('ko-KR')}
                    </td>

                    {/* 삭제 (admin only) */}
                    <td className="px-4 py-3 text-right">
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(entry.id, entry.company_name)}
                          disabled={deletingId === entry.id}
                          className="text-xs px-2.5 py-1 rounded transition-colors disabled:opacity-40"
                          style={{
                            color: 'var(--negative)',
                            border: '1px solid rgba(239,68,68,0.3)',
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = 'transparent')
                          }
                        >
                          {deletingId === entry.id ? '...' : '삭제'}
                        </button>
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
