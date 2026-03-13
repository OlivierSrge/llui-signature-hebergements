export const dynamic = 'force-dynamic'

import { Settings2 } from 'lucide-react'
import { loadAdminPaymentSettings } from '@/actions/payment-settings'
import AdminGlobalPaymentSettingsForm from '@/components/admin/AdminGlobalPaymentSettingsForm'

export const metadata = { title: 'Paramètres de paiement — Admin' }

export default async function AdminPaymentSettingsPage() {
  const settings = await loadAdminPaymentSettings()

  return (
    <div className="p-6 sm:p-8 mt-14 lg:mt-0">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-dark flex items-center gap-3">
          <Settings2 size={28} className="text-gold-500" />
          Paramètres de paiement
        </h1>
        <p className="text-dark/50 text-sm mt-2">
          Paramètres globaux L&Lui Signature. Utilisés comme valeurs par défaut si un partenaire n'a pas configuré les siens.
        </p>
      </div>

      <div className="max-w-2xl">
        {/* Règle de priorité */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-xs font-semibold text-blue-800 mb-1">Règle de priorité des paramètres</p>
          <ol className="text-xs text-blue-700 space-y-0.5 list-decimal list-inside">
            <li>Paramètres de paiement du partenaire <span className="font-semibold">(priorité maximale)</span></li>
            <li>Paramètres de paiement admin définis ici <span className="font-semibold">(fallback)</span></li>
            <li>Valeurs codées en dur — 693407964 <span className="font-semibold">(fallback ultime)</span></li>
          </ol>
        </div>

        <AdminGlobalPaymentSettingsForm initialSettings={settings} />
      </div>
    </div>
  )
}
