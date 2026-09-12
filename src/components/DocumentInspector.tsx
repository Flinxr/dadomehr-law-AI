import React, { useState, useRef } from "react";
import {
  FileCheck2,
  UploadCloud,
  Sparkles,
  Copy,
  Check,
  Printer,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Image as ImageIcon,
  FileText,
  HelpCircle,
  Clock,
  ArrowRight,
  ChevronRight,
  FileDown,
  RotateCcw,
  Scale,
  Eye,
  Eraser,
  PenTool,
  BookmarkCheck,
} from "lucide-react";
import { DocumentInspectionResponse, LegalDocument } from "../types";
import { computeSHA256, getPersianNow } from "../utils/crypto";
import { exportToPersianPdf } from "../utils/pdfExport";

interface DocumentInspectorProps {
  onSaveDocument?: (doc: Omit<LegalDocument, "id">) => void;
  onSendToRiskAnalysis?: (text: string) => void;
}

const SAMPLE_HANDWRITTEN_RECEIPT = `رسید دریافت وجه و مبایعه‌نامه دستی
اینجانب احمد مرادی فرزند غلامرضا به شماره ملی ۱۲۳۴۵۶۷۸۹۰ اقرار و اعتراف می‌نمایم که مبلغ ۵۰۰ میلیون تومان نقد و الباقی طی یک فقره چک به شماره ۶۵۴۳۲۱ عهده بانک ملی بابت ثمن معامله یک واحد آپارتمان واقع در خیابان آزادی پلاک ۱۲ از آقای جواد رضایی دریافت نمودم.
همچنین شرط گردید که در صورت برگشت خوردن چک، فروشنده حق فسخ معامله را بدون مراجعه به دادگاه دارد و خریدار حق هیچگونه ادعایی نخواهد داشت.
تاریخ: ۱۴۰۴/۰۵/۱۰
امضای فروشنده: احمد مرادی
(بدون امضای شهود و بدون تاریخ سررسید دقیق چک)`;

const SAMPLE_SUSPICIOUS_POWER_OF_ATTORNEY = `متن وکالت‌نامه بلاعزل فروش
موکل: خانم زهرا صادقی | وکیل: آقای بهرام کاظمی
موضوع وکالت: انجام کلیه امور اداری و همچنین فروش و انتقال قطعی، صلح و واگذاری شش‌دانگ پلاک ثبتی ۹۸۷۶/۵۴ بخش ۱۰ تهران به هر شخص ولو به خود و به هر مبلغ و با حق اسقاط کافه خیارات و اخذ ثمن و عدم نیاز به ارائه حساب دوره وکالت.
تبصره: موکل ضمن عقد خارج لازم حق عزل وکیل و حق ضم وکیل و ناظر را از خود سلب و ساقط نمود.
تاریخ: ۱۴۰۵/۰۱/۱۵`;

