export interface StarsQrToken {
  id: string           // = token nanoid(32) — doc ID
  client_uid: string   // telephone E.164
  created_at: string
  expires_at: string   // created_at + 5 minutes
  used: boolean
  used_at?: string
  used_by?: string     // prescripteur_partenaire_id qui a validé
}
