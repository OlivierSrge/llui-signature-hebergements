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

// ─── Slide 7 — Services Exclusifs & Logistique ──────────────
function slide7(data: DevisHTMLData, images: Record<string, string>): string {
  const { form } = data
  const pack = form.pack ? PACKS[form.pack] : null
  const hasFlotte = pack?.services.some(s => s.toLowerCase().includes('flotte'))
  const cards = [
    { titre: 'Coordination Événement', desc: 'Chef de projet dédié — présent du J-90 au Jour J. Planning détaillé, suivi prestataires, répétition cérémonie, gestion imprévus.' },
    { titre: hasFlotte ? 'Flotte Véhicules Prestige' : 'Transport & Véhicules', desc: hasFlotte ? 'Flotte de véhicules prestige pour les mariés et la famille proche — chauffeurs en livrée, décoration florale des véhicules.' : 'Voiture de mariage pour les mariés, coordination des navettes invités si nécessaire.' },
    { titre: 'Services Additionnels', desc: `${pack?.services.filter(s => s.includes('Conciergerie') || s.includes('Cadeaux') || s.includes('Chaises')).join(' — ') || 'Accueil VIP, mise en place advance, démontage et restitution des lieux.'}` },
  ]
  return `<div class="slide" style="background:var(--beige)">
  <div class="content" style="justify-content:center">
    <div style="text-align:center;margin-bottom:2rem">
      <p class="label">Excellence &amp; Privilèges</p>
      <h2 style="font-size:2.2rem;color:var(--noir);margin-bottom:.3rem">Services Exclusifs &amp; Gestion</h2>
      <div class="gold-line" style="margin:.7rem auto"></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;max-width:900px;margin:0 auto">
      ${cards.map(c => `<div class="card"><div style="width:8px;height:3px;background:var(--or);margin-bottom:1rem"></div><p style="font-size:.85rem;font-weight:500;color:var(--noir);margin-bottom:.5rem">${c.titre}</p><p style="font-size:.75rem;color:var(--gris);line-height:1.6">${c.desc}</p></div>`).join('')}
    </div>
  </div>
</div>`
}

// ─── Slide 8 — CDC Décoration (détail 2×2) ──────────────────
function slide8(data: DevisHTMLData, _images: Record<string, string>): string {
  const { form } = data
  const pack = form.pack ? PACKS[form.pack] : null
  const cdcDeco = pack ? getCdcDecoration(pack.decoration) : ''
  const blocs = [
    { n: '01', titre: 'Structure & Ambiance Spatiale', desc: 'Implantation des tables rondes ou rectangulaires, allées de circulation de 1,50 m minimum, positionnement estrade mariés, scène DJ/orchestre et piste de danse. Configuration adaptée aux lieux de réception.' },
    { n: '02', titre: 'Art de la Table — Minimalisme Stylisé', desc: `Nappage en tissu premium, chemin de table en organza ou en lin selon thème. Centres de table : ${cdcDeco}. Vaisselle assortie, couverts inox ou dorés selon pack.` },
    { n: '03', titre: 'Concept Floral & Colorimétrie', desc: `${cdcDeco} — Arche florale pour la cérémonie et/ou la réception. Compositions florales de table avec fleurs fraîches ou séchées. Palette chromatique définie avec les mariés lors du brief déco.` },
    { n: '04', titre: 'Signalétique & Éclairage', desc: 'Plan de table calligraphié, menus individuels, étiquettes de table. Éclairage : bougies LED longue durée, guirlandes lumineuses, spots directionnels sur la table des mariés.' },
  ]
  return `<div class="slide" style="background:#fff">
  <div class="content" style="padding:2.5rem 5vw;justify-content:flex-start">
    <p class="label" style="margin-bottom:.3rem">Technique &amp; Style</p>
    <h2 style="font-size:1.9rem;color:var(--noir);margin-bottom:.5rem">Cahier des Charges Décoration</h2>
    <div class="gold-line"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.2rem;margin-top:1rem;flex:1">
      ${blocs.map(b => `<div style="background:var(--beige);border-radius:8px;padding:1.4rem"><p style="font-size:1.6rem;font-family:'Cormorant Garamond',serif;color:var(--or);margin-bottom:.4rem">${b.n}</p><p style="font-size:.82rem;font-weight:500;color:var(--noir);margin-bottom:.4rem">${b.titre}</p><p style="font-size:.74rem;color:var(--gris);line-height:1.6">${b.desc}</p></div>`).join('')}
    </div>
  </div>
</div>`
}

