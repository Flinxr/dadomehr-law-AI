import React, { useState } from "react";
import {
  FolderArchive,
  Search,
  Trash2,
  Download,
  Copy,
  Check,
  Printer,
  FileText,
  Clock,
  Tag,
  Plus,
  FileSignature,
  MessageSquareText,
  FileSearch,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { LegalDocument } from "../types";
import { exportToPersianPdf } from "../utils/pdfExport";
import { getPersianNow } from "../utils/crypto";

interface DocumentVaultProps {
  documents: LegalDocument[];
  onUpdateDocument?: (doc: LegalDocument) => void;
  onDeleteDocument: (id: string) => void;
  onNewDocument: () => void;
}

export const DocumentVault: React.FC<DocumentVaultProps> = ({
  documents,
  onDeleteDocument,
  onNewDocument,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(
    documents[0]?.id || null
  );
  const [copied, setCopied] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Active document
  const activeDocument =
    documents.find((d) => d.id === activeDocumentId) ||
    documents[0] ||
    null;

  // Filter documents
  const filteredDocs = documents.filter((doc) => {
    if (filterCategory !== "all" && doc.category !== filterCategory) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      const inTitle = doc.title.toLowerCase().includes(q);
      const inContent = doc.content.toLowerCase().includes(q);
      const inTags = doc.tags?.some((t) => t.toLowerCase().includes(q));
      return inTitle || inContent || inTags;
    }
    return true;
  });

  const handleCopyContent = () => {
    if (!activeDocument) return;
    navigator.clipboard.writeText(activeDocument.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadPdf = () => {
    if (!activeDocument) return;
    exportToPersianPdf({
      title: activeDocument.title,
      category: getCategoryLabel(activeDocument.category),
      content: activeDocument.content,
      datePersian: activeDocument.createdAtPersian || getPersianNow(),
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = (id: string) => {
    onDeleteDocument(id);
    setDeleteConfirmId(null);
    if (activeDocumentId === id) {
      const remaining = documents.filter((d) => d.id !== id);
      setActiveDocumentId(remaining[0]?.id || null);
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "contract":
        return "قرارداد رسمی";
      case "court_brief":
        return "لایحه و دادنامه";
      case "advisory":
        return "نظریه مشورتی";
      case "case_summary":
        return "خلاصه و تحلیل";
      default:
        return "سند حقوقی";
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case "contract":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "court_brief":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "advisory":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "case_summary":
        return "bg-teal-50 text-teal-700 border-teal-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const stats = {
    total: documents.length,
    contracts: documents.filter((d) => d.category === "contract").length,
    advisory: documents.filter((d) => d.category === "advisory").length,
    summaries: documents.filter((d) => d.category === "case_summary" || d.category === "court_brief").length,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute -left-12 -bottom-12 w-56 h-56 bg-gradient-to-br from-indigo-100/40 to-slate-100/20 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/80">
                <FolderArchive className="w-5 h-5" />
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                آرشیو اسناد ذخیره‌شده
              </h2>
            </div>
            <p className="text-xs md:text-sm text-slate-500 leading-relaxed max-w-2xl">
              مجموعه متون، پیش‌نویس‌های قرارداد، نظریات حقوقی و خلاصه‌سازی‌های تولیدشده در برنامه
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onNewDocument}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs md:text-sm font-medium transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>تنظیم قرارداد جدید</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-3.5 text-center">
            <span className="text-xs text-slate-500 block mb-1">کل اسناد آرشیو</span>
            <span className="text-lg font-bold text-slate-900">{stats.total} سند</span>
          </div>
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-3.5 text-center">
            <span className="text-xs text-indigo-700 font-medium block mb-1">قراردادها</span>
            <span className="text-lg font-bold text-indigo-900">{stats.contracts} مورد</span>
          </div>
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-3.5 text-center">
            <span className="text-xs text-emerald-700 font-medium block mb-1">مشاوره‌ها</span>
            <span className="text-lg font-bold text-emerald-900">{stats.advisory} مورد</span>
          </div>
          <div className="bg-teal-50/50 border border-teal-100 rounded-2xl p-3.5 text-center">
            <span className="text-xs text-teal-700 font-medium block mb-1">خلاصه و لوایح</span>
            <span className="text-lg font-bold text-teal-900">{stats.summaries} مورد</span>
          </div>
        </div>
      </div>

      {/* Main Content Area: Master-Detail List & Reader */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Document List Sidebar (4 Cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-4 shadow-xs flex flex-col space-y-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="جستجو در عنوان، متن و برچسب..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: "all", label: "همه" },
              { id: "contract", label: "قراردادها" },
              { id: "advisory", label: "مشاوره‌ها" },
              { id: "case_summary", label: "خلاصه‌ها" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterCategory(tab.id)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors cursor-pointer ${
                  filterCategory === tab.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Document Cards */}
          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {filteredDocs.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-medium">سندی یافت نشد</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  سند جدیدی در بخش‌های دیگر تنظیم یا ذخیره نمایید.
                </p>
              </div>
            ) : (
              filteredDocs.map((doc) => {
                const isSelected = activeDocument?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setActiveDocumentId(doc.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-right group ${
                      isSelected
                        ? "bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-500/20 shadow-xs"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getCategoryBadgeClass(
                          doc.category
                        )}`}
                      >
                        {getCategoryLabel(doc.category)}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        <span>{doc.createdAtPersian}</span>
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                      {doc.title}
                    </h4>

                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {doc.content.replace(/[#*`_]/g, "").slice(0, 110)}...
                    </p>

                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap mt-2 pt-2 border-t border-slate-100">
                        {doc.tags.slice(0, 2).map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md flex items-center gap-0.5"
                          >
                            <Tag className="w-2.5 h-2.5 opacity-60" />
                            <span>{t}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Document Reader / Action Panel (8 Cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-5 md:p-7 shadow-xs">
          {activeDocument ? (
            <div className="space-y-6">
              {/* Document Header & Action Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-lg border ${getCategoryBadgeClass(
                        activeDocument.category
                      )}`}
                    >
                      {getCategoryLabel(activeDocument.category)}
                    </span>
                    <span className="text-xs text-slate-400">
                      تاریخ ثبت: {activeDocument.createdAtPersian}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                    {activeDocument.title}
                  </h3>
                </div>

                {/* Toolbar Buttons */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <button
                    onClick={handleCopyContent}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="کپی متن کامل سند"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">کپی شد</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>کپی متن</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownloadPdf}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="دانلود خروجی استاندارد PDF"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                    <span>دانلود PDF</span>
                  </button>

                  <button
                    onClick={handlePrint}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="چاپ مستقیم"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>چاپ</span>
                  </button>

                  {deleteConfirmId === activeDocument.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(activeDocument.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 cursor-pointer"
                      >
                        تایید حذف
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-300 cursor-pointer"
                      >
                        انصراف
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(activeDocument.id)}
                      className="px-2.5 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                      title="حذف سند"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Document Paper Container */}
              <div className="bg-[#FAFBFD] border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-inner font-sans">
                <div className="prose prose-slate max-w-none text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap selection:bg-indigo-100">
                  {activeDocument.content}
                </div>
              </div>

              {/* Document Meta Information */}
              <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-4">
                  <span>شناسه سند: <code className="bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px] font-mono">{activeDocument.id}</code></span>
                  <span>تعداد واژگان: <strong>{activeDocument.content.split(/\s+/).filter(Boolean).length} کلمه</strong></span>
                </div>
                {activeDocument.tags && activeDocument.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px]">برچسب‌ها:</span>
                    {activeDocument.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md text-[10px]"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 space-y-3">
              <BookOpen className="w-12 h-12 mx-auto text-slate-300" />
              <h4 className="text-sm font-bold text-slate-700">هیچ سندی انتخاب نشده است</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                از فهرست سمت راست یک سند را جهت مشاهده متن کامل، کپی و دانلود انتخاب فرمایید.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
