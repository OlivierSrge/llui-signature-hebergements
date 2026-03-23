// app/guide-kribi/page.tsx — #94 Guide Bienvenue Kribi (public, statique)
import GuideKribiClient from '@/components/guide/GuideKribiClient'

export const metadata = {
  title: 'Guide Bienvenue Kribi — L&Lui Signature',
  description: 'Tout ce que vous devez savoir pour profiter de votre séjour à Kribi à l'occasion du mariage.',
}

export default function GuideKribiPage() {
  return <GuideKribiClient />
}
