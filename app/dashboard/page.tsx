import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import PageLayout from '@/components/PageLayout'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [session, { data: entries }] = await Promise.all([
    getSession(),
    supabase
      .from('dashboard_entries')
      .select('id, ticker, company_name, purchase_price, notes, created_at')
      .order('created_at', { ascending: false }),
  ])

  return (
    <PageLayout>
      <DashboardClient entries={entries ?? []} isAdmin={session?.isAdmin ?? false} />
    </PageLayout>
  )
}
