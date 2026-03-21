// app/(main)/hebergements/page.tsx — Redirect vers la liste (racine)
import { redirect } from 'next/navigation'

interface Props {
  searchParams: Record<string, string>
}

export default function HebergementsRedirectPage({ searchParams }: Props) {
  const params = new URLSearchParams(searchParams).toString()
  redirect(params ? `/?${params}` : '/')
}
