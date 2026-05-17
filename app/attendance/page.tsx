import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PageLayout from '@/components/PageLayout'
import AttendanceClient from './AttendanceClient'

export const dynamic = 'force-dynamic'

export default async function AttendancePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const year = new Date().getFullYear()

  const [membersRes, presRes] = await Promise.all([
    supabase.from('allowed_emails').select('id, name').order('name'),
    supabase.from('presentations').select('member_id, month, presented').eq('year', year),
  ])

  if (membersRes.error) {
    return (
      <PageLayout>
        <div>
          <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>발표 현황</h1>
          <p className="text-sm p-4 rounded-lg" style={{ color: 'var(--negative)', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
            DB 오류: {membersRes.error.message}
            <br /><span className="opacity-60 text-xs mt-1 block">Supabase SQL 에디터에서 presentations 테이블을 먼저 생성해주세요.</span>
          </p>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <AttendanceClient
        initialYear={year}
        initialMembers={membersRes.data ?? []}
        initialPresentations={presRes.data ?? []}
      />
    </PageLayout>
  )
}
