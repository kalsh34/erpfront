/**
 * Payroll export helpers — CSV payroll register + printable payslip window.
 * Both operate on data the run detail already fetched (no extra API surface).
 */

import api from '../../lib/api';

/** Download a remote binary/CSV file through authenticated API */
export async function downloadReport(url: string, filename: string) {
  const res = await api.get(url, { responseType: 'blob' });
  const blob = new Blob([res.data]);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/** Download a 2D array as CSV (UTF-8 BOM so Excel opens it cleanly). */
export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v);
    return /["\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(esc).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const PAYSLIP_CSS = `
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; margin: 32px; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  .sub { color: #666; font-size: 12px; margin-bottom: 16px; }
  .head { display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  td, th { padding: 5px 8px; font-size: 12px; text-align: left; border-bottom: 1px solid #eee; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  tr.strong td { font-weight: 700; border-top: 2px solid #333; }
  .net { background: #eff6ff; }
  .net td { font-weight: 800; font-size: 14px; }
  .muted { color: #777; }
  .badge { display: inline-block; border: 1px solid #ccc; border-radius: 10px; padding: 1px 8px; font-size: 10px; }
  @media print { body { margin: 12mm; } }
`;

/**
 * Open a self-contained payslip window and trigger print.
 * `sections` are rendered in order; each row is [label, value, strong?].
 */
export function printPayslip(opts: {
  title: string;
  periodLabel: string;
  employeeLine: string;
  meta?: [string, string][];
  sections: { heading: string; rows: [string, string, boolean?][] }[];
  footer?: string;
}) {
  const win = window.open('', '_blank', 'width=820,height=940');
  if (!win) return;
  const rowsHtml = opts.sections
    .map(
      (s) => `
    <table>
      <tr><th colspan="2" style="border-bottom:1px solid #2563eb">${s.heading}</th></tr>
      ${s.rows
        .map(
          ([l, v, strong]) =>
            `<tr class="${strong ? 'strong' : ''}${l.toLowerCase().includes('net') ? ' net' : ''}"><td>${l}</td><td class="num">${v}</td></tr>`
        )
        .join('')}
    </table>`
    )
    .join('');
  const metaHtml = (opts.meta || [])
    .map(([l, v]) => `<span class="muted">${l}: <b>${v}</b></span>`)
    .join(' &nbsp;·&nbsp; ');
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${opts.title}</title><style>${PAYSLIP_CSS}</style></head><body>
    <div class="head">
      <div><h1>Vital Security — Payslip</h1><div class="sub">${opts.employeeLine}</div></div>
      <div style="text-align:right"><h1>${opts.periodLabel}</h1><div class="sub">${new Date().toLocaleString()}</div></div>
    </div>
    ${metaHtml ? `<p style="font-size:12px">${metaHtml}</p>` : ''}
    ${rowsHtml}
    ${opts.footer ? `<p class="muted" style="font-size:10px">${opts.footer}</p>` : ''}
    <script>window.onload = function(){ window.print(); };</script>
  </body></html>`);
  win.document.close();
}
