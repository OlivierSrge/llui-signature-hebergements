export interface PaymentSettings {
  orange_money_number: string
  orange_money_holder: string
  bank_name: string
  bank_account: string
  bank_swift: string
  bank_holder: string
  bank_branch: string
  mtn_momo_number: string
  mtn_momo_holder: string
}

export const EMPTY_PAYMENT_SETTINGS: PaymentSettings = {
  orange_money_number: '',
  orange_money_holder: '',
  bank_name: '',
  bank_account: '',
  bank_swift: '',
  bank_holder: '',
  bank_branch: '',
  mtn_momo_number: '',
  mtn_momo_holder: '',
}

export interface AdminPaymentSettings {
  // Orange Money
  orange_money_number: string
  orange_money_holder: string
  // Revolut
  revolut_link: string
  revolut_display_name: string
  revolut_include_by_default: boolean
  revolut_message: string
  // Banque
  bank_name: string
  bank_account: string
  bank_swift: string
  bank_holder: string
  bank_branch: string
  // MTN MoMo
  mtn_momo_number: string
  mtn_momo_holder: string
}

export const DEFAULT_ADMIN_PAYMENT_SETTINGS: AdminPaymentSettings = {
  orange_money_number: '693407964',
  orange_money_holder: 'L&Lui Signature',
  revolut_link: 'https://revolut.me/olivieqf4i',
  revolut_display_name: 'L&Lui Signature',
  revolut_include_by_default: true,
  revolut_message: "Paiement sécurisé par carte bancaire ou virement — disponible depuis l'international",
  bank_name: '',
  bank_account: '',
  bank_swift: '',
  bank_holder: '',
  bank_branch: '',
  mtn_momo_number: '',
  mtn_momo_holder: '',
}

/** Résout le numéro OM à utiliser dans les messages de paiement partenaire */
export function resolveOmNumber(paymentSettings: PaymentSettings | null | undefined): string {
  return paymentSettings?.orange_money_number?.trim() || '693407964'
}