// ─── Slide 9 — Récapitulatif Budgétaire ─────────────────────
function slide9(data: DevisHTMLData, _images: Record<string, string>): string {
  const { form, totaux } = data
  const pack = form.pack ? PACKS[form.pack] : null
  const cats = [
    { label: 'Restauration & Traiteur', val: pack ? Math.round(pack.prixBase * 0.40) : 0 },
    { label: 'Décoration & Scénographie', val: pack ? Math.round(pack.prixBase * 0.30) : 0 },
    { label: 'Image & Beauté', val: pack ? Math.round(pack.prixBase * 0.15) : 0 },
    { label: 'Logistique & Lieux', val: (pack ? Math.round(pack.prixBase * 0.15) : 0) + totaux.totalLieux },
  ]
  const optionsSel = CATALOGUE.optionsALaCarte.filter(o => form.optionsSelectionnees.includes(o.nom))
  const boutiqueSel = CATALOGUE.optionsBoutique.filter(o => form.optionsBoutiqueSelectionnees.includes(o.nom))
  const row = (label: string, val: string, bold = false, gold = false) =>
    `<div style="display:flex;justify-content:space-between;padding:.55rem 0;border-bottom:.5px solid #eee"><span style="font-size:${bold ? '.85' : '.8'}rem;${gold ? 'color:var(--or);' : 'color:#555;'}${bold ? 'font-weight:500' : ''}">${label}</span><span style="font-size:${bold ? '.85' : '.8'}rem;font-weight:${bold ? '600' : '400'};${gold ? 'color:var(--or)' : 'color:var(--noir)'}">${val}</span></div>`
  return `<div class="slide" style="background:var(--beige)">
  <div class="content" style="padding:2.5rem 5vw;justify-content:flex-start">
    <p class="label">Finances</p>
    <h2 style="font-size:1.9rem;color:var(--noir);margin-bottom:.5rem">Récapitulatif Budgétaire</h2>
    <div class="gold-line"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-top:1rem">
      <div class="card">
        ${cats.map(c => row(c.label, formatFCFA(c.val))).join('')}
        ${optionsSel.map(o => row('+ ' + o.nom, formatFCFA(o.prix))).join('')}
        <div style="height:.5px;background:var(--gris);opacity:.3;margin:.5rem 0"></div>
        ${row('Sous-total prestations', formatFCFA(totaux.sousTotalPrestations))}
        ${row('Honoraires L&amp;Lui (10%)', formatFCFA(totaux.honoraires))}
        <div style="display:flex;justify-content:space-between;padding:.8rem 0;background:var(--or);margin-top:.5rem;border-radius:4px;padding-left:.8rem;padding-right:.8rem">
          <span style="font-size:.9rem;font-weight:600;color:var(--noir)">TOTAL TTC</span>
          <span style="font-size:.9rem;font-weight:700;color:var(--noir)">${formatFCFA(totaux.totalTTC)}</span>
        </div>
        ${totaux.totalBoutique > 0 ? `<div style="background:#fffaf0;border-radius:4px;padding:.7rem;margin-top:.6rem"><p style="font-size:.7rem;color:#a06000;font-weight:500;margin-bottom:.3rem">OPTIONS BOUTIQUE (hors total)</p>${boutiqueSel.map(o => row(o.nom, formatFCFA(o.prix))).join('')}<div style="display:flex;justify-content:space-between;margin-top:.3rem"><span style="font-size:.8rem;font-weight:600;color:#a06000">Total boutique</span><span style="font-size:.8rem;font-weight:700;color:#a06000">${formatFCFA(totaux.totalBoutique)}</span></div></div>` : ''}
      </div>
      <div>
        <p style="font-size:.75rem;font-weight:500;text-transform:uppercase;letter-spacing:1px;color:var(--gris);margin-bottom:.8rem">Échéancier de paiement</p>
        ${totaux.echeancier.map((e, i) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:.8rem 1rem;background:${i % 2 === 0 ? '#fff' : 'rgba(255,255,255,.6)'};border-radius:6px;margin-bottom:.4rem"><span style="font-size:.8rem;color:#555">${e.pourcentage}% &mdash; ${e.label}</span><span style="font-size:.85rem;font-weight:600;color:var(--noir)">${formatFCFA(e.montant)}</span></div>`).join('')}
        ${form.notes ? `<div class="card-sm" style="margin-top:1.2rem"><p style="font-size:.7rem;text-transform:uppercase;letter-spacing:1px;color:var(--gris);margin-bottom:.3rem">Notes</p><p style="font-size:.78rem;color:#555;line-height:1.5;font-style:italic">${form.notes}</p></div>` : ''}
      </div>
    </div>
  </div>
