import { getStatsCanalDeux, creerPrescripteurPartenaire, marquerCommissionVersee, type TypePartenaire, type RemiseType } from '@/actions/codes-sessions'
import { getParametresPlateforme } from '@/actions/parametres'
import { serialize } from '@/lib/serialize'
import AdminCanalDeuxClient from './AdminCanalDeuxClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Canal 2 — Prescripteurs Partenaires | Admin' }

export default async function AdminPrescripteursPartenairesPage() {
  const [stats, plateformeParams] = await Promise.all([
    getStatsCanalDeux(),
    getParametresPlateforme(),
  ])
  return <AdminCanalDeuxClient stats={serialize(stats)} plateformeParams={serialize(plateformeParams)} />
}
