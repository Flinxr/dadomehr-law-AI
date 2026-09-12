import React, { useState } from "react";
import {
  Scale,
  FileSignature,
  Gavel,
  ShieldAlert,
  MessageSquareText,
  FileSearch,
  FolderArchive,
  FileText,
  FileCheck2,
  Menu,
  X,
  Info,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ActiveTab } from "../types";
import { PWAInstallButton } from "./PWAInstallButton";

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "counsel",
      label: "هوش مصنوعی حقوقی",
      icon: <MessageSquareText className="w-4 h-4" />,
    },
    {
      id: "drafter",
      label: "تنظیم قرارداد",
      icon: <FileSignature className="w-4 h-4" />,
    },
    {
      id: "judicial",
      label: "تنظیم اوراق قضایی",
      icon: <Gavel className="w-4 h-4" />,
    },
    {
      id: "inspector",
      label: "بررسی و کارشناسی سند",
      icon: <FileCheck2 className="w-4 h-4" />,
    },
    {
      id: "risk",
      label: "تحلیل ریسک قرارداد",
      icon: <ShieldAlert className="w-4 h-4" />,
    },
    {
      id: "summarizer",
      label: "خلاصه و تحلیل اسناد",
      icon: <FileSearch className="w-4 h-4" />,
    },
    {
      id: "pdf_to_text",
      label: "بازسازی و استخراج متن",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: "vault",
      label: "آرشیو اسناد",
      icon: <FolderArchive className="w-4 h-4" />,
    },
  ];

  const handleTabClick = (id: ActiveTab) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
            <Scale className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-slate-900 text-sm block">سامانه دادومهر</span>
            <span className="text-[10px] text-slate-500 block">دستیار تخصصی حقوقی</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PWAInstallButton compact />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            aria-label="منوی ناوبری"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 right-0 h-screen w-72 max-w-[80vw] shrink-0 bg-white border-l border-slate-200 flex flex-col z-50 transition-all duration-300 ease-in-out ${
          mobileOpen
            ? "translate-x-0 shadow-2xl visible pointer-events-auto"
            : "translate-x-full lg:translate-x-0 invisible lg:visible pointer-events-none lg:pointer-events-auto"
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                <span>سامانه دادومهر</span>
              </h1>
              <span className="text-[11px] text-indigo-600 font-medium block">
                دستیار حقوقی هوش مصنوعی
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 block">
            ابزارهای تخصصی حقوقی
          </span>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all text-right cursor-pointer ${
                  isActive
                    ? "bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-500/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <span className={isActive ? "text-white" : "text-slate-400"}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Bottom Bar with Install Button & Circular Info Button */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
          <div className="flex-1">
            <PWAInstallButton compact />
          </div>

          <button
            type="button"
            onClick={() => setAboutOpen(true)}
            className="w-8 h-8 rounded-full bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-600 hover:text-indigo-600 flex items-center justify-center transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
            title="درباره سامانه"
            aria-label="اطلاعات درباره سامانه"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* About Us Popup Modal */}
      {aboutOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity"
          onClick={() => setAboutOpen(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <img
                  src="/pwa-192x192.png"
                  alt="آیکون سامانه دادومهر"
                  className="w-9 h-9 rounded-xl shadow-md shadow-indigo-600/20 shrink-0 object-cover"
                />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">سامانه حقوقی دادومهر</h3>
                  <span className="text-[10px] text-indigo-600 font-medium">
                    دستیار تخصصی هوش مصنوعی حقوقی
                  </span>
                </div>
              </div>
              <button
                onClick={() => setAboutOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-600 leading-relaxed text-justify">
              دادومهر، سامانه هوشمند دستیاری حقوقی و قضایی جهت تنظیم دقیق قراردادها، اوراق قضایی، بررسی و کارشناسی مفاد اسناد، تحلیل ریسک و استخراج متون حقوقی است.
            </p>

            {/* Colorful Feature Items (Like previous footer items) */}
            <div className="space-y-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">حفظ محرمانگی و امنیت اسناد</span>
                  <span className="text-[10px] text-slate-500">حفاظت کامل از حریم خصوصی و پردازش امن داده‌های پرونده</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">استناد به قوانین موضوعه ایران</span>
                  <span className="text-[10px] text-slate-500">منطبق بر قانون مدنی، آیین دادرسی، قانون تجارت و آرای وحدت رویه</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">قدرت‌گرفته از Gemini</span>
                  <span className="text-[10px] text-slate-500">ادغام مستقیم با هسته استدلال پیشرفته و تحلیل عمیق متون حقوقی</span>
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div className="flex items-center justify-end pt-1">
              <button
                type="button"
                onClick={() => setAboutOpen(false)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-sm cursor-pointer transition-colors"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
