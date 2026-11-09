import {
  asCompany,
  asSite,
  fmtDate,
  CATEGORY_LABELS,
  GENDER_LABELS,
  SHIFT_LABELS,
  type Proforma,
  type ProformaItem,
} from './types';

/**
 * Print / save-as-PDF document for a proforma — premium A4 proforma invoice.
 *
 * Design notes:
 *   • A4 sheet with a gold/navy letterhead, the official shield mark on the
 *     left and a large shield watermark at ~7% opacity behind the content.
 *   • Navy (#0A2540) and gold (#C9A227) are the only accent colours; section
 *     surfaces are soft warm greys so the printout stays corporate and calm.
 *   • Manpower lines render as a deployment table (posts/day, shift, computed
 *     headcount, monthly rate) and technology lines (CCTV, alarm, K9, QR
 *     patrol…) render as a solutions table with units, so a mixed quotation
 *     reads correctly in both halves.
 *   • Price breakdown is its own panel with the totals stacked beside it, and
 *     the sheet closes with the signature area and company stamp box.
 */

const NAVY = '#0A2540';
const GOLD = '#C9A227';
const GOLD_LIGHT = '#E3CD8A';
const INK = '#1E2833';
const MUTED = '#6F7B89';
const PANEL = '#F6F7F9';
const LINE = '#E4E7EC';

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const money = (n: number | null | undefined) =>
  n == null ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const qty = (n: number | null | undefined) => (n == null ? '—' : String(Number(Number(n).toFixed(2))));

/** Absolute URL so the mark renders inside the print window. */
function logoUrl(): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/logo.png`;
}

const isManpower = (item: ProformaItem) => (item.category ?? 'MANPOWER') === 'MANPOWER';

const categoryLabel = (value: string | undefined) =>
  CATEGORY_LABELS[value ?? 'MANPOWER'] ?? CATEGORY_LABELS.OTHER;

const genderLabel = (value: string | undefined) =>
  !value || value === 'NA' ? '' : GENDER_LABELS[value] ?? value;

const shiftLabel = (value: string | undefined) => SHIFT_LABELS[value ?? ''] ?? 'Custom shift';

const bulletList = (text: string | undefined) =>
  (text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<li>${esc(line)}</li>`)
    .join('');

