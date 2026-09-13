import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  Scale,
  ShieldCheck,
  CheckCircle2,
  FolderLock,
  Building,
  FileCheck2,
  Copy,
  Check,
  Clock,
  User,
  Bot,
  BookOpen,
  Printer,
  FileDown,
} from "lucide-react";
import { LegalQAMessage, LegalDocument } from "../types";
import { computeSHA256, getPersianNow } from "../utils/crypto";
import { exportToPersianPdf } from "../utils/pdfExport";
import { getApiUrl } from "../config";

interface LegalCounselProps {
  onSaveDocument: (doc: Omit<LegalDocument, "id">) => void;
}

export const LegalCounsel: React.FC<LegalCounselProps> = ({
  onSaveDocument,
}) => {
  const [messages, setMessages] = useState<LegalQAMessage[]>([
    {
      id: "welcome",
      sender: "dadban",
      timestamp: getPersianNow(),
      text: "سلام! من «هوش مصنوعی دادومهر»، مستشار حقوقی متخصص قوانین موضوعه ایران هستم. سوال یا چالش حقوقی خود را بفرمایید تا با استناد به مواد قانونی، تحلیل قضایی و ارائه چک‌لیست اقدامات راهنمایی‌تان کنم.",
    },
  ]);

  const [inputQuestion, setInputQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedDocId, setSavedDocId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = inputQuestion.trim();
    if (!q) return;

    const userMsg: LegalQAMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      timestamp: getPersianNow(),
      question: q,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion("");
    setLoading(true);
    setError(null);

    // Build history for context
    const chatHistory = messages
      .filter((m) => m.question && m.response)
      .map((m) => ({ question: m.question, answer: m.response?.directAnswer }));

    try {
      const res = await fetch(getApiUrl("/api/legal/qa"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          chatHistory,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || json.details || "خطا در دریافت نظر حقوقی");
      }

      const botMsg: LegalQAMessage = {
        id: `dadvamehr-${Date.now()}`,
        sender: "dadban",
        timestamp: getPersianNow(),
        question: q,
        response: json.data,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setError(err.message || "خطا در برقراری ارتباط با هوش مصنوعی دادومهر.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDownloadPdf = (msg: LegalQAMessage) => {
    if (!msg.response) return;
    const body = `نظریه مشورتی حقوقی:
موضوع استعلام: ${msg.question || "استعلام حقوقی"}

پاسخ صریح و مستند قضایی:
${msg.response.directAnswer}

پاسخ شفاف و ساده (برای موکل):
${msg.response.plainLanguageAnswer || "—"}

تحلیل و استدلال حقوقی:
${msg.response.detailedAnalysis}

مواد قانونی استناد شده:
${msg.response.statutoryReferences?.join("، ") || "—"}

چک‌لیست اقدامات فوری:
${msg.response.actionChecklist?.map((c, i) => `${i + 1}- ${c}`).join("\n") || "—"}

مرجع صالح رسیدگی:
${msg.response.competentAuthority || "—"}

مدارک و ادله اثباتی مورد نیاز:
${msg.response.requiredDocuments?.join("، ") || "—"}`;

    exportToPersianPdf({
      title: `نظریه مشورتی: ${(msg.question || "مشاوره حقوقی").slice(0, 50)}`,
      category: "مشاوره حقوقی تخصصی",
      content: body,
      datePersian: msg.timestamp,
    });
  };

  const handleSaveToVault = async (msg: LegalQAMessage) => {
    if (!msg.response) return;
    const content = `نظریه مشورتی هوش مصنوعی دادومهر
موضوع: ${msg.question || "استعلام حقوقی"}
تاریخ: ${msg.timestamp}

۱- پاسخ صریح، رسمی و مستند قضایی:
${msg.response.directAnswer}

۲- پاسخ ساده و روان:
${msg.response.plainLanguageAnswer || "—"}

۳- تحلیل حقوقی و استدلال:
${msg.response.detailedAnalysis}

۴- مواد قانونی استناد شده:
${msg.response.statutoryReferences.join("، ")}

۵- اقدامات پیشنهادی:
${msg.response.actionChecklist.map((c, i) => `${i + 1}- ${c}`).join("\n")}

۶- مرجع صالح رسیدگی:
${msg.response.competentAuthority}

۷- مدارک مورد نیاز:
${msg.response.requiredDocuments.join("، ")}`;

    const hash = await computeSHA256(content);
    const now = getPersianNow();

    onSaveDocument({
      title: `نظریه مشورتی دادومهر: ${(msg.question || "مشاوره حقوقی").slice(0, 45)}...`,
      category: "advisory",
      content,
      createdAtPersian: now,
      updatedAtPersian: now,
      status: "reviewed",
      documentHash: hash,
      tags: ["مشاوره حقوقی", "دادومهر"],
    });

    setSavedDocId(msg.id);
  };

  return (
    <div className="space-y-4">
      {/* Intro Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-500/20 shrink-0">
            <Bot className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <span>هوش مصنوعی دادومهر</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                نسخه تخصصی قضایی
              </span>
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              مشاوره جامع، استناد به قوانین موضوعه، تدوین اقدامات فوری و تعیین مرجع صالح رسیدگی
            </p>
          </div>
        </div>
      </div>

      {/* Main Chat Stream Box */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col min-h-[calc(100vh-14rem)] pb-24 overflow-hidden relative">
        {/* Messages Scroll Area */}
        <div className="flex-1 p-4 sm:p-6 space-y-6 bg-slate-50/40">
          {messages.map((msg) => {
            const isUser = msg.sender === "user";

            return (
              <div
                key={msg.id}
                className={`flex gap-3 animate-in fade-in duration-200 ${
                  isUser ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
                    isUser
                      ? "bg-indigo-600 text-white"
                      : "bg-gradient-to-br from-indigo-700 to-slate-900 text-white"
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-indigo-200" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[92%] sm:max-w-[85%] space-y-2 ${
                    isUser ? "text-left" : "text-right"
                  }`}
                >
                  {/* Sender & Timestamp */}
                  <div
                    className={`flex items-center gap-2 text-[11px] text-slate-500 ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    <span className="font-bold text-slate-700">
                      {isUser ? "شما" : "هوش مصنوعی دادومهر"}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono text-[10px]">
                      <Clock className="w-3 h-3" />
                      <span>{msg.timestamp}</span>
                    </span>
                  </div>

                  {isUser ? (
                    <div className="bg-indigo-600 text-white font-medium px-4 py-3 rounded-2xl rounded-tr-none text-xs sm:text-sm leading-relaxed shadow-sm text-right select-text">
                      {msg.question}
                    </div>
                  ) : msg.text ? (
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 sm:p-5 shadow-xs text-slate-800 space-y-3 leading-relaxed text-xs sm:text-sm">
                      <p>{msg.text}</p>
                    </div>
                  ) : (
                    msg.response && (
                      <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-5 sm:p-6 space-y-4 shadow-sm text-slate-800 text-right">
                        {/* 1. Direct Judicial & Formal Answer */}
                        <div className="bg-indigo-50/60 border border-indigo-200/90 rounded-2xl p-4 sm:p-5 space-y-2 shadow-2xs">
                          <div className="flex items-center justify-between border-b border-indigo-200/60 pb-2.5">
                            <span className="text-xs sm:text-sm font-bold text-indigo-950 flex items-center gap-1.5">
                              <Scale className="w-4 h-4 text-indigo-600" />
                              <span>نظریه صریح، رسمی و مستند قضایی:</span>
                            </span>
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-semibold">
                              پاسخ اصلی
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-indigo-950 leading-relaxed font-sans select-text">
                            {msg.response.directAnswer}
                          </p>
                        </div>

                        {/* 2. Plain & Simple Explanation for Client */}
                        {msg.response.plainLanguageAnswer && (
                          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 space-y-1.5 shadow-2xs">
                            <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                              <span>توضیح شفاف و عامه‌فهم (جهت تفهیم به موکل):</span>
                            </span>
                            <p className="text-xs sm:text-sm text-emerald-950 leading-relaxed font-sans select-text">
                              {msg.response.plainLanguageAnswer}
                            </p>
                          </div>
                        )}

                        {/* 3. Detailed Legal Analysis */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                            <span>تحلیل و استدلال ماهوی حقوقی:</span>
                          </span>
                          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans select-text bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                            {msg.response.detailedAnalysis}
                          </p>
                        </div>

                        {/* 4. Statutory References */}
                        {msg.response.statutoryReferences &&
                          msg.response.statutoryReferences.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                                <span>استناد به مواد و قوانین موضوعه:</span>
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {msg.response.statutoryReferences.map((ref, i) => (
                                  <span
                                    key={i}
                                    className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold"
                                  >
                                    {ref}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                        {/* 5. Action Checklist & Competent Authority */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          {msg.response.actionChecklist && (
                            <div className="space-y-1 bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100">
                              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>چک‌لیست اقدامات فوری:</span>
                              </span>
                              <ul className="space-y-1.5 text-xs text-emerald-950 mt-1">
                                {msg.response.actionChecklist.map((item, idx) => (
                                  <li key={idx} className="flex items-start gap-1.5">
                                    <span className="text-emerald-700 font-bold shrink-0">{idx + 1}.</span>
                                    <span className="leading-relaxed">{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                            <div>
                              <span className="text-xs font-bold text-indigo-800 flex items-center gap-1 mb-0.5">
                                <Building className="w-3.5 h-3.5 text-indigo-600" />
                                <span>مرجع صالح رسیدگی:</span>
                              </span>
                              <p className="text-xs text-slate-800 font-medium">
                                {msg.response.competentAuthority}
                              </p>
                            </div>

                            {msg.response.requiredDocuments && (
                              <div className="pt-1.5 border-t border-slate-200">
                                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1 mb-0.5">
                                  <FileCheck2 className="w-3.5 h-3.5 text-slate-500" />
                                  <span>مدارک و ادله اثباتی مورد نیاز:</span>
                                </span>
                                <p className="text-[11px] text-slate-600 leading-relaxed">
                                  {msg.response.requiredDocuments.join("، ")}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 flex-wrap">
                          <button
                            onClick={() =>
                              handleCopy(
                                `${msg.response?.directAnswer}\n\nتحلیل:\n${msg.response?.detailedAnalysis}\n\nمواد قانونی: ${msg.response?.statutoryReferences?.join("، ")}`,
                                msg.id
                              )
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>کپی شد</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>کپی نظریه</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleDownloadPdf(msg)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                            title="دانلود فایل PDF رسمی"
                          >
                            <FileDown className="w-3.5 h-3.5 text-indigo-600" />
                            <span>دانلود PDF</span>
                          </button>

                          <button
                            onClick={() => handleSaveToVault(msg)}
                            disabled={savedDocId === msg.id}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                              savedDocId === msg.id
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200"
                            }`}
                          >
                            <FolderLock className="w-3.5 h-3.5" />
                            <span>
                              {savedDocId === msg.id ? "در پرونده ذخیره شد" : "ذخیره در پرونده"}
                            </span>
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Bot className="w-4 h-4 text-indigo-200 animate-pulse" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 space-y-2.5 max-w-md shadow-xs">
                <div className="flex items-center gap-2 text-xs text-indigo-700 font-semibold">
                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                  <span>در حال استخراج قوانین و نگارش نظریه تخصصی توسط دادومهر...</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full animate-pulse w-3/4" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Telegram-style Modern Floating Fixed Bottom Input Bar */}
        <div className="fixed bottom-3 sm:bottom-5 left-0 lg:left-0 right-0 lg:right-64 z-40 px-3 sm:px-6 max-w-5xl mx-auto pointer-events-none">
          <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-3xl p-2 sm:p-2.5 shadow-xl shadow-slate-900/10">
            {error && (
              <div className="p-2.5 mb-2 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                placeholder="سوال، چالش حقوقی یا ابهام خود را اینجا بنویسید..."
                disabled={loading}
                className="flex-1 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-indigo-500 rounded-full px-5 py-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100/60 transition-all"
              />
              <button
                type="submit"
                disabled={loading || !inputQuestion.trim()}
                className="w-11 h-11 rounded-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 transition-all disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed shrink-0 cursor-pointer"
                title="ارسال پیام"
              >
                <Send className="w-5 h-5 transform scale-x-[-1] ml-0.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