export const DocumentInspector: React.FC<DocumentInspectorProps> = ({
  onSaveDocument,
  onSendToRiskAnalysis,
}) => {
  const [page, setPage] = useState<"input" | "output">("input");

  // Inputs
  const [documentText, setDocumentText] = useState("");
  const [inspectionFocus, setInspectionFocus] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DocumentInspectionResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedToVault, setSavedToVault] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    setError(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setFileBase64(b64);
      if (file.type.startsWith("image/")) {
        setFilePreview(b64);
      } else {
        setFilePreview(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setFileBase64(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleInspect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!documentText.trim() && !fileBase64) {
      setError("لطفاً متن سند را وارد کنید یا فایل عکس/PDF آن را آپلود نمایید.");
      return;
    }

    setLoading(true);
    setError(null);
    setSavedToVault(false);
    setPage("output");

    try {
      const res = await fetch("/api/document/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentText: documentText.trim() || undefined,
          fileBase64: fileBase64 || undefined,
          mimeType: selectedFile?.type,
          fileName: selectedFile?.name,
          inspectionFocus: inspectionFocus.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || json.details || "خطا در بررسی و کارشناسی سند");
      }

      setResult(json.data);
    } catch (err: any) {
      setError(err.message || "خطا در کارشناسی هوشمند سند.");
      setPage("input");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyReport = () => {
    if (!result) return;
    const text = `گزارش کارشناسی و بررسی اصالت سند: ${result.documentTitle}
شاخص اصالت و سلامت شکلی: ${result.authenticityAndFormatScore} از ۱۰۰
وضعیت کلی: ${getVerdictMeta(result.overallVerdict).label}

خلاصه ارزیابی کارشناسی:
${result.verdictSummary}

ایرادات و نقایص شکلی:
${result.formalDefects.map((d, i) => `${i + 1}. ${d}`).join("\n")}

ریسک‌ها و هشدارهای ماهوی:
${result.substantiveRisks.map((r, i) => `${i + 1}. ${r}`).join("\n")}

بررسی وضعیت امضاها، مهرها و دست‌خط:
${result.stampsAndSignaturesAudit.map((s, i) => `${i + 1}. ${s}`).join("\n")}

تطبیق با قوانین موضوعه:
${result.statutoryComplianceNotes.map((c, i) => `${i + 1}. ${c}`).join("\n")}

اقدامات و توصیه‌های تکمیلی:
${result.actionableRecommendations.map((a, i) => `${i + 1}. ${a}`).join("\n")}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadPdf = () => {
    if (!result) return;
    const content = `گزارش کارشناسی رسمی و اعتبارسنجی سند
عنوان سند: ${result.documentTitle}
دسته سند: ${result.documentCategory}
امتیاز اصالت و صحت شکلی: ${result.authenticityAndFormatScore} از ۱۰۰
نتیجه نهایی: ${getVerdictMeta(result.overallVerdict).label}

۱. خلاصه رای کارشناسی:
${result.verdictSummary}

۲. مشخصات و ارکان استخراج‌شده:
- طرفین: ${result.extractedParties.join(" | ") || "ذکر نشده"}
- تاریخ‌ها: ${result.extractedDates.join(" | ") || "ذکر نشده"}
- مبالغ مندرج: ${result.extractedAmounts.join(" | ") || "ذکر نشده"}

۳. ایرادات شکلی و نگارشی:
${result.formalDefects.map((f, i) => `${i + 1}- ${f}`).join("\n")}

۴. خطرات ماهوی و حقوقی:
${result.substantiveRisks.map((r, i) => `${i + 1}- ${r}`).join("\n")}

۵. ممیزی امضاها، مهرها و دست‌نویس‌ها:
${result.stampsAndSignaturesAudit.map((s, i) => `${i + 1}- ${s}`).join("\n")}

۶. تطبیق با قوانین آمره و شرایط صحت معامله:
${result.statutoryComplianceNotes.map((c, i) => `${i + 1}- ${c}`).join("\n")}

۷. توصیه‌ها و اقدامات اصلاحی لازم:
${result.actionableRecommendations.map((a, i) => `${i + 1}- ${a}`).join("\n")}`;

    exportToPersianPdf({
      title: `گزارش بررسی اصالت و ممیزی سند (${result.documentTitle})`,
      category: "کارشناسی اصالت سند",
      content,
      datePersian: getPersianNow(),
    });
  };

  const handleSaveToVault = async () => {
    if (!result || !onSaveDocument) return;

    const content = `گزارش کارشناسی و بررسی سند: ${result.documentTitle}
شاخص سلامت شکلی: ${result.authenticityAndFormatScore}/۱۰۰
وضعیت: ${getVerdictMeta(result.overallVerdict).label}

خلاصه رای:
${result.verdictSummary}

ایرادات شکلی:
${result.formalDefects.join("\n")}

خطرات ماهوی:
${result.substantiveRisks.join("\n")}

توصیه‌ها:
${result.actionableRecommendations.join("\n")}`;

    const hash = await computeSHA256(content);
    const now = getPersianNow();

    onSaveDocument({
      title: `بررسی اصالت: ${result.documentTitle}`,
      category: "advisory",
      content,
      createdAtPersian: now,
      updatedAtPersian: now,
      status: "reviewed",
      documentHash: hash,
      tags: ["بررسی سند", "کارشناسی اصالت", result.documentCategory],
    });

    setSavedToVault(true);
  };

  const getVerdictMeta = (verdict: string) => {
    switch (verdict) {
      case "valid":
        return {
          label: "معتبر و دارای ارکان صحیح",
          badgeColor: "bg-emerald-500/10 text-emerald-800 border-emerald-300",
          icon: ShieldCheck,
          textColor: "text-emerald-700",
          bgGlow: "bg-emerald-50",
        };
      case "suspicious":
        return {
          label: "دارای ابهام یا موارد مشکوک",
          badgeColor: "bg-amber-500/10 text-amber-800 border-amber-300",
          icon: AlertTriangle,
          textColor: "text-amber-700",
          bgGlow: "bg-amber-50",
        };
      case "defective":
        return {
          label: "دارای نقص شکلی یا ابطال‌پذیری",
          badgeColor: "bg-rose-500/10 text-rose-800 border-rose-300",
          icon: AlertOctagon,
          textColor: "text-rose-700",
          bgGlow: "bg-rose-50",
        };
      case "high_risk":
      default:
        return {
          label: "بسیار پرخطر یا فاقد ضمانت اجرایی",
          badgeColor: "bg-red-500/10 text-red-800 border-red-300",
          icon: ShieldAlert,
          textColor: "text-red-700",
          bgGlow: "bg-red-50",
        };
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Step Navigation Pill Header */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-100">
            <FileCheck2 className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              بررسی و کارشناسی اصالت سند
            </h2>
            <p className="text-xs text-slate-500">
              اعتبارسنجی شکلی و ماهوی قراردادها، اسناد دست‌نویس، رسیدها، چک و وکالت‌نامه‌ها
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold shrink-0">
          <button
            onClick={() => setPage("input")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              page === "input"
                ? "bg-white text-teal-800 shadow-xs font-extrabold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 text-[10px] flex items-center justify-center font-mono">
              ۱
            </span>
            <span>ورود سند / فایل</span>
          </button>

          <button
            onClick={() => {
              if (result || loading) setPage("output");
            }}
            disabled={!result && !loading}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              page === "output"
                ? "bg-white text-teal-800 shadow-xs font-extrabold"
                : result
                ? "text-slate-600 hover:text-slate-900 cursor-pointer"
                : "text-slate-400 cursor-not-allowed opacity-60"
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 text-[10px] flex items-center justify-center font-mono">
              ۲
            </span>
            <span>گزارش کارشناسی</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PAGE 1: INPUT FORM                                       */}
      {/* ======================================================== */}
      {page === "input" && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {result && (
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-teal-900">
                <Check className="w-4 h-4 text-teal-600 shrink-0" />
                <span>شما یک گزارش کارشناسی سند در حافظه دارید ({result.documentTitle}).</span>
              </div>
              <button
                onClick={() => setPage("output")}
                className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
              >
                <span>مشاهده گزارش</span>
                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 space-y-5 shadow-sm">
            {/* File Upload / Drag & Drop Area */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                آپلود عکس، اسکن یا فایل PDF سند (شناسایی متن، مهرها، دست‌نویس و امضا)
              </label>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer ${
                  isDragOver
                    ? "border-teal-500 bg-teal-50/50"
                    : selectedFile
                    ? "border-teal-400 bg-teal-50/20"
                    : "border-slate-300 hover:border-teal-400 bg-slate-50/60 hover:bg-slate-50"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp,image/bmp,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                {selectedFile ? (
                  <div className="flex flex-col items-center gap-3">
                    {filePreview ? (
                      <div className="relative group">
                        <img
                          src={filePreview}
                          alt="پیش‌نمایش سند"
                          className="max-h-48 rounded-xl object-contain border border-slate-200 shadow-xs"
                        />
                        <div className="text-[11px] text-slate-500 mt-1.5 font-mono">
                          {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
                        <FileText className="w-6 h-6 text-teal-600" />
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-800">{selectedFile.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {(selectedFile.size / 1024).toFixed(1)} KB - آماده بررسی
                          </p>
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearFile();
                      }}
                      className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <Eraser className="w-3.5 h-3.5" />
                      <span>حذف و انتخاب فایل دیگر</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 py-3">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-slate-800">
                      عکس، اسکن یا فایل سند را اینجا بکشید یا برای انتخاب کلیک کنید
                    </div>
                    <div className="text-[11px] text-slate-400">
                      پشتیبانی از عکس‌های گرفته‌شده با گوشی (JPG, PNG)، اسکن‌های دست‌نویس و PDF
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Divider OR Text Input */}
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-xs font-medium text-slate-400">
                یا متن سند را دستی وارد کنید
              </span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Manual Textarea */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800">
                  متن سند / قرارداد / رسید دست‌نویس
                </label>
                {documentText && (
                  <button
                    type="button"
                    onClick={() => setDocumentText("")}
                    className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    <span>پاک کردن متن</span>
                  </button>
                )}
              </div>
              <textarea
                rows={6}
                value={documentText}
                onChange={(e) => setDocumentText(e.target.value)}
                placeholder="متن کامل یا گزیده‌ای از سند، قرارداد، صلح‌نامه، رسید دستی یا اظهارنامه را در این بخش تایپ یا الصاق نمایید..."
                className="w-full text-xs sm:text-sm p-4 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 leading-relaxed font-mono"
              />
            </div>

            {/* Special Inspection Focus (Optional) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                دغدغه یا محور خاصی مدنظرتان است؟ (اختیاری)
              </label>
              <input
                type="text"
                value={inspectionFocus}
                onChange={(e) => setInspectionFocus(e.target.value)}
                placeholder="مثال: آیا این چک قابلیت شکایت کیفری دارد؟ / آیا این وکالت‌نامه خطر تصاحب ملک را دارد؟"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            {/* Samples */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-slate-500 block">
                نمونه‌های آماده جهت آزمایش کارشناسی:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setDocumentText(SAMPLE_HANDWRITTEN_RECEIPT);
                    setInspectionFocus("بررسی اعتبار رسید دست‌نویس و شرط فسخ خارج از دادگاه");
                  }}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-teal-50/70 border border-slate-200 hover:border-teal-300 text-slate-800 text-right text-xs transition-colors cursor-pointer space-y-1"
                >
                  <span className="font-bold text-teal-800 block">
                    ۱. رسید دریافت وجه و بیع دستی (نقص امضای شهود و شرط فاسخ)
                  </span>
                  <span className="text-slate-500 font-mono text-[10px] line-clamp-2 block leading-relaxed">
                    اینجانب احمد مرادی اقرار به دریافت ۵۰۰ میلیون تومان نقد و الباقی چک...
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDocumentText(SAMPLE_SUSPICIOUS_POWER_OF_ATTORNEY);
                    setInspectionFocus("بررسی خطرات انتقال به خود و عدم ارائه حساب");
                  }}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-teal-50/70 border border-slate-200 hover:border-teal-300 text-slate-800 text-right text-xs transition-colors cursor-pointer space-y-1"
                >
                  <span className="font-bold text-teal-800 block">
                    ۲. وکالت‌نامه بلاعزل فروش ملک (خطر سلب حقوق موکل)
                  </span>
                  <span className="text-slate-500 font-mono text-[10px] line-clamp-2 block leading-relaxed">
                    وکالت به هر شخص ولو به خود، اسقاط کافه خیارات، عدم نیاز به ارائه حساب...
                  </span>
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="button"
              disabled={(!documentText.trim() && !fileBase64) || loading}
              onClick={() => handleInspect()}
              className="w-full py-3.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-700/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-teal-200" />
              <span>شروع بررسی، اعتبارسنجی و کارشناسی رسمی سند</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PAGE 2: OUTPUT & EXPERT REPORT                           */}
      {/* ======================================================== */}
      {page === "output" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Actions Row */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setPage("input")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>بازگشت به ورود سند</span>
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center shadow-xs space-y-6">
              <div className="relative w-16 h-16 mx-auto">
                <div className="w-16 h-16 rounded-full border-4 border-teal-200 border-t-teal-700 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileCheck2 className="w-6 h-6 text-teal-700" />
                </div>
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-sm font-bold text-slate-800">
                  در حال کارشناسی اصالت، خطوط و ارکان حقوقی سند...
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  هوش مصنوعی در حال تطبیق با ماده ۱۹۰ قانون مدنی، بررسی صحت امضاها و مهرها و شناسایی شروط باطل یا مبطل است.
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="bg-white rounded-2xl p-8 border border-rose-200 text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">خطا در کارشناسی سند</h3>
              <p className="text-xs text-rose-700 max-w-md mx-auto">{error}</p>
              <button
                onClick={() => setPage("input")}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition inline-flex items-center gap-2 cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>بازگشت و انتخاب مجدد</span>
              </button>
            </div>
          )}

          {/* Success Result View */}
          {!loading && result && (
            <div className="space-y-6">
              {/* Verdict Banner Card */}
              {(() => {
                const meta = getVerdictMeta(result.overallVerdict);
                const Icon = meta.icon;
                return (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${meta.badgeColor}`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{meta.label}</span>
                          </span>
                          <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
                            دسته: {result.documentCategory}
                          </span>
                        </div>
                        <h2 className="text-base sm:text-lg font-bold text-slate-900">
                          {result.documentTitle}
                        </h2>
                      </div>

                      {/* Score Badge */}
                      <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 shrink-0">
                        <div className="text-center">
                          <span className="text-[10px] text-slate-400 block font-medium">
                            شاخص اصالت و سلامت شکلی
                          </span>
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="text-2xl font-black text-slate-900">
                              {result.authenticityAndFormatScore}
                            </span>
                            <span className="text-xs text-slate-400">/ ۱۰۰</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Verdict Summary */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs sm:text-sm text-slate-800 leading-relaxed">
                      <span className="font-bold text-slate-900 block mb-1">
                        خلاصه نظر کارشناسی:
                      </span>
                      {result.verdictSummary}
                    </div>

                    {/* Toolbar Actions */}
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <button
                        onClick={handleCopyReport}
                        className="px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        <span>{copied ? "کپی شد" : "کپی گزارش"}</span>
                      </button>

                      <button
                        onClick={handleDownloadPdf}
                        className="px-3.5 py-2 rounded-xl text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileDown className="w-4 h-4 text-rose-600" />
                        <span>دانلود PDF کارشناسی</span>
                      </button>

                      <button
                        onClick={() => window.print()}
                        className="px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-4 h-4 text-slate-600" />
                        <span>چاپ</span>
                      </button>

                      {onSaveDocument && (
                        <button
                          onClick={handleSaveToVault}
                          disabled={savedToVault}
                          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                            savedToVault
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200"
                          }`}
                        >
                          <BookmarkCheck className="w-4 h-4 text-teal-600" />
                          <span>{savedToVault ? "در آرشیو ذخیره شد" : "ذخیره در آرشیو"}</span>
                        </button>
                      )}

                      {onSendToRiskAnalysis && (
                        <button
                          onClick={() => {
                            if (documentText) onSendToRiskAnalysis(documentText);
                            else if (result.verdictSummary) onSendToRiskAnalysis(result.verdictSummary);
                          }}
                          className="px-3.5 py-2 rounded-xl text-xs font-medium bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition flex items-center gap-1.5 cursor-pointer mr-auto"
                        >
                          <ShieldAlert className="w-4 h-4 text-amber-600" />
                          <span>انتقال به ممیزی ریسک قرارداد</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* 3-Column Quick Extracted Pillars */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1.5 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 block">
                    اشخاص و طرفین شناسایی‌شده:
                  </span>
                  {result.extractedParties && result.extractedParties.length > 0 ? (
                    <ul className="text-xs text-slate-800 space-y-1">
                      {result.extractedParties.map((p, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-xs text-slate-400">طرف مشخصی استخراج نشد</span>
                  )}
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1.5 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 block">
                    تاریخ‌ها و مواعد زمانی:
                  </span>
                  {result.extractedDates && result.extractedDates.length > 0 ? (
                    <ul className="text-xs text-slate-800 space-y-1">
                      {result.extractedDates.map((d, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-xs text-slate-400">تاریخ معینی ذکر نشده است</span>
                  )}
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1.5 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 block">
                    مبالغ مالی و اسناد تجاری:
                  </span>
                  {result.extractedAmounts && result.extractedAmounts.length > 0 ? (
                    <ul className="text-xs text-slate-800 space-y-1">
                      {result.extractedAmounts.map((a, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-xs text-slate-400">مبلغی درج نشده است</span>
                  )}
                </div>
              </div>

              {/* Two Column Detailed Audit */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Formal Defects */}
                <div className="bg-white p-5 rounded-2xl border border-rose-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs sm:text-sm border-b border-rose-100 pb-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>ایرادات و نقایص شکلی (Formal Defects)</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
                    {result.formalDefects.map((def, i) => (
                      <li key={i} className="flex items-start gap-2 bg-rose-50/50 p-2.5 rounded-xl border border-rose-100">
                        <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span>{def}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Substantive Risks */}
                <div className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs sm:text-sm border-b border-amber-100 pb-2.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>خطرات ماهوی و حقوقی (Substantive Risks)</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
                    {result.substantiveRisks.map((risk, i) => (
                      <li key={i} className="flex items-start gap-2 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Stamps, Signatures & Handwriting Audit */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm border-b border-slate-100 pb-2.5">
                    <PenTool className="w-4 h-4 text-teal-600" />
                    <span>ممیزی امضاها، مهرها و دست‌نویس‌ها</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
                    {result.stampsAndSignaturesAudit.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0 mt-2" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Statutory Compliance Notes */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm border-b border-slate-100 pb-2.5">
                    <Scale className="w-4 h-4 text-indigo-600" />
                    <span>تطبیق با شرایط صحت معاملات (ماده ۱۹۰ ق.م)</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
                    {result.statutoryComplianceNotes.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 bg-indigo-50/40 p-2.5 rounded-xl border border-indigo-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0 mt-2" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Actionable Recommendations */}
              <div className="bg-white p-5 rounded-2xl border border-teal-200 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-teal-900 font-bold text-xs sm:text-sm border-b border-teal-100 pb-2.5">
                  <BookmarkCheck className="w-4 h-4 text-teal-700" />
                  <span>توصیه‌ها و اقدامات تکمیلی و اصلاحی لازم</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.actionableRecommendations.map((rec, i) => (
                    <div key={i} className="p-3 bg-teal-50/50 rounded-xl border border-teal-100 flex items-start gap-2 text-xs text-teal-950 leading-relaxed">
                      <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
