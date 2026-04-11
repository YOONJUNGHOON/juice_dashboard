import { getSession } from '@/lib/auth'
import Nav from './Nav'

export default async function PageLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  return (
    <div className="min-h-screen flex flex-col">
      <Nav isAdmin={session?.isAdmin ?? false} userName={session?.name ?? ''} />
      <main className="flex-1 px-8 py-8 w-full max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  )
}
