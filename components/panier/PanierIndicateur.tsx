'use client'
// components/panier/PanierIndicateur.tsx
// Icône panier avec badge article count — dans la TopBar

import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { usePanier } from '@/hooks/usePanier'

interface Props {
  uid: string
}

export default function PanierIndicateur({ uid }: Props) {
  const { totaux } = usePanier(uid)
  const count = totaux.nb_articles

  return (
    <Link href="/portail/panier" className="relative flex items-center justify-center w-9 h-9">
      <ShoppingBag size={20} className="text-white" />
      {count > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
          style={{ background: '#C9A84C' }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
