'use client'

import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Heading {
  id: string
  text: string
  level: number
}

interface MarkdownRendererProps {
  filename: string // nom du fichier dans /public/docs/
  theme?: 'premium' | 'legal' | 'admin'
  showTOC?: boolean
  onAccept?: () => void
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function extractHeadings(markdown: string): Heading[] {
  const lines = markdown.split('\n')
  const headings: Heading[] = []
  for (const line of lines) {
    const m = line.match(/^(#{1,3})\s+(.+)$/)
    if (m) {
      headings.push({ level: m[1].length, text: m[2].replace(/[*_`]/g, ''), id: slugify(m[2].replace(/[*_`]/g, '')) })
    }
  }
  return headings
}

// ─── Thèmes ──────────────────────────────────────────────────────────────────

const themes = {
  premium: {
    bg: 'bg-[#0A0A0A]',
    text: 'text-[#F5F0E8]',
    headingColor: 'text-[#C9A84C]',
    border: 'border-[#C9A84C]/20',
    tocBg: 'bg-[#111111]',
    tocBorder: 'border-[#C9A84C]/15',
    tocActiveText: 'text-[#C9A84C]',
    tocText: 'text-white/50',
    tocHover: 'hover:text-[#C9A84C]/80',
    tableBg: 'bg-[#111111]',
    tableHeader: 'bg-[#C9A84C]/10 text-[#C9A84C]',
    codeBg: 'bg-[#1a1a1a] text-[#C9A84C]',
    blockquoteBg: 'border-l-[#C9A84C] bg-[#C9A84C]/5',
    hrColor: 'border-[#C9A84C]/15',
    badgeBg: 'bg-[#C9A84C]/10',
  },
  legal: {
    bg: 'bg-[#0A0A0A]',
    text: 'text-[#E8E4DC]',
    headingColor: 'text-[#D4B896]',
    border: 'border-[#D4B896]/20',
    tocBg: 'bg-[#0F0F0F]',
    tocBorder: 'border-[#D4B896]/15',
    tocActiveText: 'text-[#D4B896]',
    tocText: 'text-white/40',
    tocHover: 'hover:text-[#D4B896]/80',
    tableBg: 'bg-[#0F0F0F]',
    tableHeader: 'bg-[#D4B896]/10 text-[#D4B896]',
    codeBg: 'bg-[#1a1a1a] text-[#D4B896]',
    blockquoteBg: 'border-l-[#D4B896] bg-[#D4B896]/5',
    hrColor: 'border-[#D4B896]/15',
    badgeBg: 'bg-[#D4B896]/10',
  },
  admin: {
    bg: 'bg-[#0E0E14]',
    text: 'text-white/80',
    headingColor: 'text-amber-300',
    border: 'border-amber-500/20',
    tocBg: 'bg-[#111118]',
    tocBorder: 'border-amber-500/10',
    tocActiveText: 'text-amber-400',
    tocText: 'text-white/40',
    tocHover: 'hover:text-amber-400/70',
    tableBg: 'bg-[#111118]',
    tableHeader: 'bg-amber-500/10 text-amber-300',
    codeBg: 'bg-[#1a1a24] text-amber-300',
    blockquoteBg: 'border-l-amber-500 bg-amber-500/5',
    hrColor: 'border-amber-500/10',
    badgeBg: 'bg-amber-500/10',
  },
}

export default function MarkdownRenderer({ filename, theme = 'premium', showTOC = true, onAccept }: MarkdownRendererProps) {
  const [content, setContent] = useState('')
  const [headings, setHeadings] = useState<Heading[]>([])
  const [activeId, setActiveId] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)

  const t = themes[theme]

  useEffect(() => {
    fetch(`/docs/${filename}`)
      .then((r) => r.text())
      .then((text) => {
        setContent(text)
        setHeadings(extractHeadings(text))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [filename])

  // Intersection observer pour TOC active
  useEffect(() => {
    if (!showTOC || headings.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        }
      },
      { rootMargin: '-80px 0px -70% 0px' }
    )
    const els = document.querySelectorAll('h1[id], h2[id], h3[id]')
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [headings, showTOC])

  const filteredContent = searchQuery
    ? content
        .split('\n')
        .filter((line) => {
          if (line.startsWith('#')) return true
          return line.toLowerCase().includes(searchQuery.toLowerCase())
        })
        .join('\n')
    : content

  if (loading) {
    return (
      <div className={`${t.bg} min-h-screen flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-3 opacity-40" />
          <p className="text-white/30 text-sm">Chargement…</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${t.bg} min-h-screen`}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* ── TOC Sticky ───────────────────────────────────────────── */}
          {showTOC && headings.length > 0 && (
            <aside className={`hidden lg:block w-60 shrink-0`}>
              <div className={`sticky top-6 ${t.tocBg} border ${t.tocBorder} rounded-2xl p-4 max-h-[calc(100vh-3rem)] overflow-y-auto`}>
                <p className={`text-[10px] uppercase tracking-widest ${t.tocActiveText} font-semibold mb-4 opacity-70`}>
                  Table des matières
                </p>
                <nav className="space-y-0.5">
                  {headings.map((h) => (
                    <a
                      key={h.id}
                      href={`#${h.id}`}
                      onClick={(e) => {
                        e.preventDefault()
                        const el = document.getElementById(h.id)
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        setActiveId(h.id)
                      }}
                      className={`block py-1 text-xs leading-relaxed transition-colors ${h.level === 1 ? 'font-semibold' : h.level === 2 ? 'pl-3' : 'pl-5'} ${
                        activeId === h.id ? t.tocActiveText : `${t.tocText} ${t.tocHover}`
                      }`}
                    >
                      {h.text}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}

          {/* ── Contenu principal ─────────────────────────────────────── */}
          <div ref={contentRef} className="flex-1 min-w-0">
            {/* Barre recherche (admin only) */}
            {theme === 'admin' && (
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Rechercher dans le guide…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#111118] border border-amber-500/20 rounded-xl px-4 py-2.5 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-amber-500/40"
                />
              </div>
            )}

            <article
              className={`prose-custom ${t.text}`}
              style={{ lineHeight: '1.8' }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => {
                    const text = String(children).replace(/[*_`]/g, '')
                    const id = slugify(text)
                    return (
                      <h1
                        id={id}
                        className={`text-2xl font-semibold ${t.headingColor} mt-12 mb-4 pb-3 border-b ${t.border} scroll-mt-6 first:mt-0`}
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                      >
                        {children}
                      </h1>
                    )
                  },
                  h2: ({ children }) => {
                    const text = String(children).replace(/[*_`]/g, '')
                    const id = slugify(text)
                    return (
                      <h2
                        id={id}
                        className={`text-lg font-semibold ${t.headingColor} mt-8 mb-3 scroll-mt-6`}
                        style={{ opacity: 0.9 }}
                      >
                        {children}
                      </h2>
                    )
                  },
                  h3: ({ children }) => {
                    const text = String(children).replace(/[*_`]/g, '')
                    const id = slugify(text)
                    return (
                      <h3
                        id={id}
                        className={`text-base font-semibold ${t.text} mt-6 mb-2 scroll-mt-6`}
                        style={{ opacity: 0.85 }}
                      >
                        {children}
                      </h3>
                    )
                  },
                  p: ({ children }) => (
                    <p className="mb-4 leading-relaxed" style={{ opacity: 0.85 }}>
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-4 space-y-1.5 pl-5" style={{ listStyleType: 'disc', opacity: 0.85 }}>
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-4 space-y-1.5 pl-5" style={{ listStyleType: 'decimal', opacity: 0.85 }}>
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed text-sm">{children}</li>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote
                      className={`border-l-4 ${t.blockquoteBg} pl-4 py-2 my-4 rounded-r-xl`}
                      style={{ borderLeftColor: undefined }}
                    >
                      <div className="text-sm italic" style={{ opacity: 0.8 }}>
                        {children}
                      </div>
                    </blockquote>
                  ),
                  code: ({ children, className }) => {
                    const isBlock = className?.includes('language-')
                    if (isBlock) {
                      return (
                        <pre className={`${t.codeBg} rounded-xl p-4 my-4 overflow-x-auto`}>
                          <code className="text-xs font-mono leading-relaxed">{children}</code>
                        </pre>
                      )
                    }
                    return (
                      <code className={`${t.codeBg} px-1.5 py-0.5 rounded text-xs font-mono`}>
                        {children}
                      </code>
                    )
                  },
                  pre: ({ children }) => <>{children}</>,
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-6 rounded-xl border border-white/5">
                      <table className={`w-full text-sm ${t.tableBg}`}>
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className={t.tableHeader}>{children}</thead>
                  ),
                  tbody: ({ children }) => (
                    <tbody className="divide-y divide-white/5">{children}</tbody>
                  ),
                  tr: ({ children }) => <tr className="hover:bg-white/3 transition-colors">{children}</tr>,
                  th: ({ children }) => (
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-4 py-3 text-sm" style={{ opacity: 0.75 }}>
                      {children}
                    </td>
                  ),
                  hr: () => <hr className={`my-10 border-0 border-t ${t.hrColor}`} />,
                  strong: ({ children }) => (
                    <strong className={`font-semibold ${t.headingColor}`}>{children}</strong>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      className={`${t.tocActiveText} underline underline-offset-2 hover:opacity-80 transition-opacity`}
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {filteredContent}
              </ReactMarkdown>
            </article>

            {/* Bouton J'accepte (charte) */}
            {onAccept && (
              <div className="mt-12 pt-8 border-t border-white/10 text-center">
                <button
                  onClick={onAccept}
                  className="inline-flex items-center gap-2 bg-[#C9A84C] hover:bg-[#B8963C] text-black font-semibold px-8 py-4 rounded-2xl transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  J&apos;accepte la Charte Alliance Privée
                </button>
                <p className="text-white/20 text-xs mt-3">Date d&apos;acceptation enregistrée automatiquement</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
