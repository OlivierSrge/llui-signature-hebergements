import Link from 'next/link'
import { MapPin, Phone, Mail, Instagram, Facebook } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-dark text-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <h3 className="font-serif text-2xl font-semibold text-white mb-4">
              L<span className="text-gold-400">&</span>Lui Signature
            </h3>
            <p className="text-sm leading-relaxed text-white/60 mb-6">
              Agence de mariage premium basée à Kribi, Cameroun. Nous sélectionnons
              pour vous les plus belles adresses pour sublimer votre séjour.
            </p>
            <div className="flex gap-4">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold-500 transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={16} />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold-500 transition-colors"
                aria-label="Facebook"
              >
                <Facebook size={16} />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-widest mb-5">
              Navigation
            </h4>
            <ul className="space-y-3 text-sm">
              {[
                { href: '/', label: 'Tous les hébergements' },
                { href: '/?type=villa', label: 'Villas' },
                { href: '/?type=appartement', label: 'Appartements' },
                { href: '/?type=chambre', label: 'Chambres' },
                { href: '/espace-client', label: 'Espace client' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/60 hover:text-gold-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-widest mb-5">
              Contact
            </h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3 text-white/60">
                <MapPin size={15} className="text-gold-400 mt-0.5 flex-shrink-0" />
                <span>Kribi, Région du Sud<br />Cameroun</span>
              </li>
              <li className="flex items-center gap-3 text-white/60">
                <Phone size={15} className="text-gold-400 flex-shrink-0" />
                <a href="tel:+237699000000" className="hover:text-gold-400 transition-colors">
                  +237 699 000 000
                </a>
              </li>
              <li className="flex items-center gap-3 text-white/60">
                <Mail size={15} className="text-gold-400 flex-shrink-0" />
                <a href="mailto:contact@llui-signature.cm" className="hover:text-gold-400 transition-colors">
                  contact@llui-signature.cm
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
          <p>© {new Date().getFullYear()} L&amp;Lui Signature. Tous droits réservés.</p>
          <div className="flex gap-6">
            <span>Politique de confidentialité</span>
            <span>Conditions générales</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
