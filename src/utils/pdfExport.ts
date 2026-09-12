/**
 * PDF Export Utility for Iranian Legal Documents & Contracts
 * Generates an isolated, styled printable document optimized for Save as PDF
 */
export function exportToPersianPdf(options: {
  title: string;
  category?: string;
  content: string;
  datePersian?: string;
  caseNumber?: string;
  extraMeta?: Record<string, string>;
}) {
  const { title, category = "سند حقوقی و رسمی", content, datePersian, caseNumber, extraMeta } = options;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("لطفاً اجازه باز شدن پاپ‌آپ را در مرورگر خود بدهید.");
    return;
  }

  // Convert markdown/newlines to clean HTML paragraphs & headers
  const formattedContent = content
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return '<div style="height: 12px;"></div>';
      }
      if (trimmed.startsWith("### ") || trimmed.startsWith("ماده ")) {
        return `<h3 style="font-size: 14pt; font-weight: bold; color: #1e293b; margin-top: 18px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">${trimmed.replace(/^###\s*/, "")}</h3>`;
      }
      if (trimmed.startsWith("## ") || trimmed.startsWith("فصل ")) {
        return `<h2 style="font-size: 16pt; font-weight: bold; color: #0f172a; margin-top: 24px; margin-bottom: 10px;">${trimmed.replace(/^##\s*/, "")}</h2>`;
      }
      if (trimmed.startsWith("# ")) {
        return `<h1 style="font-size: 18pt; font-weight: 800; color: #0f172a; text-align: center; margin-bottom: 16px;">${trimmed.replace(/^#\s*/, "")}</h1>`;
      }
      if (trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ")) {
        return `<li style="margin-right: 20px; line-height: 2; margin-bottom: 4px;">${trimmed.substring(2)}</li>`;
      }
      if (/^\d+[\.\-]\s/.test(trimmed)) {
        return `<div style="margin-right: 12px; line-height: 2; margin-bottom: 6px;"><strong>${trimmed}</strong></div>`;
      }
      if (trimmed.includes("امضای طرفین") || trimmed.includes("کارفرما:") || trimmed.includes("پیمانکار:")) {
        return `<div style="line-height: 2.4; font-weight: bold; color: #1e293b; margin-top: 12px;">${trimmed}</div>`;
      }
      return `<p style="line-height: 2.1; margin-bottom: 8px; text-align: justify; text-justify: inter-word;">${trimmed}</p>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @import url('https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css');
    
    @page {
      size: A4 portrait;
      margin: 20mm 15mm 20mm 15mm;
    }
    
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    body {
      font-family: 'Vazirmatn', Tahoma, Arial, sans-serif;
      font-size: 11pt;
      color: #1e293b;
      background: #ffffff;
      margin: 0;
      padding: 20px;
      direction: rtl;
    }
    
    .doc-container {
      max-width: 100%;
      margin: 0 auto;
      border: 1px solid #cbd5e1;
      padding: 30px;
      border-radius: 4px;
      position: relative;
    }
    
    .doc-header {
      border-bottom: 2px solid #334155;
      padding-bottom: 15px;
      margin-bottom: 25px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .doc-title-box {
      text-align: center;
      flex: 1;
    }
    
    .doc-title-box h1 {
      font-size: 16pt;
      margin: 0 0 6px 0;
      color: #0f172a;
      font-weight: 800;
    }
    
    .doc-title-box span {
      font-size: 10pt;
      color: #64748b;
    }
    
    .meta-box {
      font-size: 9pt;
      color: #475569;
      line-height: 1.8;
      border: 1px solid #e2e8f0;
      padding: 8px 12px;
      border-radius: 6px;
      background: #f8fafc;
      min-width: 170px;
    }
    
    .content-body {
      font-size: 11pt;
      line-height: 2.1;
      color: #1e293b;
    }
    
    .doc-footer {
      margin-top: 40px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 15px;
      font-size: 8.5pt;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .signatures-box {
      margin-top: 40px;
      padding-top: 20px;
      display: flex;
      justify-content: space-around;
      text-align: center;
      page-break-inside: avoid;
    }

    .signature-slot {
      min-width: 180px;
      border-top: 1px dotted #94a3b8;
      padding-top: 8px;
      font-weight: bold;
      font-size: 10pt;
    }
    
    @media print {
      body {
        padding: 0;
      }
      .doc-container {
        border: none;
        padding: 0;
      }
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="no-print" style="background: #eef2ff; border: 1px solid #c7d2fe; padding: 12px 18px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
    <span style="font-size: 10pt; color: #3730a3; font-weight: bold;">پیش‌نمایش سند آماده چاپ و ذخیره به صورت PDF</span>
    <button onclick="window.print()" style="background: #4338ca; color: white; border: none; padding: 8px 18px; border-radius: 6px; font-family: inherit; font-size: 10pt; font-weight: bold; cursor: pointer;">
      چاپ و ذخیره PDF (Print / Save as PDF)
    </button>
  </div>

  <div class="doc-container">
    <div class="doc-header">
      <div class="meta-box">
        <div><strong>دسته‌بندی:</strong> ${category}</div>
        ${datePersian ? `<div><strong>تاریخ تنظیم:</strong> ${datePersian}</div>` : ""}
        ${caseNumber ? `<div><strong>شماره پیگیری/کلاسه:</strong> ${caseNumber}</div>` : ""}
      </div>
      
      <div class="doc-title-box">
        <div style="font-size: 10pt; color: #475569; margin-bottom: 4px;">بسمه تعالی</div>
        <h1>${title}</h1>
        <span>سامانه هوشمند حقوقی دادومهر</span>
      </div>

      <div style="width: 170px; text-align: left; font-size: 8.5pt; color: #94a3b8;">
        <div>نسخه رسمی استاندارد</div>
        <div>دارای اعتبار نگارش حقوقی</div>
      </div>
    </div>

    <div class="content-body">
      ${formattedContent}
    </div>

    <div class="doc-footer">
      <span>تنظیم و اعتبارسنجی شده توسط هوش مصنوعی دادومهر</span>
      <span>صفحه ۱ از ۱</span>
    </div>
  </div>

  <script>
    window.onload = function() {
      // Auto trigger print dialog after rendering
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
