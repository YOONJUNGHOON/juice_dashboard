'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function AddEntryClient() {
  const router = useRouter()
  const [ticker, setTicker] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [recommender, setRecommender] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const price = Number(purchasePrice)
    if (isNaN(price) || price <= 0) {
      setError('매입단가는 0보다 큰 숫자여야 합니다')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: ticker.trim(),
          company_name: companyName.trim(),
          purchase_price: price,
          notes: notes.trim() || null,
          recommender: recommender.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '추가 실패')
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = 'var(--accent)'
  }
  function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = 'var(--border)'
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          종목 추가
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          스터디 대시보드에 새 종목을 등록합니다
        </p>
      </div>

      <div
        className="rounded-xl p-6"
        style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="ticker"
                className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--text-muted)' }}
              >
                종목코드 *
              </label>
              <input
                id="ticker"
                type="text"
                required
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="예: 005930 / AAPL"
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none font-mono"
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                {/^\d{6}$/.test(ticker) ? (
                  <>한국주식 · <a href={`https://finance.naver.com/item/main.nhn?code=${ticker}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>네이버 금융에서 확인 ↗</a></>
                ) : ticker ? (
                  <>해외주식 · <a href={`https://finance.yahoo.com/quote/${ticker}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Yahoo Finance에서 확인 ↗</a></>
                ) : (
                  <>한국: <a href="https://finance.naver.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>네이버 금융</a> · 해외: <a href="https://finance.yahoo.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Yahoo Finance</a></>
                )}
              </p>
            </div>

            <div>
              <label
                htmlFor="company"
                className="block text-xs font-medium mb-1.5"
                style={{ color: 'var(--text-muted)' }}
              >
                종목명 *
              </label>
              <input
                id="company"
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="예: 삼성전자"
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="recommender"
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--text-muted)' }}
            >
              추천인
            </label>
            <input
              id="recommender"
              type="text"
              value={recommender}
              onChange={(e) => setRecommender(e.target.value)}
              placeholder="예: 홍길동"
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          <div>
            <label
              htmlFor="price"
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--text-muted)' }}
            >
              매입단가{/^\d{6}$/.test(ticker) ? ' (원)' : ticker ? ' (USD)' : ' (원/USD)'} *
            </label>
            <input
              id="price"
              type="number"
              required
              min="0"
              step="any"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              placeholder={/^\d{6}$/.test(ticker) ? '예: 52300' : '예: 185.50'}
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none tabular-nums"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          <div>
            <label
              htmlFor="notes"
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--text-muted)' }}
            >
              메모
            </label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="투자 근거, 목표가 등 자유롭게 작성하세요"
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none"
              style={{ ...inputStyle }}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          {error && (
            <p
              className="text-sm rounded-lg px-3 py-2"
              style={{ color: 'var(--negative)', background: 'rgba(239,68,68,0.08)' }}
            >
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="text-sm px-4 py-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="text-sm px-5 py-2 rounded-lg font-medium text-white disabled:opacity-60 transition-colors"
              style={{ background: 'var(--accent)' }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = 'var(--accent-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--accent)'
              }}
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
