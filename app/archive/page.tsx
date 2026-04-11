import { supabase } from '@/lib/supabase'
import PageLayout from '@/components/PageLayout'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function formatFileSize(bytes: number | null): string {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function ArchivePage() {
  const { data: uploads } = await supabase
    .from('uploads')
    .select('id, title, uploader, file_name, file_size, file_path, created_at')
    .order('created_at', { ascending: false })

  // Generate signed download URLs for all files (valid 1 hour)
  const files = await Promise.all(
    (uploads ?? []).map(async (u) => {
      const { data } = await supabase.storage
        .from('uploads')
        .createSignedUrl(u.file_path, 3600, { download: u.file_name })
      return { ...u, downloadUrl: data?.signedUrl ?? null }
    })
  )

  const HEADERS = ['제목', '업로더', '파일명', '크기', '등록일', '']

  return (
    <PageLayout>
      <div>
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              아카이브
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {files.length}개 파일
            </p>
          </div>
          <Link
            href="/upload"
            className="text-sm px-4 py-1.5 rounded-lg font-medium text-white"
            style={{ background: 'var(--accent)' }}
          >
            + 업로드
          </Link>
        </div>

        {/* Table */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          {files.length === 0 ? (
            <div className="py-16 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              업로드된 파일이 없습니다.{' '}
              <Link href="/upload" style={{ color: 'var(--accent)' }}>
                파일을 업로드해보세요.
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {HEADERS.map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 font-medium text-xs"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {files.map((file, i) => (
                  <tr
                    key={file.id}
                    style={
                      i < files.length - 1
                        ? { borderBottom: '1px solid var(--border)' }
                        : undefined
                    }
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                      {file.title}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                      {file.uploader}
                    </td>
                    <td
                      className="px-4 py-3 max-w-xs truncate"
                      style={{ color: 'var(--text-muted)' }}
                      title={file.file_name}
                    >
                      {file.file_name}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatFileSize(file.file_size)}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {new Date(file.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {file.downloadUrl ? (
                        <a
                          href={file.downloadUrl}
                          download={file.file_name}
                          className="text-xs px-3 py-1 rounded transition-colors"
                          style={{ color: 'var(--accent)', border: '1px solid rgba(59,130,246,0.3)' }}
                        >
                          다운로드
                        </a>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          URL 오류
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PageLayout>
  )
}
