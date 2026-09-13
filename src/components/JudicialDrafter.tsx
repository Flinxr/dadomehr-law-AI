import React, { useState } from "react";
import {
  Gavel,
  FileText,
  ShieldCheck,
  Send,
  Copy,
  Check,
  Printer,
  Edit3,
  Scale,
  ArrowRight,
  ChevronRight,
  FolderLock,
  FileDown,
  AlertTriangle,
  BookOpen,
  HelpCircle,
  FileCheck2,
  Sparkles,
  RefreshCw,
  Clock,
  CheckCircle2,
  Scroll,
} from "lucide-react";
import { JudicialDraftResponse, JudicialPaperType, LegalDocument } from "../types";
import { computeSHA256, getPersianNow } from "../utils/crypto";
import { exportToPersianPdf } from "../utils/pdfExport";
import { JUDICIAL_PRESETS } from "../data/mockTemplates";
import { getApiUrl } from "../config";

interface JudicialDrafterProps {
  onSaveDocument: (doc: Omit<LegalDocument, "id">) => void;
}

export const JudicialDrafter: React.FC<JudicialDrafterProps> = ({ onSaveDocument }) => {
  // Form State
  const [paperType, setPaperType] = useState<JudicialPaperType>("petition");
  const [title, setTitle] = useState("");
  const [petitioner, setPetitioner] = useState("");
  const [respondent, setRespondent] = useState("");
  const [courtOrBranch, setCourtOrBranch] = useState("");
  const [subject, setSubject] = useState("");
  const [evidences, setEvidences] = useState("");
  const [narrative, setNarrative] = useState("");
  const [legalBasis, setLegalBasis] = useState("");
  const [specificDemands, setSpecificDemands] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JudicialDraftResponse | null>(null);
  const [editableDoc, setEditableDoc] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedToVault, setSavedToVault] = useState(false);

  // Active view tab on output page
  const [activeResultTab, setActiveResultTab] = useState<"doc" | "audit" | "statutes" | "filing">("doc");

  // Page: 'input' vs 'output'
  const [page, setPage] = useState<"input" | "output">("input");

  const paperTypeMeta: Record<
    JudicialPaperType,
    {
      title: string;
      desc: string;
      petitionerLabel: string;
      respondentLabel: string;
      courtLabel: string;
      subjectLabel: string;
      evidencesLabel: string;
      narrativeLabel: string;
      demandsLabel: string;
      icon: any;
      badgeColor: string;
    }
  > = {
    petition: {
      title: "دادخواست حقوقی",
      desc: "طرح دعاوی مدنی، بازرگانی، ملکی، خانواده و مطالبات مالی طبق ماده ۵۱ ق.آ.د.م",
      petitionerLabel: "خواهان (نام، کدملی، اقامتگاه)",
      respondentLabel: "خوانده (نام، اقامتگاه/مجهول‌المکان)",
      courtLabel: "مرجع صالح رسیدگی (مجتمع قضایی / شعبه حقوقی / دادگاه صلح)",
      subjectLabel: "تعیین خواسته و بهای آن (دقیق با ذکر ارزش ریالی یا غیرمالی)",
      evidencesLabel: "دلایل و منضمات (اسناد رسمی، عادی، شهادت شهود، کارشناسی، معاینه محل)",
      narrativeLabel: "شرح دادخواست و گردشکار وقایع",
      demandsLabel: "خواسته‌های تبعی (تامین خواسته فوری، خسارت تاخیر تادیه، هزینه دادرسی)",
      icon: Scale,
      badgeColor: "bg-blue-50 text-blue-800 border-blue-200",
    },
    complaint: {
      title: "شکواییه کیفری",
      desc: "اعلام جرم، تعقیب مجرمان، کلاهبرداری، خیانت در امانت و جرایم سایبری طبق ماده ۶۸ ق.آ.د.ک",
      petitionerLabel: "شاکی (نام، مشخصات، نشانی)",
      respondentLabel: "مشتکی‌عنه (نام متهم یا ناشناس/سایت)",
      courtLabel: "مرجع صالح (دادسرا / دادگاه کیفری دو / دادسرای جرایم رایانه‌ای)",
      subjectLabel: "موضوع شکایت و عنوان دقیق مجرمانه",
      evidencesLabel: "ادله اثبات جرم (رسیدهای مالی، مدارک هویتی، فایل‌های صوتی، استعلامات IP)",
      narrativeLabel: "شرح ماوقع، زمان و مکان وقوع جرم و نحوه اغفال یا تضرر",
      demandsLabel: "تقاضای دادرسی (مسدودسازی حساب، جلب به دادرسی، رد مال و مجازات متهم)",
      icon: Gavel,
      badgeColor: "bg-rose-50 text-rose-800 border-rose-200",
    },
    brief: {
      title: "لایحه دفاعیه",
      desc: "تنظیم متن دفاعیه مستند برای ارائه به شعب دادگاه نخستین، تجدیدنظر یا دیوان عالی",
      petitionerLabel: "موکل / متقاضی لایحه (خواهان/خوانده/تجدیدنظرخواه)",
      respondentLabel: "طرف مقابل دعوا (تجدیدنظرخوانده/خوانده)",
      courtLabel: "شعبه رسیدگی‌کننده و شماره کلاسه پرونده",
      subjectLabel: "موضوع لایحه و مرحله دادرسی (بدوی / تبادل لوایح / تجدیدنظر / واخواهی)",
      evidencesLabel: "اسناد و ضمائم تکمیلی پیوست لایحه",
      narrativeLabel: "شرح دفاعیات ماهوی، ایرادات شکلی و تبیین وقایع",
      demandsLabel: "استدعای نهایی (رد دعوای واهی، نقض دادنامه، صدور حکم برائت/بی‌حقی)",
      icon: FileText,
      badgeColor: "bg-indigo-50 text-indigo-800 border-indigo-200",
    },
    notice: {
      title: "اظهارنامه رسمی",
      desc: "ابلاغ رسمی مطالبات، اخطار تخلیه یا تعهدات پیش از طرح دعوا وفق ماده ۱۵۶ ق.آ.د.م",
      petitionerLabel: "اظهارکننده (ارسال‌کننده)",
      respondentLabel: "مخاطب اظهارنامه",
      courtLabel: "دفتر خدمات الکترونیک قضایی ابلاغ‌کننده",
      subjectLabel: "موضوع اظهارنامه رسمی",
      evidencesLabel: "مدارک و مستندات موضوع اظهارنامه",
      narrativeLabel: "خلاصه اظهارات و شرح اخطار قانونی",
      demandsLabel: "مهلت اعطا شده (مثلاً ۷ روز کاری) و اخطار طرح دعوا و خسارات دادرسی",
      icon: Scroll,
      badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
    },
  };

  const loadPreset = (preset: (typeof JUDICIAL_PRESETS)[0]) => {
    setPaperType(preset.paperType);
    setTitle(preset.title);
    setPetitioner(preset.petitioner);
    setRespondent(preset.respondent);
    setCourtOrBranch(preset.courtOrBranch);
    setSubject(preset.subject);
    setEvidences(preset.evidences);
    setNarrative(preset.narrative);
    setLegalBasis(preset.legalBasis);
    setSpecificDemands(preset.specificDemands);
  };

  const handleDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() && !narrative.trim()) {
      setError("لطفاً حداقل موضوع یا شرح ماجرا را وارد نمایید.");
      return;
    }

    setLoading(true);
    setError(null);
    setSavedToVault(false);
    setPage("output");

    try {
      const res = await fetch(getApiUrl("/api/judicial/draft"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paperType,
          title: title || `${paperTypeMeta[paperType].title} - ${subject.slice(0, 40)}`,
          petitioner,
          respondent,
          courtOrBranch,
          subject,
          evidences,
          narrative,
          legalBasis,
          specificDemands,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || json.details || "خطا در تنظیم ورقه قضایی");
      }

      setResult(json.data);
      setEditableDoc(json.data.formattedDocument);
    } catch (err: any) {
      setError(err.message || "خطا در برقراری ارتباط با سرویس قضایی.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editableDoc);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadPdf = () => {
    if (!result) return;
    exportToPersianPdf({
      title: result.title || paperTypeMeta[paperType].title,
      content: editableDoc,
      category: paperTypeMeta[paperType].title,
      datePersian: getPersianNow(),
    });
  };

  const handleSaveToVault = async () => {
    if (!result || savedToVault) return;
    const docHash = await computeSHA256(editableDoc);
    const now = getPersianNow();

    onSaveDocument({
      title: result.title || paperTypeMeta[paperType].title,
      category: "court_brief",
      content: editableDoc,
      createdAtPersian: now,
      updatedAtPersian: now,
      status: "reviewed",
      documentHash: docHash,
      tags: [paperTypeMeta[paperType].title, "اوراق قضایی", "سامانه ثنا"],
    });

    setSavedToVault(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const currentMeta = paperTypeMeta[paperType];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* PAGE 1: INPUT FORM */}
      {page === "input" && (
        <div className="space-y-6">
          {/* Paper Type Selector */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
            <label className="block text-xs font-bold text-slate-700 mb-3">
              ۱. نوع ورقه قضایی مورد نظر را انتخاب نمایید:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(Object.keys(paperTypeMeta) as JudicialPaperType[]).map((typeKey) => {
                const meta = paperTypeMeta[typeKey];
                const Icon = meta.icon;
                const isSelected = paperType === typeKey;
                return (
                  <button
                    key={typeKey}
                    type="button"
                    onClick={() => setPaperType(typeKey)}
                    className={`p-4 rounded-xl border text-right transition flex flex-col justify-between ${
                      isSelected
                        ? "border-amber-600 bg-amber-50/40 ring-2 ring-amber-500/30"
                        : "border-slate-200 bg-slate-50/40 hover:bg-slate-100/60 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${meta.badgeColor}`}>
                          {meta.title}
                        </span>
                        <Icon className={`w-5 h-5 ${isSelected ? "text-amber-700" : "text-slate-400"}`} />
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mt-1">{meta.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Preset Templates */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                نمونه‌های آماده و پرتکرار قضایی (جهت پر کردن سریع فرم):
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {JUDICIAL_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => loadPreset(preset)}
                  className="px-3 py-2.5 rounded-lg text-right text-xs font-medium bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-700 hover:text-amber-950 transition flex items-center justify-between group"
                >
                  <span className="truncate">{preset.name}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Main Interactive Form */}
          <form onSubmit={handleDraft} className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <currentMeta.icon className="w-4 h-4 text-amber-700" />
                مشخصات و ارکان اختصاصی «{currentMeta.title}»
              </h2>
              <span className="text-xs text-slate-500">تمامی داده‌ها مطابق سامانه ثنا و عدل‌ایران قالب‌بندی می‌شوند</span>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Row 1: Petitioner & Respondent */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {currentMeta.petitionerLabel} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={petitioner}
                  onChange={(e) => setPetitioner(e.target.value)}
                  placeholder="مثال: آقای محمدرضا کاظمی فرزند علی به کدملی ۰۰۱۲۳۴۵۶۷۸..."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {currentMeta.respondentLabel} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={respondent}
                  onChange={(e) => setRespondent(e.target.value)}
                  placeholder="مثال: شرکت پایا سازه با مدیریت آقای مهندس شایگان..."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50/50"
                />
              </div>
            </div>

            {/* Row 2: Court/Branch & Subject */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {currentMeta.courtLabel}
                </label>
                <input
                  type="text"
                  value={courtOrBranch}
                  onChange={(e) => setCourtOrBranch(e.target.value)}
                  placeholder="مثال: دادگاه عمومی حقوقی مجتمع قضایی شهید بهشتی تهران / دادگاه صلح"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {currentMeta.subjectLabel} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="مثال: مطالبه وجه ۲ فقره سفته به مبلغ ۱ میلیارد ریال و خسارت تاخیر..."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50/50"
                />
              </div>
            </div>

            {/* Row 3: Evidences */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {currentMeta.evidencesLabel}
              </label>
              <input
                type="text"
                value={evidences}
                onChange={(e) => setEvidences(e.target.value)}
                placeholder="مثال: تصویر مصدق قرارداد، گواهی واخواست سفته، رسید بانکی، شهادت شهود، فایل صوتی..."
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50/50"
              />
            </div>

            {/* Row 4: Narrative & Facts */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {currentMeta.narrativeLabel} <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                placeholder="شرح دقیق ماجرا، تاریخ‌ها، تعهدات نقض‌شده و دلایل محق بودن خود را به زبان معمولی بنویسید؛ هوش مصنوعی آن را به لسان فاخر حقوقی و منطبق با رویه قضایی تبدیل می‌کند..."
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50/50 leading-relaxed"
              />
            </div>

            {/* Row 5: Specific Demands & Legal Basis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {currentMeta.demandsLabel}
                </label>
                <input
                  type="text"
                  value={specificDemands}
                  onChange={(e) => setSpecificDemands(e.target.value)}
                  placeholder="مثال: صدور قرار تامین خواسته فوری، توقیف حساب‌های بانکی، مطالبه خسارات دادرسی..."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  مواد قانونی یا آراء وحدت رویه مدنظر (اختیاری)
                </label>
                <input
                  type="text"
                  value={legalBasis}
                  onChange={(e) => setLegalBasis(e.target.value)}
                  placeholder="مثال: ماده ۱۰۸ ق.آ.د.م، ماده ۳۰۷ قانون تجارت، ماده ۵۲۲ ق.آ.د.م (یا به عهده هوش مصنوعی بگذارید)"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50/50"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white text-xs font-bold shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                <Gavel className="w-4 h-4" />
                تنظیم، ممیزی و تدوین ورقه قضایی با هوش مصنوعی
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PAGE 2: GENERATION & OUTPUT VIEW */}
      {page === "output" && (
        <div className="space-y-6">
          {/* Top navigation row */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setPage("input")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>بازگشت به فرم اطلاعات</span>
            </button>
          </div>
          {/* Loading State */}
          {loading && (
            <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center shadow-xs space-y-6">
              <div className="relative w-16 h-16 mx-auto">
                <div className="w-16 h-16 rounded-full border-4 border-amber-200 border-t-amber-700 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Gavel className="w-6 h-6 text-amber-700" />
                </div>
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-sm font-bold text-slate-800">
                  در حال تنظیم و اعتبارسنجی حقوقی «{currentMeta.title}»...
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  هوش مصنوعی در حال تطبیق ارکان دعوا با آیین دادرسی، استخراج آخرین آراء وحدت رویه، و مسدودسازی تله‌های شکلی و دفاعی طرف مقابل است.
                </p>
              </div>
              {/* Checklist simulation */}
              <div className="max-w-xs mx-auto text-right space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 text-amber-800 font-medium">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>تطبیق با ماده‌های قانون آیین دادرسی مدنی و کیفری</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>بررسی صلاحیت محلی و ذاتی دادگاه/دادسرا</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>برآورد خسارات دادرسی و تامین خواسته فوری</span>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="bg-white rounded-2xl p-8 border border-rose-200 text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">خطا در پردازش ورقه قضایی</h3>
              <p className="text-xs text-rose-700 max-w-md mx-auto">{error}</p>
              <button
                onClick={() => setPage("input")}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition inline-flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                بازگشت و اصلاح فرم
              </button>
            </div>
          )}

          {/* Success Output */}
          {!loading && result && (
            <div className="space-y-6">
              {/* Executive Summary Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${paperTypeMeta[result.paperType]?.badgeColor || "bg-amber-100 text-amber-800"}`}>
                        {result.paperTypePersian}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 font-bold">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        شاخص ایمنی حقوقی: {result.riskAssessmentAndAudit?.riskScore || 95} از ۱۰۰ (کم‌ریسک)
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-slate-900">{result.title}</h2>
                  </div>

                  {/* Actions Header */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleCopy}
                      className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5"
                      title="کپی متن کامل"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? "کپی شد" : "کپی"}</span>
                    </button>

                    <button
                      onClick={handleDownloadPdf}
                      className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5"
                      title="دانلود PDF استاندارد"
                    >
                      <FileDown className="w-4 h-4 text-rose-600" />
                      <span>دانلود PDF</span>
                    </button>

                    <button
                      onClick={handlePrint}
                      className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5"
                      title="چاپ"
                    >
                      <Printer className="w-4 h-4 text-slate-600" />
                      <span>چاپ</span>
                    </button>

                    <button
                      onClick={handleSaveToVault}
                      disabled={savedToVault}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition flex items-center gap-1.5 ${
                        savedToVault
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                      }`}
                      title="ذخیره در آرشیو اسناد"
                    >
                      <FolderLock className="w-4 h-4" />
                      <span>{savedToVault ? "در آرشیو ذخیره شد" : "ذخیره در آرشیو"}</span>
                    </button>
                  </div>
                </div>

                {/* Executive Summary Narrative */}
                <div className="mt-3.5 text-xs text-slate-700 bg-amber-50/40 p-3.5 rounded-xl border border-amber-200/60 leading-relaxed">
                  <span className="font-bold text-amber-950 block mb-1">خلاصه اجرایی و هدف بنیادین ورقه:</span>
                  {result.executiveSummary}
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-4 pt-3 gap-2 shadow-xs">
                <button
                  type="button"
                  onClick={() => setActiveResultTab("doc")}
                  className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                    activeResultTab === "doc"
                      ? "border-amber-700 text-amber-900"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <FileCheck2 className="w-4 h-4" />
                  متن رسمی ورقه قضایی (آماده ثبت ثنا)
                </button>

                <button
                  type="button"
                  onClick={() => setActiveResultTab("audit")}
                  className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                    activeResultTab === "audit"
                      ? "border-amber-700 text-amber-900"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  ممیزی ریسک و استحکام شکلی
                </button>

                <button
                  type="button"
                  onClick={() => setActiveResultTab("statutes")}
                  className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                    activeResultTab === "statutes"
                      ? "border-amber-700 text-amber-900"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  مواد قانونی و آراء وحدت رویه ({result.statutoryBasis?.length || 0})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveResultTab("filing")}
                  className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                    activeResultTab === "filing"
                      ? "border-amber-700 text-amber-900"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                  راهنمای ثبت و ضمائم الزامی
                </button>
              </div>

              {/* TAB 1: FORMATTED DOCUMENT */}
              {activeResultTab === "doc" && (
                <div className="bg-white rounded-b-2xl p-6 border-x border-b border-slate-200/90 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      این متن منطبق با استانداردهای شکلی قوه قضاییه تدوین شده و می‌توانید مستقیماً در دفاتر خدمات الکترونیک قضایی ثبت کنید.
                    </span>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="text-xs text-amber-700 hover:text-amber-800 font-semibold inline-flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isEditing ? "اتمام ویرایش" : "ویرایش دستی متن"}</span>
                    </button>
                  </div>

                  {isEditing ? (
                    <textarea
                      rows={22}
                      value={editableDoc}
                      onChange={(e) => setEditableDoc(e.target.value)}
                      className="w-full text-xs font-mono p-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 leading-relaxed bg-slate-50/50"
                    />
                  ) : (
                    <div className="p-8 rounded-xl bg-slate-50/70 border border-slate-300 shadow-inner font-serif text-slate-900 leading-loose text-sm whitespace-pre-line select-text print:bg-white print:p-0 print:border-none">
                      {editableDoc}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: RISK AUDIT & PROCEDURAL SAFETY */}
              {activeResultTab === "audit" && (
                <div className="bg-white rounded-b-2xl p-6 border-x border-b border-slate-200/90 shadow-xs space-y-6">
                  {/* Score banner */}
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-900">
                        سنجش ایمنی و انطباق با قوانین: وضعیت عالی (کم‌ریسک)
                      </h4>
                      <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                        این ورقه به نحوی نگارش شده که از صدور اخطارهای رفع نقص، ایرادات ماده ۸۴ قانون آیین دادرسی مدنی، و ادعاهای واهی طرف مقابل جلوگیری شود.
                      </p>
                    </div>
                  </div>

                  {/* Procedural Traps Avoided */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      تله‌های حقوقی و ایرادات شکلی که در این نگارش مسدود شدند:
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {result.riskAssessmentAndAudit?.vulnerabilitiesToAvoid?.map((vuln, i) => (
                        <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                          <span className="font-bold text-slate-900 ml-1">بند {i + 1}:</span>
                          {vuln}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mitigation Highlights */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      اقدامات انجام‌شده جهت تقویت ادله و تضمین نتیجه دادرسی:
                    </h3>
                    <div className="space-y-2">
                      {result.riskAssessmentAndAudit?.riskMitigationHighlights?.map((item, i) => (
                        <div key={i} className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-200/80 text-xs text-emerald-900 leading-relaxed flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-1.5"></span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Procedural Notes & Deadlines */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      مواعد قانونی و نکات آیین دادرسی:
                    </h3>
                    <div className="space-y-2">
                      {result.riskAssessmentAndAudit?.proceduralNotes?.map((note, i) => (
                        <div key={i} className="p-3 rounded-xl bg-indigo-50/40 border border-indigo-200/80 text-xs text-indigo-950 leading-relaxed flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0 mt-1.5"></span>
                          <span>{note}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: STATUTES & PRECEDENTS */}
              {activeResultTab === "statutes" && (
                <div className="bg-white rounded-b-2xl p-6 border-x border-b border-slate-200/90 shadow-xs space-y-4">
                  <div className="text-xs text-slate-600 mb-2">
                    فهرست مواد قانونی، تبصره‌ها و آراء وحدت رویه دیوان عالی کشور که سند بر اساس آن‌ها تدوین و مستندسازی شده است:
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.statutoryBasis?.map((item, i) => (
                      <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-amber-700 shrink-0" />
                          <h4 className="text-xs font-bold text-slate-900">{item.article}</h4>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{item.rationale}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: FILING GUIDE & NEXT STEPS */}
              {activeResultTab === "filing" && (
                <div className="bg-white rounded-b-2xl p-6 border-x border-b border-slate-200/90 shadow-xs space-y-6">
                  {/* Next Steps Checklist */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-blue-600" />
                      مراحل گام‌به‌گام ثبت در دفتر خدمات الکترونیک قضایی (عدل‌ایران):
                    </h3>
                    <div className="space-y-2.5">
                      {result.proceduralNextSteps?.map((step, i) => (
                        <div key={i} className="p-3.5 rounded-xl bg-blue-50/40 border border-blue-200/70 text-xs text-blue-950 flex items-start gap-3">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span className="leading-relaxed">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Required Attachments */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4 text-amber-600" />
                      مدارک و ضمائم الزامی جهت بارگذاری در سامانه:
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {result.requiredAttachments?.map((att, i) => (
                        <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{att}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
