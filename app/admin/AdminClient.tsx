'use client'

import { useState, useEffect, FormEvent } from 'react'

interface Member {
  id: string
  email: string
  name: string | null
  is_admin: boolean
  created_at: string
}

export default function AdminClient() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [formEmail, setFormEmail] = useState('')
  const [formName, setFormName] = useState('')
  const [formPin, setFormPin] = useState('')
  const [formIsAdmin, setFormIsAdmin] = useState(false)
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [formSuccess, setFormSuccess] = useState('')

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  async function fetchMembers() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/members')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setMembers(data.members)
    } catch {
      setError('멤버 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  async function handleAddMember(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')
    setFormLoading(true)
    try {
      const res = await fetch('/api/admin/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formEmail, name: formName, pin: formPin, isAdmin: formIsAdmin }),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error ?? '추가 실패'); return }
      setFormSuccess(`${formEmail} 추가 완료`)
      setFormEmail(''); setFormName(''); setFormPin(''); setFormIsAdmin(false)
      fetchMembers()
    } catch {
      setFormError('네트워크 오류')
    } finally {
      setFormLoading(false)
    }
  }

  function startEdit(m: Member) {
    setEditingId(m.id)
    setEditName(m.name ?? '')
  }

  async function handleSaveName(id: string) {
    setSavingId(id)
    try {
      const res = await fetch(`/api/admin/members/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error ?? '수정 실패'); return }
      setEditingId(null)
      fetchMembers()
    } catch {
      alert('네트워크 오류')
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete(id: string, email: string) {
    if (!confirm(`${email} 을(를) 삭제하시겠습니까?`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/members/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { alert(data.error ?? '삭제 실패'); return }
      fetchMembers()
    } catch {
      alert('네트워크 오류')
    } finally {
      setDeletingId(null)
    }
  }

  const inputStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Admin</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>스터디 멤버 관리</p>
      </div>

      {/* Member list */}
      <section className="rounded-xl mb-6" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>멤버 목록</h2>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{members.length}명</span>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-sm text-center" style={{ color: 'var(--text-muted)' }}>불러오는 중...</div>
        ) : error ? (
          <div className="px-5 py-10 text-sm text-center" style={{ color: 'var(--negative)' }}>{error}</div>
        ) : members.length === 0 ? (
          <div className="px-5 py-10 text-sm text-center" style={{ color: 'var(--text-muted)' }}>등록된 멤버가 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['이름', '이메일', '권한', '등록일', ''].map((h) => (
                  <th key={h} className="text-left px-5 py-3 font-medium text-xs" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={m.id} style={i < members.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}>
                  <td className="px-5 py-3" style={{ color: 'var(--text-primary)' }}>
                    {editingId === m.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveName(m.id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          className="rounded px-2 py-1 text-sm outline-none w-28"
                          style={{ background: 'var(--bg)', border: '1px solid var(--accent)', color: 'var(--text-primary)' }}
                        />
                        <button
                          onClick={() => handleSaveName(m.id)}
                          disabled={savingId === m.id}
                          className="text-xs px-2 py-1 rounded font-medium text-white disabled:opacity-50"
                          style={{ background: 'var(--accent)' }}
                        >
                          {savingId === m.id ? '...' : '저장'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs px-2 py-1 rounded"
                          style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <span
                        className="cursor-pointer hover:underline"
                        title="클릭하여 이름 수정"
                        onClick={() => startEdit(m)}
                      >
                        {m.name ?? '—'}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3" style={{ color: 'var(--text-muted)' }}>{m.email}</td>
                  <td className="px-5 py-3">
                    {m.is_admin ? (
                      <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent)' }}>Admin</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: 'rgba(100,116,139,0.15)', color: 'var(--text-muted)' }}>Member</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(m.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleDelete(m.id, m.email)}
                      disabled={deletingId === m.id}
                      className="text-xs px-3 py-1 rounded transition-colors disabled:opacity-40"
                      style={{ color: 'var(--negative)', border: '1px solid rgba(239,68,68,0.3)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {deletingId === m.id ? '삭제 중...' : '삭제'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Add member form */}
      <section className="rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>멤버 추가</h2>
        </div>
        <form onSubmit={handleAddMember} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>이메일 *</label>
              <input type="email" required value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
                placeholder="user@example.com" className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>이름</label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                placeholder="홍길동" className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>PIN *</label>
              <input type="text" required value={formPin} onChange={(e) => setFormPin(e.target.value)}
                placeholder="숫자 PIN" className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')} />
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" checked={formIsAdmin} onChange={(e) => setFormIsAdmin(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-500" />
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Admin 권한 부여</span>
              </label>
            </div>
          </div>

          {formError && (
            <p className="text-sm rounded-lg px-3 py-2" style={{ color: 'var(--negative)', background: 'rgba(239,68,68,0.08)' }}>{formError}</p>
          )}
          {formSuccess && (
            <p className="text-sm rounded-lg px-3 py-2" style={{ color: 'var(--positive)', background: 'rgba(34,197,94,0.08)' }}>{formSuccess}</p>
          )}

          <div className="flex justify-end">
            <button type="submit" disabled={formLoading}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60 transition-colors"
              style={{ background: 'var(--accent)' }}
              onMouseEnter={(e) => { if (!formLoading) e.currentTarget.style.background = 'var(--accent-hover)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)' }}>
              {formLoading ? '추가 중...' : '멤버 추가'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
