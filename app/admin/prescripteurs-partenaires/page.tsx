import { getStatsCanalDeux, creerPrescripteurPartenaire, marquerCommissionVersee, type TypePartenaire, type RemiseType } from '@/actions/codes-sessions'
import AdminCanalDeuxClient from './AdminCanalDeuxClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Canal 2 — Prescripteurs Partenaires | Admin' }

export default async function AdminPrescripteursPartenairesPage() {
  const stats = await getStatsCanalDeux()
  return <AdminCanalDeuxClient stats={stats} />
}
