import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import PageLayout from '@/components/PageLayout'
import ArchiveClient from './ArchiveClient'

export const dynamic = 'force-dynamic'

export default async function ArchivePage() {
  const [session, { data: uploads }] = await Promise.all([
    getSession(),
    supabase
      .from('uploads')
      .select('id, week, title, uploader, file_name, file_size, file_path, created_at')
      .order('week', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false }),
  ])

  // Generate signed download URLs (valid 1 hour)
  const files = await Promise.all(
    (uploads ?? []).map(async (u) => {
      const { data } = await supabase.storage
        .from('uploads')
        .createSignedUrl(u.file_path, 3600, { download: u.file_name })
      return { ...u, downloadUrl: data?.signedUrl ?? null }
    })
  )

  return (
    <PageLayout>
      <ArchiveClient
        files={files}
        currentUserName={session?.name ?? ''}
        isAdmin={session?.isAdmin ?? false}
      />
    </PageLayout>
  )
}
