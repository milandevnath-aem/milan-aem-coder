/* eslint-disable */
// Generates content/<slug>.plain.html for each extracted page, using the
// project's Universal Editor block structures.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire('/home/node/.excat-marketplaces/excat-extended/excat-figma/tools/excat-figma-mcp/node_modules/');
const sharp = require('sharp');
const REPO = new URL('../../', import.meta.url).pathname;

const PAGES = {
  'car-loan': { breadcrumb: 'New car finance' },
  'two-wheeler-loan': { breadcrumb: 'Two wheeler finance' },
  'loan-against-property': { breadcrumb: 'Loan against property' },
  'dealer-finance': { breadcrumb: 'Dealer Finance' },
  'top-up-loan': { breadcrumb: 'Top-up loans' },
  'car-lease': { breadcrumb: 'Car lease' },
  'used-car-loan': { breadcrumb: 'Used Car' },
  'about-us': { breadcrumb: 'About us' },
  'contact-us': { breadcrumb: 'Contact us' },
};

const CATEGORIES = ['New Car Finance', 'Used Car & Re-finance', 'Two-Wheeler Loan', 'Top-Up Loan', 'Car Lease', 'Dealer Finance', 'Loan Against Property'];

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// **bold** runs -> <strong>
const rich = (s = '') => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const img = (src, alt = '') => (src ? `<picture><img src="${src}" alt="${esc(alt)}"></picture>` : '');
const cell = (html = '') => `<div>${html}</div>`;
const row = (...cells) => `<div>${cells.map(cell).join('')}</div>`;
const block = (cls, rows) => `<div class="${cls}">${rows.join('')}</div>`;
const section = (...parts) => `<div>${parts.join('')}</div>`;
const sectionMeta = (style) => block('section-metadata', [row('style', style)]);
const link = (text, href = '#') => `<p class="button-container"><a href="${href}" title="${esc(text)}">${esc(text)}</a></p>`;
const cta = (text, href = '#') => `<p><strong><a href="${href}">${esc(text)}</a></strong></p>`;

