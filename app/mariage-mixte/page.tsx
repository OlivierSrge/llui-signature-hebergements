// app/mariage-mixte/page.tsx — #194 Guide mariage mixte (statique)
import MariageMixteClient from '@/components/mariage-mixte/MariageMixteClient'

export const metadata = {
  title: "Mariage mixte au Cameroun — L&Lui Signature",
  description: "Guide complet des démarches légales, traducteurs et notaires partenaires à Kribi pour les mariages franco-camerounais et internationaux.",
}

export default function MariageMixtePage() {
  return <MariageMixteClient />
}
