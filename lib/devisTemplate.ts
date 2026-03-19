// lib/devisTemplate.ts
// Générateur de proposition commerciale HTML 12 slides
// L&Lui Signature — Module Mariages & Devis

import {
  PACKS, LLUI_CONFIG, INTRODUCTIONS, CATALOGUE,
  calculerTotaux, formatFCFA, getCdcTraiteur, getCdcDecoration,
} from '@/lib/devisDefaults'
import type { DevisFormData } from '@/lib/devisDefaults'

export interface DevisHTMLData {
  form: DevisFormData
  totaux: ReturnType<typeof calculerTotaux>
  ref: string
}

// ─── CSS ────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Montserrat:wght@300;400;500&display=swap');
:root{--beige:#F5F0E8;--or:#C9A84C;--noir:#1A1A1A;--gris:#888;--vert:#7C9A7E}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--beige);font-family:'Montserrat',sans-serif;overflow:hidden}
h1,h2,h3{font-family:'Cormorant Garamond',serif;font-weight:300;font-style:italic}
.slide{width:100vw;height:100vh;display:none;position:relative;overflow:hidden;flex-direction:column}
.slide.active{display:flex}
.bg-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.overlay{position:absolute;inset:0;background:rgba(20,18,14,0.55)}
.overlay-light{position:absolute;inset:0;background:rgba(20,18,14,0.28)}
.content{position:relative;z-index:2;width:100%;height:100%;padding:3rem 5vw;display:flex;flex-direction:column;justify-content:center}
.content-row{position:relative;z-index:2;width:100%;height:100%;display:grid;gap:0}
.label{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--gris);margin-bottom:.6rem}
.label-light{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.6);margin-bottom:.6rem}
.gold-line{width:60px;height:1px;background:var(--or);margin:.8rem 0 1.2rem}
.card{background:#fff;border-radius:8px;padding:1.4rem 1.5rem;box-shadow:0 2px 20px rgba(0,0,0,.07)}
.card-sm{background:#fff;border-radius:6px;padding:1rem 1.2rem;box-shadow:0 1px 12px rgba(0,0,0,.06)}
.cdc-item{display:flex;gap:.75rem;padding:.65rem 0;border-bottom:.5px solid #eee}
.cdc-number{font-size:11px;color:var(--or);font-weight:500;min-width:22px;padding-top:2px}
.chip{display:inline-block;font-size:9px;letter-spacing:2px;text-transform:uppercase;background:var(--beige);color:var(--gris);padding:.25rem .6rem;border-radius:20px;margin-bottom:.5rem}
.nav-btn{position:fixed;bottom:1.8rem;background:var(--noir);color:#fff;border:none;border-radius:50%;width:42px;height:42px;cursor:pointer;font-size:16px;z-index:200;opacity:.85;transition:opacity .2s}
.nav-btn:hover{opacity:1}
.nav-prev{right:5.8rem}.nav-next{right:1.8rem}
.page-counter{position:fixed;bottom:2.3rem;right:9.8rem;font-size:11px;color:var(--gris);z-index:200}
@media print{
  body{overflow:visible}
  .nav-btn,.page-counter{display:none!important}
  .slide{display:flex!important;width:297mm;height:210mm;page-break-after:always;page-break-inside:avoid}
}
`

// ─── JS Navigation ───────────────────────────────────────────
const NAV_JS = `
let cur=0;
const slides=document.querySelectorAll('.slide');
const counter=document.getElementById('pc');
function show(n){
  slides.forEach((s,i)=>{s.classList.toggle('active',i===n)});
  cur=n; if(counter)counter.textContent=(n+1)+' / '+slides.length;
}
show(0);
document.getElementById('nxt').onclick=()=>cur<slides.length-1&&show(cur+1);
document.getElementById('prv').onclick=()=>cur>0&&show(cur-1);
document.addEventListener('keydown',e=>{
  if(e.key==='ArrowRight'&&cur<slides.length-1)show(cur+1);
  if(e.key==='ArrowLeft'&&cur>0)show(cur-1);
});
`

// ─── Slide 1 — Page de garde ─────────────────────────────────
function slide1(data: DevisHTMLData, images: Record<string, string>): string {
  const { form, ref } = data
  const pack = form.pack ? PACKS[form.pack] : null
  const dateStr = form.dateEvenement
    ? new Date(form.dateEvenement).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const bg = images.cover ? `<img class="bg-img" src="${images.cover}" alt=""/>` : ''
  return `<div class="slide active">
  ${bg}<div class="overlay"></div>
  <div class="content" style="align-items:center;text-align:center;gap:.4rem">
    <p class="label-light">Proposition Commerciale</p>
    <h1 style="font-size:clamp(2rem,5vw,3.5rem);color:#fff;line-height:1.1">Mariage ${form.prenomMarie}&nbsp;&amp;&nbsp;${form.prenomMariee}</h1>
    <div class="gold-line" style="margin:.8rem auto"></div>
    <p style="color:rgba(255,255,255,.75);font-size:.9rem;letter-spacing:1px">Pack ${pack?.nom ?? ''} &mdash; ${form.nombreInvites} invités</p>
    ${dateStr ? `<p style="color:rgba(255,255,255,.65);font-size:.82rem">${dateStr}${form.ville ? ' &bull; ' + form.ville : ''}</p>` : ''}
    <div class="card" style="margin-top:2rem;padding:1rem 2rem;text-align:left;max-width:420px">
      <p style="font-size:.72rem;color:var(--gris);margin-bottom:.3rem">Organisateur</p>
      <p style="font-size:.95rem;font-weight:500;color:var(--noir)">L&amp;Lui Signature</p>
      <p style="font-size:.78rem;color:var(--gris);margin-top:.15rem">+237 693 407 964 &bull; contact@l-et-lui.com</p>
      <div style="height:.5px;background:#eee;margin:.7rem 0"></div>
      <p style="font-size:.75rem;color:var(--gris)">Réf : <strong>${ref}</strong> &bull; Émis le ${today}</p>
      <p style="font-size:.72rem;color:var(--gris)">Valable 30 jours</p>
    </div>
  </div>
</div>`
}

// ─── Slide 2 — Introduction émotionnelle ────────────────────
function slide2(data: DevisHTMLData, images: Record<string, string>): string {
  const { form } = data
  const pack = form.pack ? PACKS[form.pack] : null
  const packKey = form.pack || 'PERLE'
  const intro = INTRODUCTIONS[packKey] || ''
  const paragraphs = intro.split('\n\n').filter(Boolean)
  const bg = images.traiteur || images.cover
  return `<div class="slide">
  <div class="content-row" style="grid-template-columns:1fr 420px">
    <div style="background:var(--beige);padding:4rem 3.5rem;display:flex;flex-direction:column;justify-content:center;overflow-y:auto">
      <p class="label">Lettre d'accompagnement</p>
      <h2 style="font-size:2.2rem;color:var(--noir);margin-bottom:.5rem">Une expérience unique</h2>
      <div class="gold-line"></div>
      ${paragraphs.map(p => `<p style="font-size:.82rem;color:#444;line-height:1.75;margin-bottom:.9rem">${p}</p>`).join('')}
      <div class="card" style="margin-top:1rem">
        <div class="chip">Pack ${pack?.nom ?? ''}</div>
        <ul style="list-style:none;padding:0;display:flex;flex-direction:column;gap:.35rem">
          ${(pack?.services ?? []).map(s => `<li style="font-size:.78rem;color:#555;display:flex;align-items:center;gap:.5rem"><span style="color:var(--or);font-size:.9rem">&#x2713;</span>${s}</li>`).join('')}
        </ul>
      </div>
    </div>
    <div style="position:relative;overflow:hidden">
      ${bg ? `<img src="${bg}" style="width:100%;height:100%;object-fit:cover" alt=""/>` : `<div style="width:100%;height:100%;background:#e8e0d0"></div>`}
    </div>
  </div>
</div>`
}

// ─── Slide 3 — Scénographie & Décoration ────────────────────
function slide3(data: DevisHTMLData, images: Record<string, string>): string {
  const { form } = data
  const pack = form.pack ? PACKS[form.pack] : null
  const cdcDeco = pack ? getCdcDecoration(pack.decoration) : ''
  const nuance = CATALOGUE.decoration.nuances.find(n => {
    if (pack?.decoration === 'N6') return n.prestige >= 7
    if (pack?.decoration === 'N4') return n.prestige >= 4
    if (pack?.decoration === 'N3') return n.prestige >= 3
    return n.prestige <= 2
  }) ?? CATALOGUE.decoration.nuances[0]
  const cdcs = [
    { n: '01', titre: 'Structure & Ambiance Spatiale', desc: 'Disposition des tables, couloirs de circulation, zones VIP et scène de réception adaptées au nombre d\'invités.' },
    { n: '02', titre: 'Concept Floral & Colorimétrie', desc: `Thème ${nuance.nom} — ${cdcDeco}` },
    { n: '03', titre: 'Art de la Table', desc: 'Nappage, vaisselle, centres de table, couverts et verres sélectionnés selon le niveau de prestige du pack.' },
    { n: '04', titre: 'Signalétique & Éclairage', desc: 'Plan de table, éclairage d\'ambiance LED, bougies, spots et éléments décoratifs lumineux.' },
  ]
  return `<div class="slide">
  <div class="content-row" style="grid-template-columns:1fr 380px">
    <div style="background:var(--beige);padding:3.5rem 3.5rem;overflow-y:auto">
      <p class="label">Concept &amp; Atmosphère</p>
      <h2 style="font-size:2rem;color:var(--noir);margin-bottom:.3rem">Scénographie : ${nuance.nom}</h2>
      <div class="gold-line"></div>
      <div style="display:flex;flex-direction:column;gap:.5rem;margin-top:.5rem">
        ${cdcs.map(c => `<div class="cdc-item"><span class="cdc-number">${c.n}</span><div><p style="font-size:.8rem;font-weight:500;color:var(--noir);margin-bottom:.2rem">${c.titre}</p><p style="font-size:.75rem;color:var(--gris);line-height:1.5">${c.desc}</p></div></div>`).join('')}
      </div>
    </div>
    <div style="display:flex;flex-direction:column">
      <div style="flex:1;overflow:hidden">${images.decoration ? `<img src="${images.decoration}" style="width:100%;height:100%;object-fit:cover" alt=""/>` : `<div style="width:100%;height:100%;background:#d8d0c0"></div>`}</div>
      <div style="flex:1;overflow:hidden;border-top:3px solid var(--beige)">${images.cover ? `<img src="${images.cover}" style="width:100%;height:100%;object-fit:cover" alt=""/>` : `<div style="width:100%;height:100%;background:#c8c0b0"></div>`}</div>
    </div>
  </div>
</div>`
}

// ─── Slide 4 — Restauration & Traiteur ──────────────────────
function slide4(data: DevisHTMLData, images: Record<string, string>): string {
  const { form } = data
  const pack = form.pack ? PACKS[form.pack] : null
  const cdcTraiteur = pack ? getCdcTraiteur(pack.traiteur) : ''
  const prestige = pack?.decoration === 'N6' ? 6 : pack?.decoration === 'N4' ? 4 : pack?.decoration === 'N3' ? 3 : 2
  const produits = CATALOGUE.traiteur.produits.filter(p => p.prestige <= prestige + 1).slice(0, 4)
  const cards = [
    { titre: 'Menu Principal', desc: cdcTraiteur || 'Service soigné adapté au nombre d\'invités et au standing du pack.' },
    { titre: 'Service & Personnel', desc: `Ratio encadrement optimisé — ${pack?.traiteur === 'N6' ? 'Gants blancs, cristal, sommelier dédié' : pack?.traiteur === 'N4' ? '1 serveur / 15 personnes, maîtres d\'hôtel' : '1 serveur / 20 personnes, dressage signature'}.` },
    { titre: 'Présentation & Dressage', desc: 'Mise en place soignée, nappage premium, vaisselle assortie au thème de décoration choisi.' },
  ]
  return `<div class="slide">
  <div class="content-row" style="grid-template-columns:400px 1fr">
    <div style="position:relative;overflow:hidden">${images.traiteur ? `<img src="${images.traiteur}" style="width:100%;height:100%;object-fit:cover" alt=""/>` : `<div style="width:100%;height:100%;background:#c0b090"></div>`}</div>
    <div style="background:#fff;padding:3.5rem 3rem;overflow-y:auto">
      <p class="label">Gastronomie &amp; Service</p>
      <h2 style="font-size:2rem;color:var(--noir);margin-bottom:.3rem">Excellence Culinaire</h2>
      <div class="gold-line"></div>
      <p style="font-size:.78rem;color:var(--gris);margin-bottom:1rem">Niveau de service : <strong>${cdcTraiteur}</strong></p>
      <p style="font-size:.75rem;font-weight:500;color:var(--gris);margin-bottom:.5rem;text-transform:uppercase;letter-spacing:1px">Produits phares</p>
      <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:1.2rem">
        ${produits.map(p => `<span class="chip">${p.nom}</span>`).join('')}
      </div>
      <div style="display:flex;flex-direction:column;gap:.75rem">
        ${cards.map(c => `<div class="card-sm"><p style="font-size:.8rem;font-weight:500;color:var(--noir);margin-bottom:.25rem">${c.titre}</p><p style="font-size:.74rem;color:var(--gris);line-height:1.5">${c.desc}</p></div>`).join('')}
      </div>
    </div>
  </div>
</div>`
}

// ─── Slide 5 — Pôle Image & Mémoires ────────────────────────
function slide5(data: DevisHTMLData, images: Record<string, string>): string {
  const { form } = data
  const pack = form.pack ? PACKS[form.pack] : null
  const hasDrone = pack?.services.some(s => s.toLowerCase().includes('drone'))
  const hasVideo = pack?.services.some(s => s.toLowerCase().includes('vid'))
  const cards = [
    { titre: 'Reportage Complet', desc: 'Couverture intégrale de la journée — préparatifs, cérémonie, vin d\'honneur, soirée. Livraison galerie privée en ligne.' },
    { titre: hasDrone ? 'Cinéma Aérien Drone' : 'Séance Portraits', desc: hasDrone ? 'Prises de vue aériennes de la cérémonie et du site. Drone 4K, autorisations incluses.' : 'Séance portraits du couple et des familles dans les plus beaux cadres du lieu.' },
    { titre: hasVideo ? 'Film Cinématique' : 'Album Premium', desc: hasVideo ? 'Montage vidéo cinématique avec musique choisie par les mariés, livré en 4K dans les 30 jours.' : 'Album photo premium tirage argentique, couverture personnalisée.' },
  ]
  return `<div class="slide" style="background:var(--noir)">
  <div class="content" style="justify-content:center;gap:0">
    <div style="text-align:center;margin-bottom:2.5rem">
      <p class="label-light">Souvenirs Éternels</p>
      <h2 style="font-size:2.2rem;color:#fff;margin-bottom:.3rem">Pôle Image &amp; Mémoires</h2>
      <div class="gold-line" style="margin:.7rem auto"></div>
      <p style="color:rgba(255,255,255,.55);font-size:.82rem">${pack?.nom ?? ''} — Pôle Multimédia</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;max-width:900px;margin:0 auto">
      ${cards.map(c => `<div class="card" style="text-align:center"><div style="width:36px;height:36px;background:var(--beige);border-radius:50%;margin:0 auto .8rem;display:flex;align-items:center;justify-content:center"><span style="color:var(--or);font-size:1rem">&#x2665;</span></div><p style="font-size:.85rem;font-weight:500;color:var(--noir);margin-bottom:.5rem">${c.titre}</p><p style="font-size:.75rem;color:var(--gris);line-height:1.5">${c.desc}</p></div>`).join('')}
    </div>
  </div>
</div>`
}

// ─── Slide 6 — Animation & Ingénierie Sonore ────────────────
function slide6(data: DevisHTMLData, images: Record<string, string>): string {
  const { form } = data
  const pack = form.pack ? PACKS[form.pack] : null
  const hasOrchestre = pack?.services.some(s => s.toLowerCase().includes('orchestre'))
  const items = [
    { titre: hasOrchestre ? 'Orchestre Live' : 'DJ & Sonorisation', desc: hasOrchestre ? 'Orchestre live avec musiciens professionnels — set Jazz/Afrobeat/Coupé-Décalé selon votre programme. Ingénieur du son dédié.' : 'DJ professionnel, sonorisation haute qualité, micros de cérémonie, éclairage scène inclus.' },
    { titre: 'Maître de Cérémonie', desc: 'Animation des temps forts : entrée des mariés, toast, ouverture du bal, discours. Coordination avec les prestataires en temps réel.' },
    { titre: 'Clôture Harmonieuse', desc: 'Programme de clôture soigné — dernier slow, remerciements, départ des mariés. Coordination avec le traiteur pour le timing café/dessert.' },
  ]
  return `<div class="slide" style="background:var(--beige)">
  <div class="content" style="justify-content:center">
    <div style="text-align:center;margin-bottom:2rem">
      <p class="label">Rythme &amp; Harmonie</p>
      <h2 style="font-size:2.2rem;color:var(--noir);margin-bottom:.3rem">Animation &amp; Ingénierie Sonore</h2>
      <div class="gold-line" style="margin:.7rem auto"></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;max-width:900px;margin:0 auto">
      ${items.map(it => `<div class="card"><div style="width:8px;height:8px;background:var(--or);border-radius:50%;margin-bottom:1rem"></div><p style="font-size:.85rem;font-weight:500;color:var(--noir);margin-bottom:.5rem">${it.titre}</p><p style="font-size:.75rem;color:var(--gris);line-height:1.6">${it.desc}</p></div>`).join('')}
    </div>
  </div>
</div>`
}

// ─── Assembleur principal ────────────────────────────────────
export function generateDevisHTML(data: DevisHTMLData, images: Record<string, string>): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Proposition — ${data.ref}</title>
<style>${CSS}</style></head><body>
${slide1(data, images)}
${slide2(data, images)}
${slide3(data, images)}
${slide4(data, images)}
${slide5(data, images)}
${slide6(data, images)}
<!-- SLIDES_7_12 -->
<button class="nav-btn nav-prev" id="prv">&#8592;</button>
<button class="nav-btn nav-next" id="nxt">&#8594;</button>
<span class="page-counter" id="pc"></span>
<script>${NAV_JS}</script></body></html>`
}
