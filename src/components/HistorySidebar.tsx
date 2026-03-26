import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, ChevronLeft, Play, FileText, Clock, Trash2, Bot, Loader2 } from "lucide-react";
import localforage from "localforage";
import { SavedAnswer } from "../types";
import ReactMarkdown from "react-markdown";
import { gemini } from "../services/gemini";

interface HistorySidebarProps {
  refreshTrigger: number;
  onOpenAITeacher: (answer: SavedAnswer) => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({ refreshTrigger, onOpenAITeacher }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [savedAnswers, setSavedAnswers] = useState<SavedAnswer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<SavedAnswer | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    loadSavedAnswers();
  }, [refreshTrigger, isOpen]);

  const loadSavedAnswers = async () => {
    try {
      // Revoke old object URLs to prevent memory leaks
      savedAnswers.forEach(a => {
        if (a.audioUrl) URL.revokeObjectURL(a.audioUrl);
      });

      const answers: SavedAnswer[] = [];
      await localforage.iterate((value: SavedAnswer, key: string) => {
        if (key.startsWith("answer_")) {
          if (value.audioBlob) {
            value.audioUrl = URL.createObjectURL(value.audioBlob);
          }
          answers.push(value);
        }
      });
      answers.sort((a, b) => b.timestamp - a.timestamp);
      setSavedAnswers(answers);
      
      // Update selected answer if it was modified
      if (selectedAnswer) {
        const updated = answers.find(a => a.id === selectedAnswer.id);
        if (updated) setSelectedAnswer(updated);
      }
    } catch (err) {
      console.error("Error loading saved answers:", err);
    }
  };

  const handleDeleteAnswer = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await localforage.removeItem(id);
      if (selectedAnswer?.id === id) {
        setSelectedAnswer(null);
      }
      loadSavedAnswers();
    } catch (err) {
      console.error("Error deleting answer:", err);
    }
  };

  const handleAnalyze = async (answer: SavedAnswer) => {
    setIsAnalyzing(true);
    try {
      if (answer.part === "Full Mock Feedback" && answer.sessionId) {
        // Fetch all answers for this session
        const sessionAnswers: SavedAnswer[] = [];
        await localforage.iterate((value: SavedAnswer, key: string) => {
          if (value.sessionId === answer.sessionId && value.id !== answer.id) {
            sessionAnswers.push(value);
          }
        });
        
        // We can't easily send 8 audio files in one go without hitting limits or timeout.
        // So we'll just ask Gemini to give a general feedback based on the fact that they finished.
        // Ideally, we would send transcripts, but they might not be generated yet.
        const context = `Foydalanuvchi to'liq Multi-level Speaking Mock testini (Qism 1.1, 1.2, 2 va 3) yakunladi. 
        Unga umumiy xulosa, motivatsiya va kelgusi tayyorgarlik uchun strategik maslahatlar ber. 
        Javobingni o'zbek tilida, do'stona va ruhlantiruvchi ohangda yoz.`;
        
        const response = await gemini.generateText(context);
        const analysisText = response.text || "Tahlil qilib bo'lmadi.";
        
        const updatedAnswer = { ...answer, analysis: analysisText };
        await localforage.setItem(answer.id, updatedAnswer);
        loadSavedAnswers();
        return;
      }

      if (!answer.audioBlob) throw new Error("Audio mavjud emas");

      const reader = new FileReader();
      reader.readAsDataURL(answer.audioBlob);
      await new Promise((resolve) => {
        reader.onloadend = () => resolve(null);
      });
      
      const audioBase64 = (reader.result as string).split(",")[1];
      const context = `Foydalanuvchi quyidagi savolga javob bergan: "${answer.questionText}" (${answer.part}). Iltimos, uning javobini tahlil qilib ber.
      Tahlilda quyidagi jihatlarga alohida e'tibor qarat:
      1. Pronunciation (talaffuz) - accent va enunciation (aniq talaffuz) bo'yicha baho ber (1-10 ball).
      2. Xatolarni aniq ko'rsat va ularni qanday to'g'rilashni tushuntir.
      3. Umumiy tavsiyalar ber.
      4. Ushbu savol uchun yuqori ball oladigan 'model answer' (namunaviy javob) yozib ber va foydalanuvchining javobi bilan solishtirib, lug'at va grammatika bo'yicha farqlarni jadval ko'rinishida ko'rsat.`;
      
      const response = await gemini.analyzeAudio(audioBase64, "audio/webm", context);
      const analysisText = response.text || "Tahlil qilib bo'lmadi.";
      
      // Update in localforage
      const updatedAnswer = { ...answer, analysis: analysisText };
      await localforage.setItem(answer.id, updatedAnswer);
      
      // Reload to reflect changes
      loadSavedAnswers();
    } catch (err: any) {
      console.error("Analysis error:", err);
      const errorMsg = err?.message || String(err);
      const isQuota = errorMsg.includes("quota") || errorMsg.includes("kvota") || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("429");
      alert(isQuota
        ? "API kvota limiti tugagan. Iltimos 1-2 daqiqa kutib qayta urinib ko'ring."
        : `Tahlil qilishda xatolik: ${errorMsg}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-1/2 -translate-y-1/2 z-40 bg-white border border-gray-200 shadow-md px-2 py-3 rounded-r-xl transition-all duration-300 flex flex-col items-center gap-1 ${
          isOpen ? "left-[320px]" : "left-0"
        }`}
      >
        <FileText size={18} className="text-indigo-600" />
        {!isOpen && <span className="text-[9px] font-bold text-gray-500 writing-mode-vertical" style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>Tarix</span>}
        {isOpen ? <ChevronLeft size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-white shadow-xl border-r border-gray-200 z-30 transition-all duration-300 flex flex-col ${
          isOpen ? "w-[320px] translate-x-0" : "w-[320px] -translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <Clock size={18} className="text-indigo-600" />
            Javoblar Tarixi
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {savedAnswers.length === 0 ? (
            <p className="text-sm text-gray-500 text-center mt-10">Hali javoblar saqlanmagan.</p>
          ) : (
            savedAnswers.map((answer) => (
              <div key={answer.id} className="flex flex-col gap-2">
                <div
                  onClick={() => setSelectedAnswer(selectedAnswer?.id === answer.id ? null : answer)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedAnswer?.id === answer.id ? "bg-indigo-50 border-indigo-200" : "bg-white border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">
                      {answer.part}
                    </span>
                    <button
                      onClick={(e) => handleDeleteAnswer(answer.id, e)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-800 font-medium line-clamp-2">{answer.questionText}</p>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {selectedAnswer?.id === answer.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm space-y-3">
                        <div>
                          {answer.audioUrl && (
                            <>
                              <p className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                                <Play size={12} /> Audio
                              </p>
                              <audio src={answer.audioUrl} controls className="w-full h-8" />
                            </>
                          )}
                        </div>
                        
                        <div className="pt-2 border-t border-gray-200">
                          {answer.analysis ? (
                            <div className="mt-2 prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-gray-100 prose-pre:text-gray-800 text-xs">
                              <ReactMarkdown>{answer.analysis}</ReactMarkdown>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAnalyze(answer);
                              }}
                              disabled={isAnalyzing}
                              className="w-full flex items-center justify-center gap-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 py-2 rounded-md transition-colors text-xs font-bold disabled:opacity-50"
                            >
                              {isAnalyzing && selectedAnswer?.id === answer.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <FileText size={14} />
                              )}
                              Transcript va Tahlilni ko'rish
                            </button>
                          )}
                        </div>
                        
                        <div className="pt-2 border-t border-gray-200">
                          <button
                            onClick={() => onOpenAITeacher(answer)}
                            className="w-full flex items-center justify-center gap-2 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 py-2 rounded-md transition-colors text-xs font-bold"
                          >
                            <Bot size={14} />
                            AI Teacher bilan muhokama
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};