</div>`
}

// ─── Slide 10 — L&Lui Hébergements & Boutique ───────────────
function slide10(_data: DevisHTMLData, images: Record<string, string>): string {
  const col = (title: string, text: string, link: string, btnLabel: string, img: string) =>
    `<div style="display:flex;flex-direction:column;gap:0;overflow:hidden;border-radius:8px;box-shadow:0 2px 20px rgba(0,0,0,.08)">
      <div style="height:200px;overflow:hidden">${img ? `<img src="${img}" style="width:100%;height:100%;object-fit:cover" alt=""/>` : `<div style="width:100%;height:100%;background:#c0b090"></div>`}</div>
      <div style="padding:1.5rem;background:#fff;flex:1">
        <p style="font-size:.85rem;font-weight:500;color:var(--noir);margin-bottom:.5rem">${title}</p>
        <p style="font-size:.76rem;color:var(--gris);line-height:1.6;margin-bottom:1rem">${text}</p>
        <p style="font-size:.7rem;color:var(--or)">${link}</p>
      </div>
      <div style="background:var(--noir);padding:.7rem 1.5rem;text-align:center"><span style="font-size:.75rem;color:#fff;letter-spacing:1px">${btnLabel}</span></div>
    </div>`
  return `<div class="slide" style="background:var(--beige)">
  <div class="content" style="padding:2.5rem 5vw;justify-content:flex-start">
    <p class="label">Nos Autres Services</p>
    <h2 style="font-size:1.9rem;color:var(--noir);margin-bottom:.5rem">L'Univers Complet L&amp;Lui Signature</h2>
    <div class="gold-line"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-top:1rem">
      ${col('Hébergements Premium à Kribi', 'Offrez à vos invités une expérience de séjour inoubliable dans nos résidences sélectionnées au bord de l\'Atlantique. Villas d\'exception, lodges de charme, suites privées — L&amp;Lui Signature sélectionne pour vous les plus belles adresses de Kribi.', 'llui-signature-hebergements.vercel.app', 'Découvrir nos hébergements', images.hebergement || '')}
      ${col('Boutique L&amp;Lui Signature', 'Retrouvez notre sélection exclusive d\'accessoires de mariage, décorations sur mesure, faire-parts premium et packs cadeaux. Tout l\'univers L&amp;Lui à portée de clic, livrable partout au Cameroun.', 'letlui-signature.netlify.app', 'Visiter la boutique', images.boutique || '')}
    </div>
    <div style="background:var(--or);border-radius:6px;padding:.8rem 1.5rem;margin-top:1rem;text-align:center"><p style="font-size:.78rem;color:var(--noir)">Bénéficiez de votre code promo L&amp;Lui Stars sur tous vos achats boutique — consultez votre niveau fidélité sur <strong>llui-signature-hebergements.vercel.app/mon-compte</strong></p></div>
  </div>
