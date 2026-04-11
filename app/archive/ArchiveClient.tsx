'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface UploadEntry {
  id: string
  week: string | null
  title: string
  uploader: string
  file_name: string
  file_size: number | null
  file_path: string
  created_at: string
  downloadUrl: string | null
}

function formatFileSize(bytes: number | null): string {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ArchiveClient({
  files,
  currentUserName,
  isAdmin,
}: {
  files: UploadEntry[]
  currentUserName: string
  isAdmin: boolean
}) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editWeek, setEditWeek] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editFile, setEditFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function startEdit(f: UploadEntry) {
    setEditingId(f.id)
    setEditWeek(f.week != null ? String(f.week) : '')
    setEditTitle(f.title)
    setEditFile(null)
  }

  async function handleSave(id: string) {
    if (!editTitle.trim()) return
    if (!editWeek) { alert('회차(년/월)를 선택해주세요'); return }
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('week', editWeek)
      formData.append('title', editTitle.trim())
      if (editFile) formData.append('file', editFile)

      const res = await fetch(`/api/uploads/${id}`, { method: 'PATCH', body: formData })
      const data = await res.json()
      if (!res.ok) { alert(data.error ?? '수정 실패'); return }
      setEditingId(null)
      router.refresh()
    } catch {
      alert('네트워크 오류')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}" 파일을 삭제하시겠습니까?`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/uploads/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { alert(data.error ?? '삭제 실패'); return }
      router.refresh()
    } catch {
      alert('네트워크 오류')
    } finally {
      setDeletingId(null)
    }
  }

  const HEADERS = ['회차', '제목', '업로더', '파일명', '크기', '등록일', '']

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>아카이브</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{files.length}개 파일</p>
        </div>
        <a
          href="/upload"
          className="text-sm px-4 py-1.5 rounded-lg font-medium text-white"
          style={{ background: 'var(--accent)' }}
        >
          + 업로드
        </a>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        {files.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            업로드된 파일이 없습니다.{' '}
            <a href="/upload" style={{ color: 'var(--accent)' }}>파일을 업로드해보세요.</a>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {HEADERS.map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {files.map((file, i) => {
                const canEdit = isAdmin || file.uploader === currentUserName
                const isEditing = editingId === file.id

                return (
                  <tr key={file.id} style={i < files.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}>
                    {/* 회차 */}
                    <td className="px-4 py-3 text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--accent)' }}>
                      {isEditing ? (
                        <input
                          type="month"
                          value={editWeek}
                          onChange={(e) => setEditWeek(e.target.value)}
                          className="rounded px-2 py-1 text-sm outline-none"
                          style={{ background: 'var(--bg)', border: '1px solid var(--accent)', color: 'var(--text-primary)' }}
                        />
                      ) : file.week ?? '—'}
                    </td>

                    {/* 제목 */}
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="rounded px-2 py-1 text-sm outline-none w-48"
                          style={{ background: 'var(--bg)', border: '1px solid var(--accent)', color: 'var(--text-primary)' }}
                        />
                      ) : file.title}
                    </td>

                    {/* 업로더 */}
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{file.uploader}</td>

                    {/* 파일명 */}
                    <td className="px-4 py-3 max-w-xs" style={{ color: 'var(--text-muted)' }}>
                      {isEditing ? (
                        <div>
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs px-2.5 py-1 rounded"
                            style={{ color: 'var(--accent)', border: '1px solid rgba(59,130,246,0.3)' }}
                          >
                            {editFile ? editFile.name : '파일 변경 (선택)'}
                          </button>
                          <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => setEditFile(e.target.files?.[0] ?? null)} />
                        </div>
                      ) : (
                        <span className="truncate block" title={file.file_name}>{file.file_name}</span>
                      )}
                    </td>

                    {/* 크기 */}
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {isEditing && editFile ? formatFileSize(editFile.size) : formatFileSize(file.file_size)}
                    </td>

                    {/* 등록일 */}
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {new Date(file.created_at).toLocaleDateString('ko-KR')}
                    </td>

                    {/* 액션 */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleSave(file.id)}
                            disabled={saving}
                            className="text-xs px-2.5 py-1 rounded font-medium text-white disabled:opacity-50"
                            style={{ background: 'var(--accent)' }}
                          >
                            {saving ? '...' : '저장'}
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
                          {file.downloadUrl && (
                            <a
                              href={file.downloadUrl}
                              download={file.file_name}
                              className="text-xs px-2.5 py-1 rounded transition-colors"
                              style={{ color: 'var(--accent)', border: '1px solid rgba(59,130,246,0.3)' }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(59,130,246,0.08)')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              다운로드
                            </a>
                          )}
                          {canEdit && (
                            <>
                              <button
                                onClick={() => startEdit(file)}
                                className="text-xs px-2.5 py-1 rounded transition-colors"
                                style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                수정
                              </button>
                              <button
                                onClick={() => handleDelete(file.id, file.title)}
                                disabled={deletingId === file.id}
                                className="text-xs px-2.5 py-1 rounded transition-colors disabled:opacity-40"
                                style={{ color: 'var(--negative)', border: '1px solid rgba(239,68,68,0.3)' }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                {deletingId === file.id ? '...' : '삭제'}
                              </button>
                            </>
                          )}
                        </div>
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
