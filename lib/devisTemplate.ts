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

// ─── Assembleur principal ────────────────────────────────────
export function generateDevisHTML(data: DevisHTMLData, images: Record<string, string>): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Proposition — ${data.ref}</title>
<style>${CSS}</style></head><body>
${slide1(data, images)}
${slide2(data, images)}
<!-- SLIDES_3_12 -->
<button class="nav-btn nav-prev" id="prv">&#8592;</button>
<button class="nav-btn nav-next" id="nxt">&#8594;</button>
<span class="page-counter" id="pc"></span>
<script>${NAV_JS}</script></body></html>`
}