export function buildProformaDocumentHtml(proforma: Proforma): string {
  const company = asCompany(proforma.companyId);
  const site = asSite(proforma.siteId);
  const items = proforma.items ?? [];

  const manpower = items.filter(isManpower);
  const technology = items.filter((item) => !isManpower(item));

  const manpowerHeadcount = manpower.reduce((sum, item) => sum + (item.totalHeadcount || 0), 0);
  const technologyUnits = technology.reduce((sum, item) => sum + (item.totalHeadcount || 0), 0);
  const totalPosts = manpower.reduce((sum, item) => sum + (item.postsPerDay || 0), 0);
  const vatBase = items.filter((item) => item.vatApplicable).reduce((sum, item) => sum + (item.lineTotal || 0), 0);
  const exemptTotal = items.filter((item) => !item.vatApplicable).reduce((sum, item) => sum + (item.lineTotal || 0), 0);

  const addressLine = [site?.city || company?.city, site?.region || company?.region, company?.country || 'Ethiopia']
    .filter(Boolean)
    .join(', ');

  const manpowerTable = manpower.length
    ? `<div class="table-wrap">
        <div class="section-head">
          <span class="section-title">Manpower deployment</span>
          <span class="section-sub">${manpower.length} guard role${manpower.length === 1 ? '' : 's'} · ${qty(manpowerHeadcount)} personnel</span>
          <span class="head-rule"></span>
        </div>
        <table class="items">
          <thead>
            <tr>
              <th class="left">Guard role</th>
              <th class="left">Shift pattern</th>
              <th>Posts / day</th>
              <th>Headcount</th>
              <th>Monthly rate</th>
              <th>Amount (ETB)</th>
            </tr>
          </thead>
          <tbody>
            ${manpower
              .map(
                (item) => `<tr>
                  <td class="left"><span class="role-name">${esc(item.roleName)}</span><span class="role-inline">${esc(item.roleCode)}${genderLabel(item.gender) ? ` · ${esc(genderLabel(item.gender))}` : ''}${item.vatApplicable ? '' : ' · VAT exempt'}</span></td>
                  <td class="left">${esc(shiftLabel(item.shiftPattern))}</td>
                  <td>${qty(item.postsPerDay)}</td>
                  <td>${qty(item.totalHeadcount)}<span class="role-meta">×${qty(item.multiplier)}</span></td>
                  <td>${money(item.unitRate)}</td>
                  <td class="amount">${money(item.lineTotal)}</td>
                </tr>`
              )
              .join('')}
          </tbody>
          <tfoot>
            <tr>
              <td class="left" colspan="2">Total manpower</td>
              <td>${qty(totalPosts)}</td>
              <td>${qty(manpowerHeadcount)}</td>
              <td></td>
              <td class="amount">${money(manpower.reduce((sum, item) => sum + (item.lineTotal || 0), 0))}</td>
            </tr>
          </tfoot>
        </table>
      </div>`
    : '';

  const technologyTable = technology.length
    ? `<div class="table-wrap">
        <div class="section-head">
          <span class="section-title">Technology &amp; specialised services</span>
          <span class="section-sub">${qty(technologyUnits)} unit${technologyUnits === 1 ? '' : 's'} supplied and supported</span>
          <span class="head-rule"></span>
        </div>
        <table class="items">
          <thead>
            <tr>
              <th class="left">Service</th>
              <th class="left">Category</th>
              <th>Units</th>
              <th>Unit rate</th>
              <th>Amount (ETB)</th>
            </tr>
          </thead>
          <tbody>
            ${technology
              .map(
                (item) => `<tr>
                  <td class="left"><span class="role-name">${esc(item.roleName)}</span><span class="role-inline">${esc(item.roleCode)}${item.vatApplicable ? '' : ' · VAT exempt'}</span></td>
                  <td class="left">${esc(categoryLabel(item.category))}</td>
                  <td>${qty(item.totalHeadcount)}</td>
                  <td>${money(item.unitRate)}</td>
                  <td class="amount">${money(item.lineTotal)}</td>
                </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>`
    : '';

  const breakdownRows = items
    .map(
      (item, index) => `<tr>
        <td class="left index">${String(index + 1).padStart(2, '0')}</td>
        <td class="left">${esc(item.roleName)}<span class="role-inline">${esc(
          isManpower(item) ? 'Manpower' : categoryLabel(item.category)
        )}</span></td>
        <td>${qty(item.totalHeadcount)}</td>
        <td>${money(item.unitRate)}</td>
        <td>${item.vatApplicable ? '15%' : '—'}</td>
        <td class="amount">${money(item.lineTotal)}</td>
      </tr>`
    )
    .join('');

  // The stored note repeats the headcount total and the VAT wording shown
  // elsewhere on the sheet, so those two lines are hidden from the print copy.
  const scopeNotes = bulletList(
    (proforma.shiftNote ?? '')
      .split(/\r?\n/)
      .filter((line) => !/^\s*total headcount:/i.test(line) && !/^\s*rates quoted/i.test(line))
      .join('\n')
  );
  const clientNotes = bulletList(proforma.notes);

  const delivery = [
    proforma.deliveryEmailPdf ? 'PDF copy by email' : '',
    proforma.deliveryHardCopy ? 'signed hard copy' : '',
  ]
    .filter(Boolean)
    .join(' and ');

  const terms = [
    proforma.validityDate
      ? `This quotation is valid until <strong>${fmtDate(proforma.validityDate)}</strong> (${proforma.validityDays} days from the issue date).`
      : '',
    'All prices are quoted in Ethiopian Birr (ETB). VAT is charged at 15% on VAT-applicable services only; exempt lines are marked on this document.',
    delivery ? `Delivery: ${esc(delivery)}.` : '',
    'Quotation only — not a tax invoice. Deployment follows a signed service agreement.',
  ]
    .filter(Boolean)
    .map((line) => `<li>${line}</li>`)
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(proforma.number)} — Proforma Invoice — Vital Global Trading PLC</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #EDEFF2; }
  body {
    font-family: 'Segoe UI', Inter, Helvetica, Arial, sans-serif;
    font-size: 9.4pt; line-height: 1.5; color: ${INK};
  }
  .sheet { padding: 7mm 0; }
  .page {
    position: relative; width: 210mm; min-height: 292mm; margin: 0 auto;
    padding: 8mm 12mm 5mm; background: #fff; overflow: visible;
    box-shadow: 0 14px 40px rgba(10, 37, 64, 0.18);
    display: flex; flex-direction: column;
  }
  .watermark {
    position: absolute; top: 0; right: 0; bottom: 0; left: 0;
    display: flex; align-items: center; justify-content: center;
    pointer-events: none;
  }
  .watermark img { width: 116mm; opacity: 0.07; }
  .content { position: relative; z-index: 2; display: flex; flex-direction: column; flex: 1; }

  /* ── letterhead ─────────────────────────────────────────────── */
  .masthead { display: flex; justify-content: space-between; align-items: flex-start; gap: 7mm; }
  .brand { display: flex; align-items: center; gap: 4.4mm; }
  .shield { width: 19mm; height: auto; display: block; }
  .identity h1 {
    margin: 0; font-family: Georgia, 'Times New Roman', serif;
    font-size: 12.2pt; font-weight: 700; letter-spacing: 0.8px; color: ${NAVY}; white-space: nowrap;
  }
  .identity .am {
    margin: 3px 0 0; font-family: Nyala, Ebrima, 'Segoe UI', sans-serif;
    font-size: 7.8pt; color: #4A5768; letter-spacing: 0.2px;
  }
  .tagline {
    display: flex; align-items: center; gap: 2mm; margin: 3px 0 0;
    font-size: 6.3pt; font-weight: 700; letter-spacing: 2.2px;
    text-transform: uppercase; color: ${GOLD};
  }
  .tagline .tag-rule { width: 9mm; height: 1px; background: ${GOLD}; display: inline-block; }
  .doc { text-align: right; min-width: 54mm; }
  .kicker {
    font-size: 6.4pt; font-weight: 700; letter-spacing: 2.8px;
    text-transform: uppercase; color: ${MUTED};
  }
  .doc-title {
    margin: 1px 0 0; font-family: Georgia, 'Times New Roman', serif;
    font-size: 14pt; font-weight: 700; letter-spacing: 0.8px; white-space: nowrap;
    text-transform: uppercase; color: ${NAVY};
  }
  .doc-rule { width: 26mm; height: 2px; background: ${GOLD}; margin: 3px 0 4px auto; }
  .doc-number { font-size: 9.4pt; font-weight: 700; letter-spacing: 1px; color: ${NAVY}; }
  .doc-meta { display: flex; justify-content: flex-end; gap: 5mm; margin-top: 4px; text-align: left; }
  .doc-meta span {
    display: block; font-size: 6.2pt; font-weight: 700; letter-spacing: 1.5px;
    text-transform: uppercase; color: ${MUTED};
  }
  .doc-meta b { font-size: 7.8pt; font-weight: 600; color: ${INK}; }
  .rule-gold {
    height: 1px; margin: 2.4mm 0 2.2mm;
    background: linear-gradient(90deg, ${GOLD} 0%, rgba(201, 162, 39, 0.12) 62%, rgba(201, 162, 39, 0) 100%);
  }

  /* ── soft grey section boxes ────────────────────────────────── */
  .panel { background: ${PANEL}; border: 1px solid ${LINE}; padding: 2.4mm 3mm; }
  .label {
    font-size: 6.3pt; font-weight: 700; letter-spacing: 1.8px;
    text-transform: uppercase; color: ${MUTED}; margin-bottom: 1.4mm;
  }
  .panels { display: grid; grid-template-columns: 1.3fr 0.9fr; gap: 3mm; }
  .facts { display: flex; border: 1px solid ${LINE}; background: #fff; margin: 2.2mm 0; }
  .facts div {
    display: flex; align-items: baseline; gap: 2mm; flex: 1;
    padding: 1.5mm 2.8mm; border-right: 1px solid ${LINE};
  }
  .facts div:last-child { border-right: none; }
  .facts span {
    font-size: 5.9pt; font-weight: 700; letter-spacing: 1.2px;
    text-transform: uppercase; color: ${MUTED}; white-space: nowrap;
  }
  .facts b { font-size: 8.4pt; font-weight: 600; color: ${NAVY}; white-space: nowrap; }
  .client-name { font-size: 10.4pt; font-weight: 700; color: ${NAVY}; letter-spacing: 0.3px; line-height: 1.25; }
  .client-am { font-family: Nyala, Ebrima, sans-serif; font-size: 8pt; color: #4A5768; margin-top: 1px; }
  .client-lines { margin-top: 1.6mm; font-size: 7.4pt; color: #3C4757; line-height: 1.4; }
  .client-lines .k { display: inline-block; min-width: 9mm; color: ${MUTED}; font-size: 7.4pt; letter-spacing: 0.6px; text-transform: uppercase; }
  .site-name { font-size: 10.5pt; font-weight: 600; color: ${NAVY}; }

  /* ── line item tables ───────────────────────────────────────── */
  .table-wrap { border: 1px solid ${LINE}; margin-bottom: 2.2mm; }
  .section-head {
    display: flex; align-items: baseline; gap: 3mm;
    padding: 1.4mm 2.6mm 1.1mm; background: #FBFBFC; border-bottom: 1px solid ${LINE};
  }
  .section-title {
    font-size: 7.4pt; font-weight: 700; letter-spacing: 1.9px;
    text-transform: uppercase; color: ${NAVY};
  }
  .section-sub { font-size: 7.2pt; color: ${MUTED}; }
  .head-rule { flex: 1; height: 1px; background: ${LINE}; }
  table.items { width: 100%; border-collapse: collapse; font-size: 7.9pt; }
  table.items th {
    background: ${NAVY}; color: #fff; font-weight: 600; font-size: 6.6pt;
    letter-spacing: 1.1px; text-transform: uppercase; padding: 1.35mm 2.5mm; text-align: right;
  }
  table.items th.left { text-align: left; }
  table.items td { padding: 1.05mm 2.4mm; text-align: right; border-bottom: 1px solid #EEF0F3; vertical-align: top; }
  table.items td.left { text-align: left; }
  table.items tbody tr:last-child td { border-bottom: 1px solid ${LINE}; }
  .role-name { font-weight: 600; color: ${NAVY}; }
  .role-meta { display: block; font-size: 6.3pt; color: ${MUTED}; letter-spacing: 0.4px; margin-top: 1px; }
  table.items .amount { font-weight: 600; color: ${NAVY}; }
  table.items tfoot td {
    padding: 1.45mm 2.5mm; background: ${PANEL}; font-weight: 700; color: ${NAVY};
    font-size: 8.3pt; border-top: 1.5px solid ${GOLD};
  }

  /* ── price breakdown ────────────────────────────────────────── */
  .breakdown { margin-bottom: 2.2mm; }
  .breakdown-grid { display: grid; grid-template-columns: 1.34fr 0.66fr; gap: 3.6mm; align-items: start; }
  table.breakdown-table { width: 100%; border-collapse: collapse; font-size: 7.5pt; }
  table.breakdown-table th {
    font-size: 6.3pt; font-weight: 700; letter-spacing: 1.3px; text-transform: uppercase;
    color: ${MUTED}; text-align: right; padding: 0 0 1.1mm; border-bottom: 1px solid #D8DCE3;
  }
  table.breakdown-table th.left { text-align: left; }
  table.breakdown-table td { padding: 0.85mm 0; border-bottom: 1px dashed ${LINE}; text-align: right; }
  table.breakdown-table td.left { text-align: left; }
  table.breakdown-table tr:last-child td { border-bottom: none; }
  table.breakdown-table .index { color: ${MUTED}; font-size: 7pt; letter-spacing: 0.8px; width: 7mm; }
  table.breakdown-table .role-inline { font-size: 6.2pt; color: ${MUTED}; margin-left: 1.6mm; letter-spacing: 0.3px; }
  .role-inline { font-size: 6.4pt; color: ${MUTED}; margin-left: 1.8mm; letter-spacing: 0.3px; }
  table.breakdown-table .amount { font-weight: 600; color: ${NAVY}; }

  .totals { background: #fff; border: 1px solid ${LINE}; padding: 1.8mm 2.4mm; }
  .totals .row {
    display: flex; justify-content: space-between; align-items: baseline;
    padding: 0.75mm 0; font-size: 7.6pt; border-bottom: 1px dashed ${LINE};
  }
  .totals .row span { color: #3C4757; }
  .totals .row b { font-weight: 600; color: ${INK}; }
  .totals .row.muted span, .totals .row.muted b { color: ${MUTED}; font-size: 8pt; }
  .totals .grand {
    margin-top: 1.8mm; padding: 1.8mm 2.4mm; background: ${NAVY}; color: #fff;
    display: flex; justify-content: space-between; align-items: center;
  }
  .totals .grand span { font-size: 6.2pt; letter-spacing: 1.1px; white-space: nowrap; text-transform: uppercase; }
  .totals .grand b { font-size: 9.8pt; font-weight: 700; color: ${GOLD_LIGHT}; letter-spacing: 0.3px; }

  /* ── notes & terms ──────────────────────────────────────────── */
  .notes-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 3mm; margin-bottom: 2.2mm; }
  .notes-grid .panel { padding: 1.9mm 2.5mm; }
  .notes-grid ul { margin: 0; padding-left: 3mm; }
  .notes-grid li { font-size: 6.4pt; line-height: 1.3; color: #3C4757; margin-bottom: 0.4mm; }
  .notes-grid li::marker { color: ${GOLD}; }
  .notes-grid strong { color: ${NAVY}; }

  /* ── signatures & stamp ─────────────────────────────────────── */
  .signatures {
    display: grid; grid-template-columns: 1fr 32mm 1fr; gap: 7mm;
    align-items: end; margin-top: auto; padding-top: 3.5mm;
  }
  .sig .sig-title {
    font-size: 6.3pt; font-weight: 700; letter-spacing: 1.7px;
    text-transform: uppercase; color: ${MUTED};
  }
  .sig .sig-space { height: 5mm; }
  .sig .sig-line { border-top: 1px solid #C4CAD3; }
  .sig .sig-name { margin-top: 1.8mm; font-size: 8.8pt; font-weight: 600; color: ${NAVY}; }
  .sig .sig-role { font-size: 7.6pt; color: ${MUTED}; }
  .stamp {
    height: 17mm; border: 1px dashed rgba(201, 162, 39, 0.85);
    background: rgba(201, 162, 39, 0.05);
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.5mm;
  }
  .stamp img { width: 9mm; opacity: 0.35; }
  .stamp span {
    font-size: 6.2pt; font-weight: 700; letter-spacing: 1.7px;
    text-transform: uppercase; color: #A98D3C;
  }

  .foot {
    margin-top: 2mm; padding-top: 1.3mm; border-top: 1px solid ${LINE};
    display: flex; justify-content: space-between; gap: 6mm;
    font-size: 6.8pt; color: #94A0AD; letter-spacing: 0.5px;
  }

  @media print {
    html, body { background: #fff; }
    .sheet { padding: 0; }
    .page { width: 210mm; min-height: 290mm; margin: 0; box-shadow: none; padding: 8mm 12mm 5mm; }
    .watermark { position: fixed; top: 0; right: 0; bottom: 0; left: 0; }
    thead { display: table-header-group; }
    tr, .panel, .signatures { break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="sheet">
  <div class="page">
    <div class="watermark"><img src="${esc(logoUrl())}" alt="" /></div>
    <div class="content">

      <header class="masthead">
        <div class="brand">
          <img class="shield" src="${esc(logoUrl())}" alt="Vital Security" />
          <div class="identity">
            <h1>VITAL GLOBAL TRADING PLC</h1>
            <p class="am">ቪታል ግሎባል ትሬዲንግ ኃ/የተ/የግል ማህበር</p>
            <p class="tagline"><span class="tag-rule"></span>Security · Manpower · Technology</p>
          </div>
        </div>
        <div class="doc">
          <div class="kicker">Quotation</div>
          <h2 class="doc-title">Proforma Invoice</h2>
          <div class="doc-rule"></div>
          <div class="doc-number">${esc(proforma.number)}</div>
          <div class="doc-meta">
            <div><span>Issue date</span><b>${fmtDate(proforma.issueDate)}</b></div>
            <div><span>Valid until</span><b>${fmtDate(proforma.validityDate)}</b></div>
          </div>
        </div>
      </header>

      <div class="rule-gold"></div>

      <section class="panels">
        <div class="panel">
          <div class="label">Billed to</div>
          <div class="client-name">${esc(company?.name ?? 'Client')}</div>
          ${company?.nameAm ? `<div class="client-am">${esc(company.nameAm)}</div>` : ''}
          <div class="client-lines">
            ${company?.address ? `<div>${esc(company.address)}</div>` : ''}
            <div>${esc(addressLine)}</div>
            ${company?.tin ? `<div><span class="k">TIN</span>${esc(company.tin)}${company.registrationNumber ? ` &nbsp;·&nbsp; <span class="k">Reg.</span>${esc(company.registrationNumber)}` : ''}</div>` : ''}
            ${company?.primaryPhone || company?.primaryEmail
              ? `<div>${company?.primaryPhone ? esc(company.primaryPhone) : ''}${company?.primaryPhone && company?.primaryEmail ? ' &nbsp;·&nbsp; ' : ''}${company?.primaryEmail ? esc(company.primaryEmail) : ''}</div>`
              : ''}
          </div>
        </div>
        <div class="panel">
          <div class="label">Service site</div>
          <div class="site-name">${esc(site?.siteName ?? '—')}</div>
          <div class="client-lines">
            ${site?.address ? `<div>${esc(site.address)}</div>` : ''}
            <div>${esc([site?.city || company?.city, site?.region || company?.region].filter(Boolean).join(', '))}</div>
            ${site?.specialRequirements ? `<div><span class="k">Notes</span>${esc(site.specialRequirements)}</div>` : ''}
          </div>
        </div>
      </section>

      <section class="facts">
        <div><span>Service lines</span><b>${items.length}</b></div>
        <div><span>Personnel</span><b>${manpower.length ? qty(manpowerHeadcount) : '—'}</b></div>
        ${technology.length ? `<div><span>Technology units</span><b>${qty(technologyUnits)}</b></div>` : ''}
        <div><span>Valid until</span><b>${fmtDate(proforma.validityDate)}</b></div>
      </section>

      ${manpowerTable}
      ${technologyTable}

      <section class="panel breakdown">
        <div class="label">Price breakdown</div>
        <div class="breakdown-grid">
          <table class="breakdown-table">
            <thead>
              <tr><th class="left">#</th><th class="left">Description</th><th>Qty</th><th>Unit rate</th><th>VAT</th><th>Amount</th></tr>
            </thead>
            <tbody>${breakdownRows}</tbody>
          </table>
          <div class="totals">
            <div class="row"><span>Subtotal (excl. VAT)</span><b>ETB ${money(proforma.subtotal)}</b></div>
            <div class="row"><span>VAT 15%</span><b>ETB ${money(proforma.vatAmount)}</b></div>
            ${exemptTotal > 0 ? `<div class="row muted"><span>VAT base / exempt</span><b class="nowrap">${money(vatBase)} / ${money(exemptTotal)}</b></div>` : ''}
            <div class="grand"><span>Grand total</span><b>ETB ${money(proforma.grandTotal)}</b></div>
          </div>
        </div>
      </section>

      ${
        scopeNotes || terms || clientNotes
          ? `<section class="notes-grid">
              <div class="panel">
                <div class="label">${manpower.length ? 'Deployment &amp; shift notes' : 'Scope of services'}</div>
                <ul>${scopeNotes || clientNotes || '<li>As described in this quotation.</li>'}</ul>
                ${scopeNotes && clientNotes ? `<div class="label" style="margin-top:3mm">Client notes</div><ul>${clientNotes}</ul>` : ''}
              </div>
              <div class="panel">
                <div class="label">Terms</div>
                <ul>${terms}</ul>
              </div>
            </section>`
          : ''
      }

      <section class="signatures">
        <div class="sig">
          <div class="sig-title">For Vital Global Trading PLC</div>
          <div class="sig-space"></div>
          <div class="sig-line"></div>
          <div class="sig-name">Commissioner Getachew Asres</div>
          <div class="sig-role">Deputy CEO</div>
        </div>
        <div class="stamp">
          <img src="${esc(logoUrl())}" alt="" />
          <span>Company stamp</span>
        </div>
        <div class="sig">
          <div class="sig-title">Accepted by client</div>
          <div class="sig-space"></div>
          <div class="sig-line"></div>
          <div class="sig-name">Name &amp; position</div>
          <div class="sig-role">Signature and date</div>
        </div>
      </section>

      <footer class="foot">
        <span>${esc(proforma.number)} · Vital Global Trading PLC · Addis Ababa, Ethiopia</span>
        <span>Security · Manpower · Technology</span>
      </footer>

    </div>
  </div>
</div>
</body>
</html>`;
}

/** Open the document in a new tab and trigger the print dialog (Save as PDF). */
export function printProforma(proforma: Proforma): void {
  const html = buildProformaDocumentHtml(proforma);
  const win = window.open('', '_blank', 'width=1060,height=900');
  if (!win) {
    window.alert('Allow pop-ups for this site to preview the proforma document.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();

  // Wait for the shield mark to load so the letterhead and watermark print.
  let waited = 0;
  const attempt = () => {
    const images = Array.from(win.document.images ?? []);
    const ready = images.every((image) => image.complete);
    if (ready || waited >= 2000) {
      try {
        win.print();
      } catch {
        /* the document stays open so the user can print manually */
      }
      return;
    }
    waited += 120;
    window.setTimeout(attempt, 120);
  };
  window.setTimeout(attempt, 120);
}