function local(slug, file) {
  if (!file) return null;
  const name = file.replace(/^raw\//, '');
  return existsSync(join(REPO, 'content/images', slug, name)) ? `./images/${slug}/${name}` : null;
}
function cleaned(slug, s, bp) {
  const v = s[bp];
  if (!v?.image) return null;
  if (v.separateImage) return local(slug, `${s.type}-${s.order}-${bp}.png`);
  return local(slug, `${s.type}-${s.order}-${bp}.jpg`);
}

async function isDark(slug, s) {
  const v = s.desktop;
  const file = cleaned(slug, s, 'desktop');
  if (!file || !v?.textBoxes?.length) return false;
  const path = join(REPO, 'content', file);
  const meta = await sharp(path).metadata();
  const scale = meta.width / 1366;
  const [x, y, w, h] = v.textBoxes[0];
  const left = Math.max(0, Math.round(x * scale)); const top = Math.max(0, Math.round(y * scale));
  const width = Math.min(meta.width - left, Math.round(w * scale)); const height = Math.min(meta.height - top, Math.round(h * scale));
  const stats = await sharp(path).extract({ left, top, width, height }).stats();
  const lum = 0.2126 * stats.channels[0].mean + 0.7152 * stats.channels[1].mean + 0.0722 * stats.channels[2].mean;
  return lum < 110;
}

const heading = (c) => [c.heading ? `<h2>${rich(c.heading)}</h2>` : '', c.subheading ? `<p>${rich(c.subheading)}</p>` : ''].join('');

async function heroBlock(slug, s, page) {
  const c = s.content;
  const desktop = cleaned(slug, s, 'desktop');
  const mobile = cleaned(slug, s, 'mobile');
  if (c.form) {
    const selected = c.form.selectedCategory;
    const cats = [selected, ...CATEGORIES.filter((x) => x.toLowerCase() !== String(selected).toLowerCase())].filter(Boolean);
    const fields = (c.form.fields || []).map((f) => f.replace(/\s*\(.*\)\s*$/, '')).join(', ');
    return block('hero-loan product', [
      row(`<h2>${esc(c.form.heading)}</h2><p>${esc(c.form.description || '')}</p>`),
      row(`<p>${esc(cats.join(', '))}</p><p>${esc(fields)}</p>`),
      row(link(c.form.button || 'Apply now')),
      row(img(desktop), img(mobile), `<h1>${rich(c.title)}</h1><p>${rich(c.subtitle || '')}</p>${cta(c.mobileButton || c.form.button || 'Apply now')}`),
    ]);
  }
  // no form: plain hero, optional stat badges
  const icons = { Network: 'network', Presence: 'location' };
  const stats = (c.stats || []).map((st) => `<li><span class="icon icon-${icons[st.label] || 'info'}"></span>${esc(st.label)}: ${esc(st.value)}</li>`).join('');
  return block('hero-loan plain', [row(''), row(''), row(''),
    row(img(desktop), img(mobile), `<h1>${rich(c.title)}</h1><p>${rich(c.subtitle || '')}</p>${stats ? `<ul>${stats}</ul>` : ''}`)]);
}

async function bannerItem(slug, s) {
  const c = s.content;
  const side = !!s.desktop?.separateImage;
  const align = /right/.test(c.align || '') ? 'right' : 'left';
  const light = side ? false : await isDark(slug, s);
  let text = '';
  if (c.heading) text += `<h2>${rich(c.heading)}</h2>`;
  else if (c.text) text += `<h2>${rich(c.text)}</h2>`;
  if (c.heading && c.text) text += `<p>${rich(c.text)}</p>`;
  if (c.text2) text += `<p>${rich(c.text2)}</p>`;
  if (c.cta) text += cta(c.cta);
  return row(img(cleaned(slug, s, 'desktop')), img(side ? null : cleaned(slug, s, 'mobile')), text,
    `<p>${align}</p><p>${light ? 'light' : 'dark'}</p><p>${side ? 'side' : 'background'}</p>`);
}

function featureCards(slug, s) {
  const c = s.content;
  const variant = c.variant === 'numbered' ? 'numbered' : c.variant === 'split' ? 'split' : c.variant === 'info' ? 'info' : '';
  const rows = [];
  const parts = [];
  if (variant === 'split') {
    rows.push(row(`<h2>${rich(c.heading)}</h2>${c.cta ? cta(c.cta) : ''}${c.disclaimer ? `<p>${esc(c.disclaimer)}</p>` : ''}`));
    const big = c.bigImageCard;
    if (big) rows.push(row(img(local(slug, big.desktopImage), ''), '', '<p>image</p>'));
  } else {
    rows.push(row(''));
    if (c.heading) parts.push(heading(c));
  }
  (c.cards || []).forEach((card) => {
    if (variant === 'info') {
      const pairs = card.fields.map((f) => `<p>${esc(f.label)}</p><p><strong>${esc(f.value)}</strong></p>`).join('');
      rows.push(row(img(local(slug, card.icon)), pairs, '<p>icon</p>'));
      return;
    }
    const isMedia = card.size === 'large-image' && card.image;
    let picture = '';
    if (isMedia) picture = img(local(slug, card.image.replace('.png', '.jpg')) || local(slug, card.image));
    else if (card.icon) {
      const iconMap = { 'Outlined-Car': 'icon-car.svg', 'Outlined-Upload Image': 'icon-services.svg', 'Outlined-Document Check': 'icon-document-check.svg', 'Outlined-Interest': 'icon-interest.svg', 'Outlined-Show': 'icon-show.svg' };
      picture = img(local(slug, iconMap[card.icon] || card.icon));
    }
    rows.push(row(picture, `<h3>${rich(card.title)}</h3>${card.text ? `<p>${rich(card.text)}</p>` : ''}`, `<p>${isMedia ? 'image' : 'icon'}</p>`));
  });
  return [parts.join(''), block(variant ? `feature-cards ${variant}` : 'feature-cards', rows)];
}

function requirements(slug, s, fallbackIcons) {
  const c = s.content;
  const docs = c.variant === 'documents';
  const rows = [];
  const deco = docs && (c.decorativeImage && c.decorativeImage !== null) && /car-loan|top-up|used-car/.test(slug);
  rows.push(row(deco ? img('./images/shared/documents-decoration.png') : ''));
  const panels = c.panels || null;
  const add = (tab, cards, intro) => {
    if (intro) rows.push(row(esc(tab), '', '', intro));
    (cards || []).forEach((card, i) => {
      if (docs) {
        rows.push(row(esc(tab), '', esc(card.title), `<ul>${card.items.map((it) => `<li>${esc(it)}</li>`).join('')}</ul>`));
      } else {
        const icon = local(slug, card.icon) || fallbackIcons[i % fallbackIcons.length];
        rows.push(row(esc(tab), img(icon), esc(card.label), `<p>${esc(card.value)}</p>`));
      }
    });
  };
  if (panels && Object.keys(panels).length && !(Object.keys(panels).every((k) => /^type \d/i.test(k)))) {
    Object.entries(panels).forEach(([tab, panel]) => {
      if (!panel) return;
      const cards = Array.isArray(panel) ? panel : panel.columns || (panel.title ? [panel] : []);
      const intro = c.subHeading && tab === Object.keys(panels)[0] ? `<h3>${esc(c.subHeading)}</h3><p>${esc(c.subText || '')}</p>` : '';
      add(tab, cards, intro);
    });
  } else if (panels) {
    // "Type 1/2/3" columns shown side by side, no tabs
    add('', Object.values(panels).filter(Boolean).map((p) => (Array.isArray(p) ? p[0] : p)));
  } else {
    add('', c.cards);
  }
  const head = `<h2>${esc(c.heading)}</h2>${c.subheading ? `<p>${esc(c.subheading)}</p>` : ''}`;
  return [head, block(docs ? 'requirements documents' : 'requirements eligibility', rows)];
}

function needHelp(slug, s) {
  const c = s.content;
  const text = `<h2>${esc(c.heading)}</h2><p>${esc(c.text)}</p>${(c.buttons || []).map((b) => cta(b)).join('')}`;
  return block('offers', [row(img(cleaned(slug, s, 'desktop')), text, '', '<p>short</p><p>light</p>')]);
}

function faq(s) {
  const c = s.content;
  const rows = [row(`<h2>${esc(c.heading || 'Frequently asked questions')}</h2>`)];
  (c.items || []).forEach((it) => rows.push(row(esc(it.q), it.a ? `<p>${esc(it.a)}</p>` : '')));
  return block('faq', rows);
}

function columnsText(s) {
  const c = s.content;
  let html = c.html || '';
  if (c.link) html += `<p><a href="${c.link.href}">${esc(c.link.text)}</a></p>`;
  return block('columns', [row(`<h2>${esc(c.heading)}</h2>`, html)]);
}

function team(slug, s) {
  return block('team', s.content.people.map((p) => row(img(local(slug, p.photo), p.name),
    `<p>${esc(p.din)}</p><h3>${esc(p.name)}</h3>${p.role.split('\n').map((r) => `<p>${esc(r.trim())}</p>`).join('')}`)));
}

function branchLocator(s) {
  const c = s.content;
  const phone = [c.phone, c.tollFree ? `Toll-Free: ${c.tollFree}` : ''].filter(Boolean).join(' / ');
  return block('branch-locator', [
    row(`<h1>${esc(c.heading)}</h1><p>${esc(c.text)}</p>`),
    row(esc(c.city), `<p>${esc(c.address)}</p><p>${esc(phone)}</p><p>${esc(c.timing)}</p><p>${esc(c.email)}</p>`),
  ]);
}

for (const [slug, page] of Object.entries(PAGES)) {
  const data = JSON.parse(readFileSync(join(REPO, 'reference/pages', slug, 'extraction.json')));
  const sections = [...data.sections].sort((a, b) => a.order - b.order);
  const fallbackIcons = ['./images/car-loan/req-icon-1.png', './images/car-loan/req-icon-2.png', './images/car-loan/req-icon-3.png'];
  const out = [];
  let banners = [];
  let title = data.title;
  const flushBanners = () => {
    if (banners.length) out.push(section(block('feature-banner', banners)));
    banners = [];
  };
  for (const s of sections) {
    if (s.type === 'banner') { banners.push(await bannerItem(slug, s)); continue; }
    flushBanners();
    if (s.type === 'hero') { out.push(section(await heroBlock(slug, s, page))); title = s.content.title || title; }
    else if (s.type === 'intro-text') out.push(section(`<p>${esc(s.content.text)}</p>`, sectionMeta('brand')));
    else if (s.type === 'feature-cards') {
      const [head, b] = featureCards(slug, s);
      const prev = out[out.length - 1];
      // About us: info cards share the section with the preceding profile text
      if (s.content.variant === 'info' && prev) out[out.length - 1] = prev.replace(/<\/div>$/, `${b}</div>`);
      else out.push(section(head, b));
    } else if (s.type === 'requirements') out.push(section(...requirements(slug, s, fallbackIcons)));
    else if (s.type === 'need-help') out.push(section(needHelp(slug, s)));
    else if (s.type === 'faq') out.push(section(faq(s)));
    else if (s.type === 'columns-text') out.push(section(columnsText(s)));
    else if (s.type === 'team') {
      const prev = out[out.length - 1];
      out[out.length - 1] = prev.replace(/<\/div>$/, `${team(slug, s)}</div>`);
    } else if (s.type === 'branch-locator') out.push(section(branchLocator(s)));
    else console.warn('unhandled', slug, s.type);
  }
  flushBanners();
  const hero = sections.find((s) => s.type === 'hero');
  out.push(section(block('metadata', [
    row('title', `${esc(title)} | Kotak Prime`),
    row('description', esc(hero?.content?.subtitle || sections[0]?.content?.text || title)),
    row('breadcrumb', esc(page.breadcrumb)),
    row('nav', '/content/fragments/nav'),
    row('footer', '/content/fragments/footer'),
  ])));
  writeFileSync(join(REPO, 'content', `${slug}.plain.html`), `${out.join('\n')}\n`);
  console.log('wrote', slug, out.length, 'sections');
}
