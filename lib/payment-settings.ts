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

/** Résout le numéro OM à utiliser dans les messages de paiement partenaire */
export function resolveOmNumber(paymentSettings: PaymentSettings | null | undefined): string {
  return paymentSettings?.orange_money_number?.trim() || '693407964'
}
