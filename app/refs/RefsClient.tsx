'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface RefLink {
  id: string
  label: string
  url: string
}

interface RefsClientProps {
  initialLinks: RefLink[]
}

export default function RefsClient({ initialLinks }: RefsClientProps) {
  const router = useRouter()

  // Add form
  const [showForm, setShowForm] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Edit mode
  const [editMode, setEditMode] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function startEdit(link: RefLink) {
    setEditingId(link.id)
    setEditLabel(link.label)
    setEditUrl(link.url)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditLabel('')
    setEditUrl('')
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setAddError(null)
    try {
      const res = await fetch('/api/refs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel, url: newUrl }),
      })
      const data = await res.json()
      if (!res.ok) { setAddError(data.error ?? '추가 실패'); return }
      setNewLabel('')
      setNewUrl('')
      setShowForm(false)
      router.refresh()
    } catch {
      setAddError('네트워크 오류')
    } finally {
      setSaving(false)
    }
  }

  async function handleSave(id: string) {
    setEditSaving(true)
    try {
      const res = await fetch(`/api/refs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: editLabel, url: editUrl }),
      })
      if (!res.ok) { alert('수정 실패'); return }
      cancelEdit()
      router.refresh()
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/refs/${id}`, { method: 'DELETE' })
      if (!res.ok) { alert('삭제 실패'); return }
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  const inputStyle = {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  }

  return (
    <>
      <style>{`
        .ref-row:hover { background: var(--bg); }
        .ref-row-edit { cursor: pointer; }
        .ref-row-edit:hover { background: var(--bg); }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>참고사이트</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            투자 리서치에 유용한 링크 모음
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setEditMode((v) => !v); setShowForm(false); cancelEdit() }}
            className="text-sm px-3 py-1.5 rounded-lg transition-colors"
            style={{
              color: editMode ? 'var(--accent)' : 'var(--text-muted)',
              border: `1px solid ${editMode ? 'var(--accent)' : 'var(--border)'}`,
              background: editMode ? 'rgba(59,130,246,0.06)' : 'transparent',
            }}
          >
            {editMode ? '완료' : '편집'}
          </button>
          <button
            onClick={() => { setShowForm((v) => !v); setEditMode(false); cancelEdit(); setAddError(null) }}
            className="text-sm px-4 py-1.5 rounded-lg font-medium text-white transition-colors"
            style={{ background: 'var(--accent)' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--accent-hover)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--accent)')}
          >
            {showForm ? '취소' : '+ 추가'}
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          className="rounded-xl px-5 py-4 mb-6 flex flex-col gap-3"
          style={{ border: '1px solid var(--accent)', background: 'var(--surface)' }}
        >
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>이름</label>
              <input
                value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
                placeholder="예: 네이버 파이낸스" required
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>
            <div className="flex-[2]">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>URL</label>
              <input
                value={newUrl} onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://..." required type="url"
                className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>
          </div>
          {addError && <p className="text-xs" style={{ color: 'var(--negative)' }}>{addError}</p>}
          <div className="flex justify-end">
            <button
              type="submit" disabled={saving}
              className="text-sm px-4 py-1.5 rounded-lg font-medium text-white disabled:opacity-50 transition-colors"
              style={{ background: 'var(--accent)' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--accent-hover)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--accent)')}
            >
              {saving ? '추가 중...' : '추가'}
            </button>
          </div>
        </form>
      )}

      {/* Links list */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        {initialLinks.length === 0 ? (
          <p className="px-5 py-8 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
            링크가 없습니다. + 추가 버튼으로 추가해보세요.
          </p>
        ) : (
          initialLinks.map((link, i) => {
            const isLast = i === initialLinks.length - 1
            const borderStyle = !isLast ? { borderBottom: '1px solid var(--border)' } : undefined

            // Inline editing row
            if (editMode && editingId === link.id) {
              return (
                <div key={link.id} className="px-4 py-3 flex items-center gap-2" style={borderStyle}>
                  {/* Delete button placeholder to maintain alignment */}
                  <div className="w-7 shrink-0" />
                  <input
                    value={editLabel} onChange={(e) => setEditLabel(e.target.value)}
                    className="rounded px-2 py-1 text-sm outline-none flex-1"
                    style={{ ...inputStyle, borderColor: 'var(--accent)' }}
                    autoFocus
                  />
                  <input
                    value={editUrl} onChange={(e) => setEditUrl(e.target.value)}
                    className="rounded px-2 py-1 text-sm font-mono outline-none flex-[2]"
                    style={{ ...inputStyle, borderColor: 'var(--accent)' }}
                  />
                  <button
                    onClick={() => handleSave(link.id)} disabled={editSaving}
                    className="text-xs px-2.5 py-1 rounded font-medium text-white disabled:opacity-50 shrink-0"
                    style={{ background: 'var(--accent)' }}
                  >
                    {editSaving ? '...' : '저장'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="text-xs px-2.5 py-1 rounded shrink-0"
                    style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                  >
                    취소
                  </button>
                </div>
              )
            }

            // Edit mode: show delete button on left + click to edit
            if (editMode) {
              return (
                <div
                  key={link.id}
                  className="ref-row-edit flex items-center px-4 py-3.5 text-sm transition-colors"
                  style={borderStyle}
                  onClick={() => startEdit(link)}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(link.id) }}
                    disabled={deletingId === link.id}
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full mr-3 transition-colors disabled:opacity-40"
                    style={{ color: 'var(--negative)', border: '1px solid rgba(239,68,68,0.35)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {deletingId === link.id ? (
                      <span className="text-xs">…</span>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    )}
                  </button>
                  <span className="font-medium flex-1" style={{ color: 'var(--text-primary)' }}>{link.label}</span>
                  <span className="text-xs font-mono truncate max-w-sm ml-4" style={{ color: 'var(--text-muted)' }}>{link.url}</span>
                  <svg className="ml-3 shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </div>
              )
            }

            // Normal mode: link opens in new tab
            return (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ref-row flex items-center justify-between px-5 py-3.5 text-sm transition-colors"
                style={{ ...borderStyle, color: 'var(--text-primary)', textDecoration: 'none' }}
              >
                <span className="font-medium">{link.label}</span>
                <span className="text-xs font-mono truncate max-w-sm ml-4 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  {link.url}
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </span>
              </a>
            )
          })
        )}
      </div>
    </>
  )
}
