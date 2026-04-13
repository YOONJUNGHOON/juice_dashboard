import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PageLayout from '@/components/PageLayout'
import RefsClient from './RefsClient'

export const dynamic = 'force-dynamic'

export default async function RefsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const { data, error } = await supabase
    .from('ref_links')
    .select('id, label, memo, url')
    .order('created_at', { ascending: true })

  // If table doesn't exist yet, show setup notice instead of crashing
  if (error) {
    return (
      <PageLayout>
        <div>
          <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>참고사이트</h1>
          <p className="text-sm p-4 rounded-lg" style={{ color: 'var(--negative)', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
            DB 테이블이 없습니다. Supabase SQL 에디터에서 <code>ref_links</code> 테이블을 먼저 생성해주세요.
            <br /><span className="opacity-60 text-xs mt-1 block">({error.message})</span>
          </p>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <RefsClient initialLinks={data ?? []} />
    </PageLayout>
  )
}
