const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const md = fs.readFileSync(
  path.join(__dirname, '../.openclaw/workspace/proposals/witchekan-lake-livestream-training-v3.md'),
  'utf8'
);

// Convert markdown to HTML manually (simple but clean)
function mdToHtml(text) {
  return text
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Tables
    .replace(/^\|(.+)\|$/gm, (line) => {
      if (line.match(/^\|[\s\-|]+\|$/)) return ''; // separator row
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
    })
    // Checkmarks
    .replace(/✅/g, '<span class="check">✅</span>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Ordered lists (numbered)
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Code blocks (backtick)
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    // Paragraphs - wrap consecutive non-tag lines
    .split('\n\n')
    .map(para => {
      para = para.trim();
      if (!para) return '';
      if (para.startsWith('<h') || para.startsWith('<hr') || para.startsWith('<blockquote') || para.startsWith('<li') || para.startsWith('<tr')) return para;
      return `<p>${para.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    // Wrap consecutive <tr> in <table>
    .replace(/(<tr>.*<\/tr>\n?)+/g, (match) => `<table>${match}</table>`);
}

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
  
  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  body {
    font-family: 'Inter', Georgia, serif;
    font-size: 11pt;
    line-height: 1.65;
    color: #1a1a1a;
    background: white;
    padding: 0;
  }

  .cover {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    color: white;
    padding: 80px 60px;
    min-height: 200px;
    page-break-after: always;
  }

  .cover h1 {
    font-size: 28pt;
    font-weight: 700;
    letter-spacing: -0.5px;
    margin-bottom: 16px;
    color: white;
    border: none;
  }

  .cover .subtitle {
    font-size: 14pt;
    color: #a0c4ff;
    margin-bottom: 40px;
  }

  .cover .meta {
    font-size: 10pt;
    color: #cbd5e1;
    line-height: 2;
  }

  .cover .accent {
    display: inline-block;
    background: #f59e0b;
    color: #1a1a1a;
    font-weight: 700;
    padding: 6px 16px;
    border-radius: 4px;
    margin-top: 24px;
    font-size: 10pt;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .content {
    padding: 48px 60px;
    max-width: 800px;
    margin: 0 auto;
  }

  h1 { font-size: 20pt; font-weight: 700; color: #0f3460; margin: 32px 0 12px; border-bottom: 3px solid #f59e0b; padding-bottom: 8px; }
  h2 { font-size: 15pt; font-weight: 700; color: #0f3460; margin: 28px 0 10px; border-left: 4px solid #f59e0b; padding-left: 12px; }
  h3 { font-size: 12pt; font-weight: 700; color: #1e3a5f; margin: 20px 0 8px; }
  h4 { font-size: 11pt; font-weight: 600; color: #374151; margin: 16px 0 6px; }

  p { margin: 8px 0 12px; }

  hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0 24px;
    font-size: 10pt;
  }

  table td, table th {
    border: 1px solid #d1d5db;
    padding: 8px 12px;
    text-align: left;
    vertical-align: top;
  }

  table tr:first-child td {
    background: #1e3a5f;
    color: white;
    font-weight: 600;
  }

  table tr:nth-child(even) td {
    background: #f8fafc;
  }

  ul { margin: 8px 0 16px 24px; }
  li { margin: 4px 0; }

  blockquote {
    border-left: 4px solid #f59e0b;
    background: #fffbeb;
    padding: 12px 20px;
    margin: 16px 0;
    font-style: italic;
    color: #374151;
    border-radius: 0 4px 4px 0;
  }

  a { color: #0f3460; }

  .check { color: #16a34a; }

  code {
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: monospace;
    font-size: 9pt;
  }

  .page-break { page-break-before: always; }

  .signature-block {
    margin-top: 40px;
    padding: 24px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    background: #f8fafc;
  }

  .signature-line {
    border-top: 1px solid #374151;
    margin-top: 32px;
    padding-top: 4px;
    font-size: 9pt;
    color: #6b7280;
    width: 260px;
    display: inline-block;
    margin-right: 40px;
  }

  footer {
    text-align: center;
    font-size: 8pt;
    color: #9ca3af;
    padding: 20px 60px;
    border-top: 1px solid #e5e7eb;
    margin-top: 40px;
  }
</style>
</head>
<body>

<div class="cover">
  <div style="font-size:9pt; letter-spacing:2px; text-transform:uppercase; color:#94a3b8; margin-bottom:24px;">IOPPS.ca — Indigenous Online Professional Platform & Services</div>
  <h1>Professional Livestream<br>Production Training</h1>
  <div class="subtitle">4-Day On-Site Certification Program</div>
  <div class="meta">
    <strong>Prepared for:</strong> Witchekan Lake First Nation — Prevention &amp; Wellness Department<br>
    <strong>Prepared by:</strong> Nathan Arias — Founder &amp; CEO, IOPPS.CA<br>
    <strong>Date:</strong> February 2026<br>
    <strong>Reference:</strong> WLFN-LST-2026-001<br>
    <strong>Valid Until:</strong> March 31, 2026
  </div>
  <div class="accent">Investment: $18,000 CAD · Up to 6 Trainees · 24 Hours On-Site</div>
</div>

<div class="content">
${mdToHtml(md)}
</div>

<footer>
  WLFN-LST-2026-001 &nbsp;|&nbsp; Prepared February 2026 &nbsp;|&nbsp; Nathan Arias / IOPPS.ca &nbsp;|&nbsp; nathan.arias@iopps.ca &nbsp;|&nbsp; 306-717-5395 &nbsp;|&nbsp; www.iopps.ca
</footer>

</body>
</html>`;

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const outPath = path.join(__dirname, '../.openclaw/workspace/proposals/Community-Media-Livestream-Training-Proposal-2026.pdf');
  await page.pdf({
    path: outPath,
    format: 'Letter',
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
    printBackground: true,
  });

  await browser.close();
  console.log('✅ PDF saved to:', outPath);
})();
