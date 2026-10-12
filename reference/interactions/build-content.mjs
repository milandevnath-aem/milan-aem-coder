/* eslint-disable */
// Builds the interactive version of the KMPL site content into content/kmpl/:
// pages (copied from content/*.plain.html and updated), nav/footer fragments
// and modal pages (lead form, "Read more" details).
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';

const LIBS = '/home/node/.excat-marketplaces/excat-marketplace/excat/skills/excat-content-import/scripts/node_modules';
const require = createRequire(`${LIBS}/`);
const { JSDOM } = require('jsdom');
const sharp = createRequire('/home/node/.excat-marketplaces/excat-extended/excat-figma/tools/excat-figma-mcp/node_modules/')('sharp');

const REPO = new URL('../../', import.meta.url).pathname;
const SRC = join(REPO, 'content');
const OUT = join(REPO, 'content/kmpl');
const BASE = '/content/kmpl';
const RAW = join(REPO, 'reference/interactions');

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const page = (slug) => `${BASE}/${slug}`;
const APPLY = `${BASE}/modals/apply-now`;

function write(rel, html) {
  const file = join(OUT, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${html.trim()}\n`);
  console.log('wrote', rel);
}

/* ---------- images ---------- */
mkdirSync(join(SRC, 'images/shared'), { recursive: true });
mkdirSync(join(SRC, 'images/modals'), { recursive: true });
const ICONS = {
  ribbon: 'shared/eligibility-ribbon.png',
  pinwheel: 'shared/eligibility-pinwheel.png',
  clover: 'shared/eligibility-clover.png',
};
copyFileSync(join(RAW, 'check-eligibility/raw/icon-ribbon-72px.png'), join(SRC, 'images', ICONS.ribbon));
copyFileSync(join(RAW, 'check-eligibility/raw/icon-pinwheel-72px.png'), join(SRC, 'images', ICONS.pinwheel));
copyFileSync(join(RAW, 'check-eligibility/raw/icon-clover-crop.png'), join(SRC, 'images', ICONS.clover));
await sharp(join(RAW, 'apply-sticky-readmore/raw/margin-money-banner.png'))
  .flatten({ background: '#ffffff' }).jpeg({ quality: 82, mozjpeg: true })
  .toFile(join(SRC, 'images/modals/margin-money.jpg'));

/* ---------- nav ---------- */
const MENUS = [
  ['Car loan', [
    ['New Car Finance', 'Drive home your ideal car with confidence.', 'car-loan'],
    ['Used Car & Refinance', 'Flexible finance for pre-owned vehicles', 'used-car-loan'],
    ['Top-up Loan', 'Additional funds to support your evolving needs', 'top-up-loan'],
    ['Car Leasing for Corporates', 'Smarter mobility solutions for your business', 'car-lease'],
  ]],
  ['Two-wheeler Loan', [
    ['Two-wheeler Finance', 'Ride home your new bike with easy EMIs', 'two-wheeler-loan'],
    ['Two-wheeler Top-up Loan', 'Extra funds on your existing two-wheeler loan', 'top-up-loan'],
  ]],
  ['Dealer Finance', [
    ['Dealer Finance', 'Working capital solutions for automobile dealers', 'dealer-finance'],
    ['Inventory Funding', 'Keep your showroom stocked with ready credit', 'dealer-finance'],
    ['Trade Advance', 'Short-term funds to bridge your trade cycle', 'dealer-finance'],
    ['Term Loan', 'Long-term capital to grow your dealership', 'dealer-finance'],
  ]],
  ['Loan Against Property', [
    ['Loan Against Property', 'Unlock funds with your property as collateral', 'loan-against-property'],
    ['Flexi Loan Against Property', 'Borrow, repay and redraw as you need', 'loan-against-property'],
    ['Top-up on Loan Against Property', 'Additional funds on your existing LAP', 'loan-against-property'],
  ]],
];
const MORE = [
  ['Car Prices and News', [
    ['Car news', 'Stay updated with the latest car news'],
    ['Latest cars', 'Discover the newest cars and launches'],
    ['Upcoming cars', 'Preview the cars launching soon'],
    ['Car prices', 'Check prices across models and variants'],
    ['Compare cars', 'Compare features and prices side by side'],
  ]],
  ['Two Wheeler Prices and News', [
    ['Two-wheeler news', 'Catch up on the latest bike and scooter news'],
    ['Latest two-wheelers', 'Explore the newest bikes and scooters'],
    ['Upcoming two-wheelers', 'See which bikes and scooters launch next'],
    ['Two-wheeler prices', 'Check prices across bikes and scooters'],
    ['Compare two-wheelers', 'Compare bikes and scooters side by side'],
  ]],
  ['Help & Support', [
    ['Service request', 'Raise and track requests for your loan account'],
    ['FAQs', 'Quick answers to common questions'],
    ['Grievance redressal', 'Register a concern and track its resolution'],
    ['Form download', 'Download application and service forms'],
    ['Documents', 'Access your loan documents and statements'],
  ]],
  ['Explore more', [
    ['Kotak Group', 'Explore the companies of the Kotak Group', 'https://www.kotak.com/'],
    ['About Us', 'Our story, values and leadership', 'about-us'],
    ['Careers', 'Build your career with Kotak Prime'],
    ['Pre eligible offers', 'Check offers you already qualify for'],
  ]],
];
const SEARCH = [
  ['Car loan – New car', 'Product', 'car-loan'],
  ['Car loan – Used car', 'Product', 'used-car-loan'],
  ['Car loan EMI calculator', 'Calculator', 'home'],
  ['Car loan refinance', 'Product', 'used-car-loan'],
  ['How to apply for a car loan', 'Help', 'car-loan'],
  ['Documents needed for a car loan', 'Help', 'car-loan'],
  ['Two-wheeler loan EMI calculator', 'Calculator', 'home'],
  ['Loan against property EMI calculator', 'Calculator', 'home'],
  ['Branch locator', 'Help', 'contact-us'],
];
const href = (target) => (!target ? '#' : target.startsWith('http') ? target : page(target));
const linkItem = ([title, desc, target]) => `<li><a href="${href(target)}">${esc(title)}</a> ${esc(desc)}</li>`;

write('fragments/nav.plain.html', `
<div>
  <p><span class="icon icon-info"></span> Please make payments towards your loan account only to Authorised Staff with valid ID cards and insist for receipt for every payment made. For any suspicious activity please call 18002095732 immediately. Important Update: Receive genuine service calls from 1600XXXXXX numbers. Promotional calls may come from 140XXXXXXX numbers. Report telecom fraud at sancharsaathi.gov.in and financial fraud at cybercrime.gov.in or call 1930.</p>
  <ul>
    <li><a href="tel:18004100"><span class="icon icon-call"></span>1800 4100</a></li>
    <li><a href="${page('contact-us')}"><span class="icon icon-help"></span>Contact us</a></li>
    <li><a href="#accessibility">Accessibility</a></li>
    <li><a href="#preferences">Preferences</a></li>
    <li>English
      <ul>
        <li><a href="${page('home')}">English</a></li>
        <li><a href="#">हिन्दी</a> Hindi</li>
      </ul>
    </li>
  </ul>
</div>
<div>
  <p><a href="${page('home')}"><picture><img src="../../images/home/logo-kotak-prime.png" alt="Kotak Prime"></picture></a></p>
</div>
<div>
  <ul>
${MENUS.map(([label, items]) => `    <li>${esc(label)}
      <ul>
${items.map((i) => `        ${linkItem(i)}`).join('\n')}
      </ul>
    </li>`).join('\n')}
    <li>More
      <ul>
${MORE.map(([label, items]) => `        <li>${esc(label)}
          <ul>
${items.map((i) => `            ${linkItem(i)}`).join('\n')}
          </ul>
        </li>`).join('\n')}
      </ul>
    </li>
  </ul>
</div>
<div>
  <p><a href="#" title="Search loans, branches,calculators" aria-label="Search"><span class="icon icon-search"></span></a></p>
  <p><em><a href="#">Login</a></em></p>
  <p><strong><a href="#">Web pay</a></strong></p>
</div>
<div>
  <ul>
${SEARCH.map(([title, tag, target]) => `    <li><a href="${page(target)}">${esc(title)}</a> ${esc(tag)}</li>`).join('\n')}
  </ul>
</div>`);

/* ---------- footer ---------- */
const GROUP = [
  ['Kotak Mahindra Bank', 'https://www.kotak.com/'],
  ['Kotak Asset Management', 'https://www.kotakmf.com/'],
  ['Zurich Kotak General Insurance', 'https://www.zurichkotak.com/'],
  ['Kotak Institutional Equities', 'https://www.kotak.com/en/kotak-institutional-equities.html'],
  ['Kotak International Business', 'https://www.kotak.com/en/kotak-international-business.html'],
  ['Kotak Investment Advisors', 'https://www.kotakalt.com/'],
  ['Kotak Investment Banking', 'https://investmentbank.kotak.com/'],
  ['Kotak Life Insurance', 'https://www.kotaklife.com/'],
  ['Kotak Mahindra Investments', 'https://www.kotak.com/en/kotak-mahindra-investments.html'],
  ['Kotak Neo', 'https://www.kotakneo.com/'],
];
{
  const dom = new JSDOM(`<body>${readFileSync(join(SRC, 'fragments/footer.plain.html'), 'utf-8')}</body>`);
  const { document } = dom.window;
  document.querySelectorAll('img').forEach((img) => img.setAttribute('src', img.getAttribute('src').replace(/^\.\.\/images\//, '../../images/')));
  const quick = [...document.querySelectorAll('li')].find((li) => li.firstChild?.textContent.trim() === 'Quick Links');
  quick.querySelector('ul').insertAdjacentHTML('beforeend', '<li><a href="#">Do Not Call Registry</a></li>');
  const group = [...document.querySelectorAll('li')].find((li) => li.firstChild?.textContent.trim() === 'Kotak Group Companies');
  group.querySelector('ul').innerHTML = GROUP.map(([t, h]) => `<li><a href="${h}">${esc(t)}</a></li>`).join('');
  document.querySelectorAll('a').forEach((a) => { if (/^contact us$/i.test(a.textContent.trim())) a.href = page('contact-us'); });
  write('fragments/footer.plain.html', document.body.innerHTML);
}

/* ---------- lead form modal ---------- */
const CITIES = [
  ['Agra', 'Uttar Pradesh', '27.1767, 78.0081', ['B-9, Ground Floor Raghunath Nagar, M G Road, Shriram Hospital, Agra 282002', '18003095732 / 0562 4022401 / Toll-Free: 1800-209-5732']],
  ['Ahmedabad', 'Gujarat', '23.0225, 72.5714'],
  ['Bengaluru', 'Karnataka', '12.9716, 77.5946'],
  ['Chandigarh', '', '30.7333, 76.7794', ['Plot No. 57, 6th Floor Industrial and Business Park, Phase 1, Chandigarh 160002', '18002095732 / 0172-5143680 / Toll-Free: 1800-209-5732']],
  ['Chennai', 'Tamil Nadu', '13.0827, 80.2707'],
  ['Delhi', 'Delhi NCR', '28.6139, 77.2090'],
  ['Hyderabad', 'Telangana', '17.3850, 78.4867'],
  ['Jaipur', 'Rajasthan', '26.9124, 75.7873'],
  ['Kolkata', 'West Bengal', '22.5726, 88.3639'],
  ['Lucknow', 'Uttar Pradesh', '26.8467, 80.9462'],
  ['Mumbai', 'Maharashtra', '19.0760, 72.8777'],
  ['Pune', 'Maharashtra', '18.5204, 73.8567'],
];
const field = (label, kind, options = '', required = true) => `<div><div>${esc(label)}</div><div>${kind}</div><div>${esc(options)}</div><div>${required}</div></div>`;
write('modals/apply-now.plain.html', `
<div><div class="lead-form">
<div><div><h2>Start Your Loan Journey Today</h2><p>Get a call back from our loan expert.</p></div></div>
<div><div><p><strong>Disclaimer</strong></p><p>I/ we hereby acknowledge and agree to the following terms and conditions.</p><ol>
<li>Loan offer is from Kotak Mahindra Prime Limited (KMPL), a subsidiary of Kotak Mahindra Bank limited. Loan sanction and disbursement will be subject to complete documentation and credit approval at sole discretion of KMPL and subject to guidelines issued by RBI from time to time</li>
<li>By filling up this form and sharing your mobile number with KMPL, you are hereby giving your consent to KMPL to extract your information from the Credit Bureau.</li>
<li>KMPL may engage the services of marketing agents for the purpose of sourcing loan assets. Available at select locations.</li>
<li>By sending an SMS/ calling us / clicking on the links mentioned, you are hereby giving your consent to receive call/communication from Kotak Mahindra Prime Ltd and other Kotak Group Companies for marketing purposes through telephone/Mobile/SMS/Email for the selected financial product (Car Finance / Two-Wheeler Loan / Loan Against Property) and that such consent shall prevail over any current or subsequent registration of your number in the National Do Not Call Registry.</li>
<li>Schemes like Balloon EMI/ Step-Up EMI / Bullet EMI / Subvention scheme (if applicable) are for a limited period only and KMPL may withdraw/suspend/revoke these schemes anytime without any advance notice.</li>
<li>Subvention scheme (if applicable) is a limited period offer based on subventions offered by select car dealerships or OEMs and KMPL is not responsible or liable for products and services offered by the dealer or OEM . Only available for select vehicle models.</li>
</ol></div></div>
<div><div>By clicking on Apply now, I agree to the above terms</div></div>
<div><div>Apply now</div></div>
${field('Loan Category', 'select', '*New Car, Used Car & Re-finance, Two-Wheeler, Top-Up Loan, Car Lease, Dealer Finance, Loan Against Property')}
${field('Name', 'text')}
${field('Mobile number', 'tel')}
${field('Email', 'email')}
${field('City', 'search', CITIES.map(([c, r]) => `${c}: ${r}`).join(', '))}
${field('Zip / Postal code', 'zip', '', false)}
${field('Enter the code', 'captcha')}
</div></div>`);

/* ---------- read more modals ---------- */
const READ_MORE = {
  'Margin Money Scheme': {
    slug: 'margin-money-scheme',
    image: '../../images/modals/margin-money.jpg',
    body: [
      'We provide finance for acquisition of new car up to 100% of the invoice value for certain models.',
      'The customer should pay the margin money (invoice value minus the finance amount) to the dealer directly. He also has an option to pay the margin money to KMPL upon which we would release the entire invoice value to the Dealer.',
      'The financed amount can be repaid as per your convenience (12 - 84 months EMIs).',
    ],
  },
};

/* ---------- documents (per product) ---------- */
const ID_LONG = ["Proof of Residence (electricity/telephone bill, passport, Voter ID, lease deed, rent agreement, or property registration document in the customer's name)", "Signature Verification Proof (Banker / Voter's ID / PAN / IT Return / DL / Passport)"];
const ID_SHORT = ['Proof of Residence (electricity/telephone bill)', "Signature Verification Proof (Banker / Voter's ID / PAN / IT Return / DL / Passport)"];
const PL = ['P&L A/C and B/S (2 years, CA certified)', 'ITR (2 years)'];
const FORM = ['KMPL Application Form, duly filled'];
const VEH_USED = ['RC Copy', 'Insurance Copy', 'Valuation form from our authorised valuation agency', ...FORM];
const VEH_TW = ['RC Copy', 'Insurance Copy', ...FORM];
const VEH = ['Registration Copy of Vehicle', 'Invoice Copy of Vehicle', 'Insurance Copy of Vehicle'];
const TW_ID = ['Proof of Residence (electricity/telephone bill)', 'Proof of Identity (PAN, Voter ID, DL, Passport, Aadhaar)', "Signature Verification Proof (Banker / Voter's ID / PAN / IT Return / DL / Passport)"];
const TW_INC = ['Computation of income (1 year, CA certified)', 'ITR (1 year)', 'Bank statement (3 months)'];
const MORTGAGE = ['Complete Chain of Property Title Deeds', 'Approved Layout / Building Plan', 'Other documents required for creation of valid mortgage'];
const self = (id, inc, last) => [['Identity & Address', id], ['Income & Business Documents', inc], last];

const DOCUMENTS = {
  'car-loan': {
    intro: 'Select employment type to update requirements',
    tabs: {
      Salaried: [['Identity & Address', [...ID_LONG, 'Photograph, signed by the customer']], ['Income & Business Documents', ['Latest salary slip', 'Form 16 / IT Returns']], ['Application Form', FORM]],
      'Self-Employed': self([...ID_LONG, 'Photograph, signed by the customer'], PL, ['Application Form', FORM]),
      Proprietary: self([...ID_LONG, 'Photograph, signed by the customer'], PL, ['Application Form', FORM]),
      Partnership: self(ID_LONG, [...PL, 'Partnership Deed / Trust Deed', 'Letter of Authority'], ['Application Form', FORM]),
      Company: self(ID_LONG, [...PL, 'MOA and Board Resolution authorising one director'], ['Application Form', FORM]),
    },
  },
  'top-up-loan': {
    intro: 'Select loan type to update requirements',
    tabs: {
      'Two Wheeler Loan': [['Identity & Address', ['Proof of Residence', 'Signature Verification Proof', 'Identity Proof']], ['Vehicle Documents', VEH], ['Additional Documents', ['Any product/customer-type specific documents (if applicable)']]],
      'Car Loan – Individual / Proprietor': [['Identity & Address', ['Proof of Residence', 'Signature Verification Proof', 'Identity Proof', 'Photograph', 'Ownership Proof']], ['Vehicle Documents', VEH], ['Additional Documents', ['Customer-specific supporting documents']]],
      'Car Loan – Partnership': [['Identity & Address', ['Proof of Residence', 'Signature Verification Proof', 'Identity Proof', 'Photograph']], ['Business Documents', ['Partnership Deed / Trust Deed', 'Letter of Authority signed by all partners']], ['Vehicle Documents', VEH]],
      'Car Loan – Company': [['Identity & Address', ['Proof of Residence', 'Signature Verification Proof', 'Identity Proof', 'Photograph of Director']], ['Income & Business Documents', ['Income Tax Returns (Last 2 Years)', 'MOA', 'Board Resolution']], ['Vehicle Documents', VEH]],
    },
  },
  'loan-against-property': {
    intro: 'Select employment type to update requirements',
    tabs: {
      'Salaried Individuals': [['Identity & Address', ['Photo Identity Proof & Address Proof (as per RBI KYC guidelines)', 'Employee ID Card Copy']], ['Income Proof', ['Latest 3 Years ITR / Form 16', 'Latest 6 Months Salary Slips', 'Last 6 Months Bank Statement reflecting salary credit', 'Sanction Letters / Statement of Account']], ['Property Documents', MORTGAGE]],
      'Self-Employed Professionals / Non-Professionals': [['Identity & Address', ['Photo Identity Proof & Address Proof (as per RBI KYC guidelines)']], ['Income & Business Documents', ['Shop Act License', 'MOA & AOA', 'GST Registration', 'Partnership Deed (where applicable)', 'Shareholding Pattern (for Pvt. Ltd. Companies)', 'Latest 3 Years ITR Copies', 'Last 12 Months Banking Statements (Current / OD / CC / Savings Account)', 'Sanction Letters / Statement of Account']], ['Property Documents', MORTGAGE]],
    },
  },
  'used-car-loan': {
    intro: 'Select employment type to update requirements',
    tabs: {
      Salaried: [['Identity & Address', [...ID_SHORT, 'Photograph, signed by the customer']], ['Income & Business Documents', ['Latest salary slip', 'Form 16 / IT Returns']], ['Vehicle & Application Documents', VEH_USED]],
      'Self-Employed': self([...ID_SHORT, 'Photograph, signed by the customer'], PL, ['Vehicle & Application Documents', VEH_USED]),
      Proprietary: self([...ID_SHORT, 'Photograph, signed by the customer'], PL, ['Vehicle & Application Documents', VEH_USED]),
      Partnership: self(ID_SHORT, [...PL, 'Partnership Deed / Trust Deed', 'Letter of Authority'], ['Vehicle & Application Documents', VEH_USED]),
      Company: self(ID_SHORT, [...PL, 'MOA and Board Resolution authorising one director'], ['Vehicle & Application Documents', VEH_USED]),
    },
  },
  'two-wheeler-loan': {
    intro: 'Select employment type to update requirements',
    tabs: {
      Salaried: [['Identity & Address', [...TW_ID, 'Photograph, signed by the customer']], ['Income & Business Documents', ['Latest salary slip', 'Bank statement (3 months)']], ['Vehicle & Application Documents', VEH_TW]],
      'Self-Employed': self([...TW_ID, 'Photograph, signed by the customer'], TW_INC, ['Vehicle & Application Documents', VEH_TW]),
      Proprietary: self([...TW_ID, 'Photograph, signed by the customer'], TW_INC, ['Vehicle & Application Documents', VEH_TW]),
      Partnership: self([...TW_ID, 'Photograph, signed by the Partner'], [...TW_INC, 'Partnership Deed', 'Letter of Authority'], ['Vehicle & Application Documents', VEH_TW]),
      Company: self([...TW_ID, 'Photograph, signed by the Director'], [...TW_INC, 'Shareholding pattern, BO, MOA and Board Resolution authorising one director'], ['Vehicle & Application Documents', VEH_TW]),
    },
  },
};

/* ---------- eligibility: second tab per product ---------- */
const ELIGIBILITY = {
  'car-loan': {
    'Self employed': [['ribbon', 'Minimum age of applicant', '21 years'], ['pinwheel', 'Maximum age at maturity', '65 years'], ['ribbon', 'Minimum employment', '1 year in business']],
  },
  'two-wheeler-loan': {
    'Self employed': [['ribbon', 'Minimum age of applicant', '21 years'], ['pinwheel', 'Maximum age at maturity', '65 years'], ['pinwheel', 'Minimum employment', '1 year in business'], ['pinwheel', 'Average monthly balance', '₹5,000 p.m.'], ['clover', 'Past work experience', 'Min. 3 Years']],
  },
  'loan-against-property': {
    'Self employed': [['ribbon', 'Minimum age of applicant', '18 years'], ['pinwheel', 'Maximum age at maturity', '65 years'], ['pinwheel', 'Minimum business existence', '3 year in business'], ['pinwheel', 'Minimum income (as per latest ITR)', '₹3,00,000 p.a.']],
  },
  'top-up-loan': {
    'Two Wheeler Loan': [['ribbon', 'Minimum age of applicant', '21 to 60 years'], ['pinwheel', 'Minimum tenure of existing loan', '6 months']],
  },
  'used-car-loan': {
    'Self employed': [['pinwheel', 'Minimum age of applicant', '21 years'], ['ribbon', 'Maximum age at maturity', '60 Years'], ['clover', 'Minimum employment', '1 year in business']],
  },
};

/* ---------- pages ---------- */
const SLUGS = ['home', 'car-loan', 'two-wheeler-loan', 'loan-against-property', 'dealer-finance', 'top-up-loan', 'car-lease', 'used-car-loan', 'about-us', 'contact-us'];
const html = (document, tag, text) => {
  const el = document.createElement(tag);
  el.textContent = text;
  return el;
};
const rowOf = (document, cells) => {
  const row = document.createElement('div');
  cells.forEach((content) => {
    const cell = document.createElement('div');
    if (typeof content === 'string') cell.innerHTML = content;
    else if (content) cell.append(content);
    row.append(cell);
  });
  return row;
};

for (const slug of SLUGS) {
  const dom = new JSDOM(`<body>${readFileSync(join(SRC, `${slug}.plain.html`), 'utf-8')}</body>`);
  const { document } = dom.window;
  const body = document.body;

  // assets and links relative to content/kmpl/
  body.querySelectorAll('img').forEach((img) => img.setAttribute('src', img.getAttribute('src').replace(/^\.\/images\//, '../images/')));
  body.querySelectorAll('.metadata > div').forEach((row) => {
    const [key, value] = row.children;
    if (/^(nav|footer)$/.test(key.textContent.trim())) value.textContent = value.textContent.replace('/content/fragments/', `${BASE}/fragments/`);
  });
  body.querySelectorAll('a[href]').forEach((a) => {
    const text = a.textContent.trim();
    const target = a.getAttribute('href');
    if (/^\/content\/(?!kmpl\/|dam\/)/.test(target)) a.setAttribute('href', target.replace(/^\/content\//, `${BASE}/`));
    if (target !== '#') return;
    if (/^apply now$/i.test(text)) a.setAttribute('href', APPLY);
    else if (/^locate us$/i.test(text)) a.setAttribute('href', page('contact-us'));
    else if (/^read more$/i.test(text)) {
      const cell = a.closest('p').parentElement.closest('div');
      const title = cell.querySelector('h2')?.textContent.trim();
      const detail = READ_MORE[title];
      const slugName = detail?.slug || title.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
      a.setAttribute('href', `${BASE}/modals/${slugName}`);
      // modal page: image, heading and the full text
      const row = cell.parentElement;
      const image = row.querySelector('img')?.getAttribute('src')?.replace(/^\.\.\/images\//, '../../images/');
      const paragraphs = detail ? detail.body : [...cell.querySelectorAll(':scope > p')].filter((p) => !p.querySelector('a')).map((p) => p.textContent.trim());
      write(`modals/${slugName}.plain.html`, `
<div>
  ${detail?.image || image ? `<p><picture><img src="${detail?.image || image}" alt=""></picture></p>` : ''}
  <h2>${esc(cell.querySelector('h2').textContent.trim())}</h2>
${paragraphs.map((p) => `  <p>${esc(p)}</p>`).join('\n')}
  <p><strong><a href="${APPLY}">Apply now</a></strong></p>
</div>`);
    }
  });
  // the hero form continues in the full application form
  body.querySelectorAll('.hero-loan > div:nth-child(3) a[href="#"]').forEach((a) => a.setAttribute('href', APPLY));

  // documents: one chip per employment / loan type
  const docs = DOCUMENTS[slug];
  const docBlock = body.querySelector('.requirements.documents');
  if (docs && docBlock) {
    const deco = [...docBlock.children].find((row) => row.children.length === 1);
    docBlock.replaceChildren(...[deco].filter(Boolean));
    Object.entries(docs.tabs).forEach(([tab, cards]) => cards.forEach(([title, items]) => {
      docBlock.append(rowOf(document, [esc(tab), '', esc(title), `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`]));
    }));
    const intro = docBlock.parentElement.querySelector(':scope > h2 + p');
    if (intro) intro.textContent = docs.intro;
  }

  // eligibility: add the second tab
  const elig = ELIGIBILITY[slug];
  const eligBlock = body.querySelector('.requirements.eligibility');
  if (elig && eligBlock) {
    if (slug === 'top-up-loan') {
      [...eligBlock.children].forEach((row) => {
        if (row.children[0]?.textContent.trim() === 'Car loan') row.children[0].textContent = 'Car Loan';
      });
    }
    Object.entries(elig).forEach(([tab, cards]) => cards.forEach(([icon, label, value]) => {
      eligBlock.append(rowOf(document, [esc(tab), `<picture><img src="../images/${ICONS[icon]}" alt=""></picture>`, esc(label), `<p>${esc(value)}</p>`]));
    }));
  }

  // contact us: every city with region, coordinates and contact details
  const locator = body.querySelector('.branch-locator');
  if (locator) {
    const [introRow, firstBranch] = locator.children;
    const [, , timing, email] = [...firstBranch.children[1].querySelectorAll('p')].map((p) => p.textContent.trim());
    locator.replaceChildren(introRow);
    CITIES.forEach(([city, region, coords, details]) => {
      const [address = '', phone = 'Toll-Free: 1800-209-5732'] = details || [];
      const paragraphs = [address, phone, timing.replace(' I ', ' | '), email].map((t) => `<p>${esc(t)}</p>`).join('');
      locator.append(rowOf(document, [esc(city), esc(region), paragraphs, esc(coords)]));
    });
    // a single locator on the page
    body.querySelectorAll('.branch-locator').forEach((b, i) => { if (i > 0) b.parentElement.remove(); });
  }

  write(`${slug}.plain.html`, body.innerHTML);
}
