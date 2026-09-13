import React, { useState, useRef } from "react";
import {
  FileText,
  UploadCloud,
  Sparkles,
  Copy,
  Check,
  Printer,
  ShieldAlert,
  FileSearch,
  FolderLock,
  RefreshCw,
  Info,
  Layers,
  Wand2,
  AlignRight,
  Eraser,
  ArrowRight,
  ChevronRight,
  FileDown,
  CheckCircle2,
} from "lucide-react";
import { PdfExtractionResponse, LegalDocument } from "../types";
import { computeSHA256, getPersianNow } from "../utils/crypto";
import { exportToPersianPdf } from "../utils/pdfExport";
import { getApiUrl } from "../config";

interface PdfToTextExtractorProps {
  onSendToRiskAnalysis?: (text: string) => void;
  onSendToSummarizer?: (text: string) => void;
  onSaveDocument?: (doc: Omit<LegalDocument, "id">) => void;
}

const SAMPLE_RUN_ON_CONTRACT = `قرارداد طراحی و توسعه اپلیکیشن موبایل | تاریخ انعقاد: ۱۴۰۵/۰۶/۱۶ | طرفین قرارداد: ۱. کارفرما: شرکت نوآوران فناوری پارس، شناسه ملی: ۱۰۱۰۳۸۹۴۳۲۰؛ ۲. پیمانکار: آقای/خانم علیرضا حسینی، کد ملی: ۰۰۸۴۲۹۵۴۱۱. | ماده ۱ - موضوع قرارداد: پیمانکار متعهد میشود یک اپلیکیشن موبایل تحت عنوان سامانه دادومهر را طبق مشخصات فنی ارائهشده توسط کارفرما طراحی، توسعه و تحویل نماید. | ماده ۲ - مدت قرارداد: مدت اجرای پروژه شش ماه شمسی از تاریخ امضای قرارداد میباشد. در صورت تأخیر به هر دلیلی (اعم از فورسماژور، تغییر نیازمندیها، یا مشکلات فنی)، پیمانکار موظف به پرداخت جریمه روزانه معادل ۲٪ از کل مبلغ قرارداد است. | ماده ۳ - مبلغ و نحوه پرداخت: مبلغ کل قرارداد: ۵۰۰,۰۰۰,۰۰۰ ریال میباشد؛ ۷۰٪ در زمان تحویل نهایی و تأیید کارفرما؛ ۳۰٪ باقیمانده پس از ۶ ماه پشتیبانی رایگان. کارفرما حق دارد تا ۹۰ روز پس از تحویل، پرداخت را بدون هیچگونه جریمه یا بهره به تعویق بیندازد. | ماده ۴ - مالکیت معنوی: تمامی کدها، طراحیها، اسناد فنی و هرگونه دارایی معنوی تولیدشده در این پروژه متعلق به کارفرما است. پیمانکار حق استفاده، بازنشر یا نمایش این محصول در نمونهکارها (portfolio) را ندارد مگر با مجوز کتبی کارفرما. | ماده ۵ - پشتیبانی و نگهداری: پیمانکار موظف است ۱۲ ماه پشتیبانی رایگان شامل رفع باگ و پاسخگویی ۲۴/۷ ارائه دهد. | ماده ۶ - حل اختلاف: هرگونه اختلاف منحصراً در مراجع قضایی تهران و به تشخیص کارفرما حلوفصل خواهد شد. پرداخت کلیه هزینههای دادرسی بر عهده پیمانکار است.`;

const SAMPLE_BROKEN_PDF_TEXT = `م اد ه ۱ - ط رف ی ن ق ر ا ر د ا د : ش ر ك ت م ه ن د س ي پ ي ش ر و (س ه ا م ي خ ا ص) ب ه م د ي ر ي ت ع ا م ل ي آق ا ي م ح م د ر ض ا ك ر ي م ي ب ا ش د . م اد ه ۲ - م ب ل غ ق ر ا ر د ا د : ۵ ۰ ۰ ، ۰ ۰ ۰ ، ۰ ۰ ۰ ر ي ا ل م ق ط و ع . م اد ه ۳ - م د ت : ۶ م ا ه ش م س ي .`;

