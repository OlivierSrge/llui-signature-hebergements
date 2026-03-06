export const dynamic = 'force-dynamic'

import { getWhatsAppTemplates } from '@/actions/whatsapp-templates'
import TemplatesEditor from '@/components/admin/TemplatesEditor'
import { MessageCircle } from 'lucide-react'

export const metadata = { title: 'Templates WhatsApp' }

export default async function TemplatesPage() {
  const templates = await getWhatsAppTemplates()

  return (
    <div className="p-6 sm:p-8 mt-14 lg:mt-0">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-dark flex items-center gap-3">
          <MessageCircle size={28} className="text-green-500" />
          Templates WhatsApp
        </h1>
        <p className="text-dark/50 text-sm mt-1">Personnalisez les 4 messages envoyés aux clients via le pipeline</p>
      </div>

      <div className="mb-6 p-4 bg-beige-50 border border-beige-200 rounded-xl">
        <p className="text-sm font-semibold text-dark mb-2">Variables disponibles :</p>
        <div className="flex flex-wrap gap-2">
          {[
            '{nom_client}', '{produit}', '{dates}', '{personnes}',
            '{montant}', '{code_reservation}', '{numero_paiement}',
            '{partenaire}', '{lien_suivi}'
          ].map((v) => (
            <code key={v} className="text-xs bg-white border border-beige-300 px-2 py-1 rounded-lg text-gold-700 font-mono">{v}</code>
          ))}
        </div>
      </div>

      <TemplatesEditor initialTemplates={templates} />
    </div>
  )
}
