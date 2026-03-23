// app/evjf-evg/page.tsx — #146 Offre EVJF/EVG Kribi (statique)
import EvjfEvgClient from '@/components/evjf-evg/EvjfEvgClient'

export const metadata = {
  title: "EVJF / EVG à Kribi — L&Lui Signature",
  description: "Organisez votre enterrement de vie de jeune fille ou garçon à Kribi. Packages weekend groupe 4-12 personnes.",
}

export default function EvjfEvgPage() {
  return <EvjfEvgClient />
}
