import React, { useState } from "react";
import {
  FileSignature,
  Sparkles,
  BookOpen,
  ShieldCheck,
  Send,
  Copy,
  Check,
  Printer,
  FileCheck,
  ShieldAlert,
  Edit3,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Scale,
  ArrowRight,
  ChevronRight,
  FolderLock,
  FileDown,
} from "lucide-react";
import { ContractDraftResponse, LegalDocument } from "../types";
import { computeSHA256, getPersianNow } from "../utils/crypto";
import { exportToPersianPdf } from "../utils/pdfExport";

interface ContractDrafterProps {
  onSaveDocument: (doc: Omit<LegalDocument, "id">) => void;
  onSendToRiskAnalysis: (contractText: string) => void;
}

export const ContractDrafter: React.FC<ContractDrafterProps> = ({
  onSaveDocument,
  onSendToRiskAnalysis,
}) => {
  // Form State
  const [topic, setTopic] = useState("");
  const [party1, setParty1] = useState("");
  const [party2, setParty2] = useState("");
  const [duration, setDuration] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [obligationsParty1, setObligationsParty1] = useState("");
  const [obligationsParty2, setObligationsParty2] = useState("");
  const [guarantees, setGuarantees] = useState("");
  const [disputeResolution, setDisputeResolution] = useState("داوری مرکز داوری کانون وکلای دادگستری");
  const [governingArticles, setGoverningArticles] = useState("ماده ۱۰، ۲۱۹، ۲۲۰ و ۲۳۰ قانون مدنی");
  const [additionalClauses, setAdditionalClauses] = useState("");

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ContractDraftResponse | null>(null);
  const [editableContract, setEditableContract] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedToVault, setSavedToVault] = useState(false);

  // Two-page architecture: 'input' (Page 1) vs 'output' (Page 2)
  const [page, setPage] = useState<"input" | "output">("input");

  const handleDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError("لطفاً موضوع کلی قرارداد را وارد نمایید.");
      return;
    }

    setLoading(true);
    setError(null);
    setSavedToVault(false);
    setPage("output"); // Navigate to output page immediately to show progress

    try {
      const res = await fetch("/api/contract/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          party1,
          party2,
          duration,
          amount,
          paymentTerms,
          obligationsParty1,
          obligationsParty2,
          guarantees,
          disputeResolution,
          governingArticles,
          additionalClauses,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || json.details || "خطا در برقراری ارتباط با سرور");
      }

      setResult(json.data);
      setEditableContract(json.data.contractText);
    } catch (err: any) {
      setError(err.message || "خطا در تولید قرارداد با هوش مصنوعی.");
      setPage("input"); // Return to input on failure
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = editableContract || result?.contractText || "";
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadPdf = () => {
    const text = editableContract || result?.contractText || "";
    if (!text) return;
    exportToPersianPdf({
      title: result?.title || topic || "متن رسمی قرارداد",
      category: result?.detectedContractType || "قرارداد رسمی و الزام‌آور",
      content: text,
      datePersian: getPersianNow(),
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveToVault = async () => {
    if (!result) return;
    const content = editableContract || result.contractText;
    const hash = await computeSHA256(content);
    const now = getPersianNow();

    onSaveDocument({
      title: result.title || topic,
      category: "contract",
      content,
      createdAtPersian: now,
      updatedAtPersian: now,
      status: "draft",
      documentHash: hash,
      tags: ["قرارداد رسمی", (result.detectedContractType || "عقد حقوقی").slice(0, 20)],
    });

    setSavedToVault(true);
  };

  return (
    <div className="space-y-6">
      {/* Introduction Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <FileSignature className="w-5 h-5" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                تنظیم هوشمند قرارداد منطبق با موازین حقوقی ایران
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
              تنظیم خودکار متن رسمی قرارداد با استناد به ماده ۱۰ و باب عقود معین قانون مدنی، قوانین روابط موجر و مستاجر،
              قانون تجارت و مقررات داوری. دارای ساختار محکم، ضمانت اجرا و شروط تحدید مسئولیت.
            </p>
          </div>

          {/* Step Indicator Tabs */}
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
              <span>مشخصات و ارکان</span>
            </button>

            <button
              onClick={() => {
                if (result || loading) setPage("output");
              }}
              disabled={!result && !loading}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                page === "output"
                  ? "bg-white text-indigo-700 shadow-xs font-extrabold"
                  : result
                  ? "text-slate-600 hover:text-slate-900 cursor-pointer"
                  : "text-slate-400 cursor-not-allowed opacity-60"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-800 text-[10px] flex items-center justify-center font-mono">
                ۲
              </span>
              <span>پیش‌نویس نهایی سند</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PAGE 1: INPUT FORM (صفحه اول: ورود مشخصات قرارداد)         */}
      {/* ======================================================== */}
      {page === "input" && (
        <div className="space-y-4 max-w-4xl mx-auto animate-in fade-in duration-200">
          {result && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-indigo-900">
                <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>شما یک قرارداد تنظیم‌شده ({result.title}) در حافظه دارید.</span>
              </div>
              <button
                onClick={() => setPage("output")}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
              >
                <span>مشاهده متن قرارداد</span>
                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>
          )}

          <form
            onSubmit={handleDraft}
            className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 space-y-5 shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                <span>مشخصات و ارکان قرارداد</span>
              </span>
              <span className="text-xs text-slate-400">فیلدهای دارای ستاره الزامی است</span>
            </div>

            {/* Topic & Comprehensive Description */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                موضوع کلی و شرح توافقات قرارداد <span className="text-indigo-600">*</span>
              </label>

              {/* Prominent Guidance Sub-Header */}
              <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-3.5 text-xs text-indigo-950 leading-relaxed space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-indigo-700">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>راهنمای نگارش آسان با تشخیص خودکار قالب حقوقی:</span>
                </div>
                <p className="text-[11px] text-indigo-900/90 leading-relaxed">
                  کافیست خواسته خود را حتی به زبان عامیانه و روان بنویسید (مثلاً: «می‌خواهم کارمند فروش با حقوق ثابت و پورسانت استخدام کنم و سفته ۱۰ میلیونی ضمانت حسن انجام کار بگیرم»). هوش مصنوعی دادومهر مناسب‌ترین قالب حقوقی (عقد صلح، بیع، اجاره، کار، پیمانکاری یا ماده ۱۰) را خودکار تشخیص داده و تمام شروط لازم را تدوین می‌کند.
                </p>
              </div>

              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={4}
                placeholder="توضیح دهید قصد بستن چه نوع توافقی دارید و چه نکاتی برایتان اهمیت دارد..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 resize-none font-mono leading-relaxed"
                required
              />
            </div>

            {/* Quick Templates */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-500 font-medium">الگوهای سریع:</span>
              <button
                type="button"
                onClick={() => {
                  setTopic("قرارداد اجاره یک باب مغازه تجاری به مدت یک سال با ودیعه ۲۰۰ میلیون و اجاره ماهیانه ۱۵ میلیون تومان با شرط تخلیه فوری وفق قانون ۱۳۷۶");
                  setParty1("موجر: مالک رسمی سرقفلی و عین مستاجره");
                  setParty2("مستاجر: دارنده پروانه کسب");
                  setDuration("یک سال شمسی از تاریخ عقد قرارداد");
                  setAmount("ودیعه ۲۰۰ میلیون تومان و اجاره بها ۱۵ میلیون تومان ماهانه");
                  setPaymentTerms("اجاره بها در اول هر ماه شمسی واریز می‌گردد");
                  setGuarantees("یک فقره چک صیادی به مبلغ ۳۰۰ میلیون تومان بابت تخلیه به موقع");
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                اجاره تجاری (قانون ۷۶)
              </button>

              <button
                type="button"
                onClick={() => {
                  setTopic("قرارداد توسعه نرم‌افزار و طراحی وبسایت فروشگاهی با تحویل سورس کد، پشتیبانی ۶ ماهه و شرط عدم افشای اطلاعات محرمانه");
                  setParty1("کارفرما: شرکت فناوری گستر");
                  setParty2("مجری و برنامه‌نویس: متخصص ارشد فرانت‌اند");
                  setDuration("۳ ماه شمسی طبق جدول زمان‌بندی ضمیمه");
                  setAmount("۸۰ میلیون تومان در ۴ مرحله پیشرفت کار");
                  setPaymentTerms("۲۵٪ پیش‌پرداخت، ۲۵٪ فاز اول، ۲۵٪ فاز دوم، ۲۵٪ پس از تحویل نهایی");
                  setGuarantees("ضمانت‌نامه بانکی یا سفته حسن انجام تعهدات معادل ۲۰٪ کل قرارداد");
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                پیمانکاری نرم‌افزار
              </button>

              <button
                type="button"
                onClick={() => {
                  setTopic("قرارداد صلح و انتقال قطعی حقوق مادی و معنوی اختراع و علامت تجاری با اسقاط کافه خیارات");
                  setParty1("مُصالح: مخترع و مالک برند");
                  setParty2("متصالح: سرمایه‌گذار و شرکت تجاری");
                  setDuration("دائمی و بلاعوض");
                  setAmount("۵۰۰ میلیون تومان نقد و اقساط");
                  setPaymentTerms("طی ۳ فقره چک صیادی متوالی");
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                صلح حقوق و برند
              </button>
            </div>

            {/* Parties */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  مشخصات طرف اول (کارفرما / موجر / فروشنده)
                </label>
                <input
                  type="text"
                  value={party1}
                  onChange={(e) => setParty1(e.target.value)}
                  placeholder="مثال: شرکت پیشگامان فناور (سهامی خاص) با شماره ثبت ..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  مشخصات طرف دوم (پیمانکار / مستاجر / خریدار)
                </label>
                <input
                  type="text"
                  value={party2}
                  onChange={(e) => setParty2(e.target.value)}
                  placeholder="مثال: آقای علی رضایی به شماره ملی ..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            {/* Amount & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  مبلغ قرارداد و شیوه پرداخت
                </label>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="مثال: ۱۰۰ میلیون تومان (۳۰٪ پیش‌پرداخت، مابقی در دو قسط)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  مدت زمان قرارداد
                </label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="مثال: ۶ ماه شمسی از تاریخ انعقاد تا پایان اسفند"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            {/* Advanced Legal Options Accordion */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full p-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                <span>تنظیمات تکمیلی و شروط اختصاصی (اختیاری)</span>
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showAdvanced && (
                <div className="p-4 space-y-4 bg-white border-t border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      تعهدات خاص طرف اول
                    </label>
                    <textarea
                      value={obligationsParty1}
                      onChange={(e) => setObligationsParty1(e.target.value)}
                      rows={2}
                      placeholder="تعهدات و وظایف ویژه طرف اول..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      تعهدات خاص طرف دوم
                    </label>
                    <textarea
                      value={obligationsParty2}
                      onChange={(e) => setObligationsParty2(e.target.value)}
                      rows={2}
                      placeholder="تعهدات و وظایف ویژه طرف دوم..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      تضامین و وجه التزام خسارت (ماده ۲۳۰ قانون مدنی)
                    </label>
                    <input
                      type="text"
                      value={guarantees}
                      onChange={(e) => setGuarantees(e.target.value)}
                      placeholder="مثال: روزانه ۱ میلیون تومان خسارت تاخیر در تحویل + یک فقره چک ضمانت"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      مرجع حل و فصل اختلافات
                    </label>
                    <select
                      value={disputeResolution}
                      onChange={(e) => setDisputeResolution(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 cursor-pointer"
                    >
                      <option value="داوری مرکز داوری کانون وکلای دادگستری مرکز">
                        داوری مرکز داوری کانون وکلای دادگستری
                      </option>
                      <option value="داوری مرکز داوری اتاق بازرگانی ایران">
                        داوری مرکز داوری اتاق بازرگانی
                      </option>
                      <option value="داور مرضی‌الطرفین منتخب طرفین">داور مرضی‌الطرفین</option>
                      <option value="دادگاه‌های عمومی حقوقی دادگستری محل وقوع قرارداد">
                        دادگاه‌های عمومی حقوقی دادگستری
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      مواد قانونی مورد استناد
                    </label>
                    <input
                      type="text"
                      value={governingArticles}
                      onChange={(e) => setGoverningArticles(e.target.value)}
                      placeholder="ماده ۱۰، ۲۱۹، ۲۲۰، ۲۳۰ و ..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>در حال نگارش و مستندسازی قرارداد توسط وکیل هوشمند...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>تنظیم قرارداد رسمی با استناد به قوانین</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* PAGE 2: OUTPUT / DRAFTED CONTRACT (صفحه دوم: نمایش سند با دکمه بازگشت) */}
      {/* ======================================================== */}
      {page === "output" && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Top Bar with Back Button */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage("input")}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200 group"
              >
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                <span>بازگشت به فرم مشخصات قرارداد</span>
              </button>

              {result && (
                <div className="hidden sm:block">
                  <h3 className="text-sm font-bold text-slate-900">{result.title}</h3>
                  <span className="text-[11px] text-slate-500">
                    تنظیم شده توسط هوش مصنوعی دادومهر • آماده امضا و اجرا
                  </span>
                </div>
              )}
            </div>

            {result && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isEditing
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditing ? "اتمام ویرایش" : "ویرایش متن"}</span>
                </button>

                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copied ? "کپی شد" : "کپی متن"}</span>
                </button>

                <button
                  onClick={handleDownloadPdf}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 flex items-center gap-1.5 cursor-pointer"
                  title="دانلود فایل PDF رسمی"
                >
                  <FileDown className="w-3.5 h-3.5 text-indigo-600" />
                  <span>دانلود PDF</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>چاپ</span>
                </button>

                <button
                  onClick={() => onSendToRiskAnalysis(editableContract || result.contractText)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span>ممیزی ریسک</span>
                </button>

                <button
                  onClick={handleSaveToVault}
                  disabled={savedToVault}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                    savedToVault
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20"
                  }`}
                >
                  <FileSignature className="w-3.5 h-3.5" />
                  <span>{savedToVault ? "در بایگانی ذخیره شد" : "ارسال به امضای دیجیتال"}</span>
                </button>
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[400px] space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-800">
                  در حال انطباق با مواد قانون مدنی و تدوین شروط الزام‌آور...
                </h4>
                <p className="text-xs text-slate-500">
                  بررسی مواد ۱۰، ۲۱۹، ۲۳۰ قانون مدنی و قواعد آمره فقهی و حقوقی
                </p>
              </div>
            </div>
          )}

          {/* Empty State fallback */}
          {!loading && !result && (
            <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[350px] text-slate-400 space-y-3 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                قراردادی هنوز تنظیم نشده است
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md leading-relaxed">
                برای تولید قرارداد رسمی، ابتدا مشخصات توافق را در فرم صفحه قبل وارد فرمایید.
              </p>
              <button
                onClick={() => setPage("input")}
                className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-indigo-700 cursor-pointer"
              >
                ورود به صفحه مشخصات قرارداد
              </button>
            </div>
          )}

          {/* Result Content */}
          {result && !loading && (
            <div className="space-y-5">
              {/* AI-Detected Legal Archetype & Justification */}
              {(result.detectedContractType || result.contractTypeRationale) && (
                <div className="bg-gradient-to-l from-indigo-50/90 to-blue-50/70 border border-indigo-200/90 rounded-2xl p-5 space-y-2.5 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-200/60 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="p-2 rounded-xl bg-indigo-600 text-white shadow-2xs">
                        <Scale className="w-4 h-4" />
                      </span>
                      <div>
                        <span className="text-[11px] font-bold text-indigo-900 block">
                          قالب حقوقی تشخیص‌داده‌شده توسط هوش مصنوعی دادومهر:
                        </span>
                        <span className="text-sm sm:text-base font-black text-indigo-950">
                          {result.detectedContractType || "عقد معین منطبق بر قانون مدنی"}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 font-semibold border border-indigo-200/60">
                      تحلیل خودکار قصد مشترک طرفین
                    </span>
                  </div>
                  {result.contractTypeRationale && (
                    <div className="text-xs text-indigo-950/90 leading-relaxed pt-1">
                      <span className="font-bold text-indigo-900">علت انطباق و مزایای قانونی این قالب: </span>
                      <span>{result.contractTypeRationale}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Cited Articles Card */}
              {result.legalArticlesCited && result.legalArticlesCited.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-indigo-700">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>استنادات قانونی و پشتوانه قضایی قرارداد:</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {result.legalArticlesCited.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1"
                      >
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                          <span>{item.article}</span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          {item.rationale}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contract Main Document Paper */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    متن نهایی و ساختار رسمی قرارداد
                  </span>
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                  </div>
                </div>

                <div className="p-6 sm:p-8">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>ویرایشگر زنده متن قرارداد</span>
                        <span>تغییرات شما به صورت خودکار در کپی و امضا لحاظ می‌شود</span>
                      </div>
                      <textarea
                        value={editableContract}
                        onChange={(e) => setEditableContract(e.target.value)}
                        rows={20}
                        className="w-full bg-slate-50 border border-indigo-200 rounded-xl p-4 text-xs sm:text-sm text-slate-900 font-mono leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  ) : (
                    <div className="bg-white text-slate-800 text-xs sm:text-sm leading-loose whitespace-pre-wrap font-sans select-text">
                      {editableContract || result.contractText}
                    </div>
                  )}
                </div>
              </div>

              {/* Attorney Recommendations & Risk Protections */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {result.attorneyRecommendations && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2.5 shadow-sm">
                    <h4 className="text-xs sm:text-sm font-bold text-indigo-700 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                      <span>توصیه‌های مهم وکیل قبل از امضا:</span>
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-600">
                      {result.attorneyRecommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-indigo-600 shrink-0 font-bold">•</span>
                          <span className="leading-relaxed">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.keyRiskProtections && (
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 space-y-2.5 shadow-sm">
                    <h4 className="text-xs sm:text-sm font-bold text-emerald-800 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>حفاظت‌های قانونی تعبیه شده در متن:</span>
                    </h4>
                    <ul className="space-y-2 text-xs text-emerald-950">
                      {result.keyRiskProtections.map((p, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-emerald-600 shrink-0 font-bold">✓</span>
                          <span className="leading-relaxed">{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Bottom Back Button */}
              <div className="pt-2 flex justify-start">
                <button
                  onClick={() => setPage("input")}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>بازگشت به فرم مشخصات قرارداد</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
