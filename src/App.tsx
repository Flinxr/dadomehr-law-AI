import React, { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { ContractDrafter } from "./components/ContractDrafter";
import { JudicialDrafter } from "./components/JudicialDrafter";
import { RiskAnalyzer } from "./components/RiskAnalyzer";
import { LegalCounsel } from "./components/LegalCounsel";
import { CaseSummarizer } from "./components/CaseSummarizer";
import { DocumentVault } from "./components/DocumentVault";
import { PdfToTextExtractor } from "./components/PdfToTextExtractor";
import { DocumentInspector } from "./components/DocumentInspector";
import { INITIAL_DOCUMENTS } from "./data/initialDocuments";
import { ActiveTab, LegalDocument } from "./types";
import { CheckCircle2 } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("counsel");

  // Documents state (Archive of user documents)
  const [documents, setDocuments] = useState<LegalDocument[]>(() => {
    const saved = localStorage.getItem("dadban_documents");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_DOCUMENTS;
  });

  // Prefill for Risk Analyzer when forwarded from Drafter or PDF
  const [riskContractPrefill, setRiskContractPrefill] = useState<string>("");
  // Prefill for Summarizer when forwarded from PDF
  const [summarizerPrefill, setSummarizerPrefill] = useState<string>("");

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync with localStorage
  useEffect(() => {
    localStorage.setItem("dadban_documents", JSON.stringify(documents));
  }, [documents]);

  const handleSaveDocument = (docData: Omit<LegalDocument, "id">) => {
    const newDoc: LegalDocument = {
      ...docData,
      id: `doc-${Date.now()}`,
    };
    setDocuments((prev) => [newDoc, ...prev]);
    showToast(`سند «${newDoc.title}» در آرشیو اسناد ذخیره شد.`);
  };

  const handleUpdateDocument = (updatedDoc: LegalDocument) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d))
    );
    showToast(`سند «${updatedDoc.title}» به‌روزرسانی شد.`);
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    showToast("سند با موفقیت از آرشیو حذف شد.");
  };

  const handleSendToRiskAnalysis = (contractText: string) => {
    setRiskContractPrefill(contractText);
    setActiveTab("risk");
    showToast("متن سند به بخش ممیزی و تحلیل ریسک منتقل شد.");
  };

  const handleSendToSummarizer = (caseText: string) => {
    setSummarizerPrefill(caseText);
    setActiveTab("summarizer");
    showToast("متن سند به بخش خلاصه‌ساز و ابهام‌زدایی منتقل شد.");
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#F8FAFC] text-slate-900 flex flex-col lg:flex-row font-sans selection:bg-indigo-500/20 selection:text-indigo-900">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content & Footer Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full w-full min-h-screen overflow-x-hidden">
        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-full min-w-0 p-3.5 sm:p-6 lg:p-8">
          {activeTab === "counsel" && (
            <LegalCounsel
              onSaveDocument={handleSaveDocument}
            />
          )}

          {activeTab === "drafter" && (
            <ContractDrafter
              onSaveDocument={handleSaveDocument}
              onSendToRiskAnalysis={handleSendToRiskAnalysis}
            />
          )}

          {activeTab === "judicial" && (
            <JudicialDrafter
              onSaveDocument={handleSaveDocument}
            />
          )}

          {activeTab === "inspector" && (
            <DocumentInspector
              onSaveDocument={handleSaveDocument}
              onSendToRiskAnalysis={handleSendToRiskAnalysis}
            />
          )}

          {activeTab === "risk" && (
            <RiskAnalyzer
              initialContractText={riskContractPrefill}
              onSaveDocument={handleSaveDocument}
              onSendToDrafter={(_text) => {
                setActiveTab("drafter");
              }}
            />
          )}

          {activeTab === "summarizer" && (
            <CaseSummarizer
              onSaveDocument={handleSaveDocument}
              initialCaseText={summarizerPrefill}
            />
          )}

          {activeTab === "pdf_to_text" && (
            <PdfToTextExtractor
              onSendToRiskAnalysis={handleSendToRiskAnalysis}
              onSendToSummarizer={handleSendToSummarizer}
              onSaveDocument={handleSaveDocument}
            />
          )}

          {activeTab === "vault" && (
            <DocumentVault
              documents={documents}
              onUpdateDocument={handleUpdateDocument}
              onDeleteDocument={handleDeleteDocument}
              onNewDocument={() => setActiveTab("drafter")}
            />
          )}
        </main>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-indigo-200 text-indigo-950 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