export const PdfToTextExtractor: React.FC<PdfToTextExtractorProps> = ({
  onSendToRiskAnalysis,
  onSendToSummarizer,
  onSaveDocument,
}) => {
  // Two-page state: 'input' (Page 1) vs 'output' (Page 2)
  const [page, setPage] = useState<"input" | "output">("input");

  const [rawPastedText, setRawPastedText] = useState("");
  const [isRepairing, setIsRepairing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedToVault, setSavedToVault] = useState(false);

  const [repairResult, setRepairResult] = useState<{
    repairedText: string;
    changesSummary: string[];
    detectedIssues: string[];
    documentTitle?: string;
  } | null>(null);

  // File upload state for PDF/image direct extraction
  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRepairText = async (customText?: string) => {
    const textToFix = customText || rawPastedText;
    if (!textToFix.trim()) {
      setError("لطفاً متن مورد نظر را جهت بازسازی وارد فرمایید.");
      return;
    }

    setIsRepairing(true);
    setError(null);
    setSavedToVault(false);
    setPage("output"); // Jump to page 2 to display progress

    try {
      const res = await fetch(getApiUrl("/api/pdf/repair-persian-text"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: textToFix }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || json.details || "خطا در برقراری ارتباط با هوش مصنوعی.");
      }

      setRepairResult({
        repairedText: json.data.repairedText,
        changesSummary: json.data.changesSummary || [
          "رفع به هم ریختگی و اتصال حروف گسسته",
          "قالب‌بندی خط‌به‌خط، مرتب‌سازی بندها و فاصله‌گذاری مناسب چاپ",
          "اصلاح نیم‌فاصله‌ها و حروف عربی به رسم‌الخط معیار فارسی",
        ],
        detectedIssues: json.data.detectedIssues || [],
      });
    } catch (err: any) {
      setError(err.message || "خطا در پردازش متن.");
      setPage("input");
    } finally {
      setIsRepairing(false);
    }
  };

  const handleFileUpload = (selectedFile: File) => {
    setError(null);
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setFileBase64(base64Data);

      // Auto trigger extraction
      setIsUploading(true);
      setPage("output");
      try {
        const res = await fetch(getApiUrl("/api/pdf/extract"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileBase64: base64Data,
            mimeType: selectedFile.type || "application/pdf",
            fileName: selectedFile.name,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "خطا در استخراج فایل");

        setRawPastedText(json.data.fullCleanText);
        setRepairResult({
          repairedText: json.data.fullCleanText,
          changesSummary: [
            `استخراج با دقت ${json.data.confidenceScore}٪ از سند ${json.data.documentTitle || selectedFile.name}`,
            "تصحیح کامل ترتیب کلمات راست‌به‌چپ (RTL)",
            "جداسازی عناوین، مواد و بندهای حقوقی",
          ],
          detectedIssues: [json.data.detectedFontsAndEncoding || "قلم فارسی استاندارد"],
          documentTitle: json.data.documentTitle,
        });
      } catch (err: any) {
        setError(err.message || "خطا در استخراج متن از PDF");
        setPage("input");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleCopy = () => {
    if (!repairResult) return;
    navigator.clipboard.writeText(repairResult.repairedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadPdf = () => {
    if (!repairResult) return;
    exportToPersianPdf({
      title: repairResult.documentTitle || "متن بازسازی شده و سند رسمی",
      category: "بازسازی و قالب‌بندی استاندارد",
      content: repairResult.repairedText,
      datePersian: getPersianNow(),
    });
  };

  const handleSaveToVault = async () => {
    if (!repairResult || !onSaveDocument) return;
    const content = repairResult.repairedText;
    const hash = await computeSHA256(content);
    const now = getPersianNow();

    onSaveDocument({
      title: repairResult.documentTitle || "متن بازسازی شده و استاندارد",
      category: "contract",
      content,
      createdAtPersian: now,
      updatedAtPersian: now,
      status: "reviewed",
      documentHash: hash,
      tags: ["بازسازی متن", "سند رسمی"],
    });

    setSavedToVault(true);
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <FileText className="w-5 h-5" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                بازسازی متن و اصلاح ساختار اسناد و قراردادها
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
              اصلاح به هم ریختگی‌های شایع PDF (حروف گسسته، کلمات وارونه، ی/ک عربی) به همراه
              مرتب‌سازی خط‌به‌خط، فاصله‌گذاری و تفکیک بندها؛ آماده کپی در Word و چاپ رسمی.
            </p>
          </div>

          {/* Navigation Steps Indicator */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl self-start md:self-center shrink-0 text-xs font-bold">
            <button
              onClick={() => setPage("input")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                page === "input"
                  ? "bg-white text-indigo-700 shadow-xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-800 text-[10px] flex items-center justify-center font-mono">
                ۱
              </span>
              <span>متن ورودی</span>
            </button>

            <button
              onClick={() => {
                if (repairResult || isRepairing || isUploading) setPage("output");
              }}
              disabled={!repairResult && !isRepairing && !isUploading}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                page === "output"
                  ? "bg-white text-indigo-700 shadow-xs font-extrabold"
                  : repairResult
                  ? "text-slate-600 hover:text-slate-900 cursor-pointer"
                  : "text-slate-400 cursor-not-allowed opacity-60"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-800 text-[10px] flex items-center justify-center font-mono">
                ۲
              </span>
              <span>خروجی بازسازی شده</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PAGE 1: INPUT BOX & SAMPLES (صفحه اول: ورود متن)         */}
      {/* ======================================================== */}
      {page === "input" && (
        <div className="space-y-4 max-w-4xl mx-auto animate-in fade-in duration-200">
          {repairResult && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-indigo-900">
                <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>شما یک متن بازسازی‌شده در حافظه دارید.</span>
              </div>
              <button
                onClick={() => setPage("output")}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
              >
                <span>مشاهده خروجی بازسازی</span>
                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 space-y-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-indigo-600" />
                <span>متن به هم ریخته یا رشته‌وار را اینجا وارد کنید</span>
              </span>
              <button
                onClick={() => setRawPastedText("")}
                className="text-slate-400 hover:text-slate-600 text-xs flex items-center gap-1 cursor-pointer"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>پاکسازی</span>
              </button>
            </div>

            {/* Main Textarea */}
            <div className="space-y-2">
              <textarea
                value={rawPastedText}
                onChange={(e) => setRawPastedText(e.target.value)}
                rows={10}
                placeholder="متن دارای حروف جداگانه (ق ر ا ر د ا د)، متن‌های کپی‌شده از PDF، یا متن‌های رشته‌وار پشت سر هم که نیاز به بندبندی، خط‌بندی و فاصله‌گذاری دارند را در این کادر Paste نمایید..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 resize-none leading-relaxed font-mono"
              />
            </div>

            {/* Quick Sample Buttons */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-500 block">
                نمونه‌های آماده جهت تست عملکرد بازسازی:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setRawPastedText(SAMPLE_RUN_ON_CONTRACT);
                  }}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-300 text-slate-800 text-right text-xs transition-colors cursor-pointer space-y-1"
                >
                  <span className="font-bold text-indigo-700 block">
                    ۱. متن رشته‌وار و روزنامه‌ای قرارداد (نیاز به تفکیک بندها)
                  </span>
                  <span className="text-slate-500 font-mono text-[10px] line-clamp-2 block leading-relaxed">
                    قرارداد طراحی اپلیکیشن | تاریخ: ۱۴۰۵/۰۶/۱۶ | طرفین... | ماده ۱... | ماده ۲...
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRawPastedText(SAMPLE_BROKEN_PDF_TEXT);
                  }}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-300 text-slate-800 text-right text-xs transition-colors cursor-pointer space-y-1"
                >
                  <span className="font-bold text-indigo-700 block">
                    ۲. متن با حروف گسسته و عربی (م اد ه ۱ - ط رف ی ن)
                  </span>
                  <span className="text-slate-500 font-mono text-[10px] line-clamp-2 block leading-relaxed">
                    م اد ه ۱ - ط رف ی ن ق ر ا ر د ا د : ش ر ك ت م ه ن د س ي پ ي ش ر و...
                  </span>
                </button>
              </div>
            </div>

            {/* Direct PDF / Image Upload Trigger */}
            <div className="border-t border-slate-100 pt-4 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp,image/bmp,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-200"
                >
                  <UploadCloud className="w-4 h-4 text-indigo-600" />
                  <span>آپلود عکس سند یا فایل PDF</span>
                </button>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                پشتیبانی از انواع عکس (PNG/JPG)، اسکن با دوربین و فایل‌های PDF
              </span>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {error}
              </div>
            )}

            {/* Single Primary Action Button: "بازسازی" */}
            <button
              type="button"
              disabled={!rawPastedText.trim() || isRepairing}
              onClick={() => handleRepairText()}
              className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isRepairing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>در حال بازسازی و تنظیم خط‌به‌خط سند...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>بازسازی</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PAGE 2: OUTPUT / RECONSTRUCTED TEXT (صفحه دوم: خروجی با دکمه بازگشت) */}
      {/* ======================================================== */}
      {page === "output" && (
        <div className="space-y-5 animate-in fade-in duration-200 max-w-5xl mx-auto">
          {/* Action Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <button
              onClick={() => setPage("input")}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200 group"
            >
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              <span>بازگشت به متن ورودی</span>
            </button>

            {repairResult && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copied ? "کپی شد" : "کپی متن"}</span>
                </button>

                <button
                  onClick={handleDownloadPdf}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <FileDown className="w-3.5 h-3.5 text-indigo-600" />
                  <span>دانلود PDF</span>
                </button>

                {onSendToRiskAnalysis && (
                  <button
                    onClick={() => onSendToRiskAnalysis(repairResult.repairedText)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                    <span>ممیزی ریسک</span>
                  </button>
                )}

                {onSaveDocument && (
                  <button
                    onClick={handleSaveToVault}
                    disabled={savedToVault}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                      savedToVault
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20"
                    }`}
                  >
                    <FolderLock className="w-3.5 h-3.5" />
                    <span>{savedToVault ? "در بایگانی ذخیره شد" : "ذخیره در بایگانی"}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Loading View */}
          {(isRepairing || isUploading) && (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[400px] space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-800">
                  در حال بازسازی متن و آراستگی ساختار سندی...
                </h4>
                <p className="text-xs text-slate-500">
                  اصلاح کلمات گسسته، تنظیم خط‌به‌خط مواد، فاصله‌گذاری و قالب‌بندی رسمی قرارداد
                </p>
              </div>
            </div>
          )}

          {/* Result Output View */}
          {repairResult && !isRepairing && !isUploading && (
            <div className="space-y-5">
              {/* Summary of improvements */}
              {repairResult.changesSummary && repairResult.changesSummary.length > 0 && (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 sm:p-5 space-y-2 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>بهبودهای اعمال‌شده در چیدمان و رسم‌الخط:</span>
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-emerald-950">
                    {repairResult.changesSummary.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold shrink-0">✓</span>
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Main Formatted Document Paper */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    متن بازسازی‌شده و آراسته (آماده چاپ و استفاده در Word)
                  </span>
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                  </div>
                </div>

                <div className="p-6 sm:p-10">
                  <div className="bg-white text-slate-900 text-xs sm:text-sm leading-loose whitespace-pre-wrap font-sans select-text selection:bg-indigo-100">
                    {repairResult.repairedText}
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-2 flex justify-between items-center flex-wrap gap-3">
                <button
                  onClick={() => setPage("input")}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>بازگشت به متن ورودی</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? "متن کپی شد" : "کپی در کلیپ‌بورد"}</span>
                  </button>

                  <button
                    onClick={handleDownloadPdf}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-indigo-500/20"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>دانلود فایل PDF</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
