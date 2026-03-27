import { BottomNav } from '@/components/bottom-nav'
import { ViewAsWrapper } from '@/components/view-as-wrapper'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ViewAsWrapper>
      <div className="min-h-dvh flex flex-col">
        <main className="flex-1 page-padding">
          {children}
        </main>
        <BottomNav />
      </div>
    </ViewAsWrapper>
  )
}