</div>`
}

// ─── Slide 11 — Conditions financières & paiement ───────────
function slide11(_data: DevisHTMLData, _images: Record<string, string>): string {
  const { cameroun, france, om, revolut } = LLUI_CONFIG.paiement
  const conds = [
    'Cette proposition est valable 30 jours à compter de sa date d\'émission.',
    'Tout acompte versé est non remboursable en cas d\'annulation par le client.',
    'L&Lui Signature se réserve le droit de substituer un prestataire en cas d\'indisponibilité.',
    'Les prix sont exprimés en Francs CFA (FCFA) et sont fermes pour la durée de validité.',
    'Les options boutique (alcools) sont soumises à réglementation locale en vigueur.',
  ]
  const payRow = (label: string, val: string) =>
    `<div style="display:flex;gap:1rem;padding:.5rem 0;border-bottom:.5px solid #eee"><span style="font-size:.76rem;color:var(--gris);min-width:100px">${label}</span><span style="font-size:.76rem;color:var(--noir);font-weight:500">${val}</span></div>`
  return `<div class="slide" style="background:var(--beige)">
  <div class="content" style="padding:2.5rem 5vw;justify-content:flex-start">
    <p class="label">Conditions Générales</p>
    <h2 style="font-size:1.9rem;color:var(--noir);margin-bottom:.5rem">Modalités de Règlement</h2>
    <div class="gold-line"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-top:1rem">
      <div style="display:flex;flex-direction:column;gap:1rem">
        <div class="card-sm"><p style="font-size:.75rem;font-weight:500;text-transform:uppercase;letter-spacing:1px;color:var(--gris);margin-bottom:.6rem">Cameroun — BICEC</p>${payRow('Banque', cameroun.banque)}${payRow('IBAN / RIB', cameroun.iban)}${payRow('Bénéficiaire', LLUI_CONFIG.enseigne)}</div>
        <div class="card-sm"><p style="font-size:.75rem;font-weight:500;text-transform:uppercase;letter-spacing:1px;color:var(--gris);margin-bottom:.6rem">France / Europe — Revolut</p>${payRow('IBAN', france.iban)}${payRow('Bénéficiaire', LLUI_CONFIG.enseigne)}</div>
        <div class="card-sm"><p style="font-size:.75rem;font-weight:500;text-transform:uppercase;letter-spacing:1px;color:var(--gris);margin-bottom:.6rem">Paiement Mobile</p>${payRow('Orange Money', om)}${payRow('Revolut', revolut)}</div>
      </div>
      <div>
        <p style="font-size:.75rem;font-weight:500;text-transform:uppercase;letter-spacing:1px;color:var(--gris);margin-bottom:.8rem">Conditions générales</p>
        <ul style="list-style:none;display:flex;flex-direction:column;gap:.6rem">
          ${conds.map(c => `<li style="font-size:.76rem;color:#555;line-height:1.5;display:flex;gap:.6rem"><span style="color:var(--or);flex-shrink:0">—</span>${c}</li>`).join('')}
        </ul>
        <div style="margin-top:1.5rem;padding-top:1rem;border-top:.5px solid #ccc">
          <p style="font-size:.72rem;color:var(--gris)">NIU : ${LLUI_CONFIG.niu} &bull; RCCM : ${LLUI_CONFIG.rccm}</p>
          <p style="font-size:.72rem;color:var(--gris);margin-top:.2rem">${LLUI_CONFIG.adresse}</p>
        </div>
      </div>
    </div>
  </div>
</div>`
}

// ─── Slide 12 — Page de clôture ─────────────────────────────
function slide12(_data: DevisHTMLData, images: Record<string, string>): string {
  const bg = images.closing || images.cover
  return `<div class="slide">
  ${bg ? `<img class="bg-img" src="${bg}" alt=""/>` : ''}
  <div class="overlay"></div>
  <div class="content" style="align-items:center;text-align:center;gap:.8rem">
    <div class="gold-line" style="margin:0 auto"></div>
    <h1 style="font-size:clamp(2rem,4.5vw,3rem);color:#fff;line-height:1.2">Merci de votre confiance</h1>
    <p style="font-size:1rem;color:rgba(255,255,255,.75);max-width:500px;line-height:1.7;font-style:italic">"Nous mettons tout notre savoir-faire au service de votre bonheur."</p>
    <div class="gold-line" style="margin:.8rem auto"></div>
    <p style="font-size:1rem;font-weight:500;color:var(--or);letter-spacing:2px">L&amp;Lui Signature</p>
    <p style="font-size:.82rem;color:rgba(255,255,255,.6)">${LLUI_CONFIG.email} &bull; ${LLUI_CONFIG.telephone}</p>
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
${slide7(data, images)}
${slide8(data, images)}
${slide9(data, images)}
${slide10(data, images)}
${slide11(data, images)}
${slide12(data, images)}
<button class="nav-btn nav-prev" id="prv">&#8592;</button>
<button class="nav-btn nav-next" id="nxt">&#8594;</button>
<span class="page-counter" id="pc"></span>
<script>${NAV_JS}</script></body></html>`
}
