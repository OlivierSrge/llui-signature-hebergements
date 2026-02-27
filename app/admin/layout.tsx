import AdminSidebar from '@/components/admin/AdminSidebar'

export const metadata = { title: { template: '%s | Admin L&Lui', default: 'Dashboard Admin' } }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-beige-100">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
