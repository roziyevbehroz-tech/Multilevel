import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, ChevronLeft, Play, FileText, Clock, Trash2, GraduationCap, Sparkles } from "lucide-react";
import localforage from "localforage";
import { SavedAnswer } from "../types";

interface HistorySidebarProps {
  refreshTrigger: number;
  onOpenAITeacher: (answer: SavedAnswer) => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({ refreshTrigger, onOpenAITeacher }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [savedAnswers, setSavedAnswers] = useState<SavedAnswer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<SavedAnswer | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSavedAnswers();
  }, [refreshTrigger, isOpen]);

  // Outside click → close
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (sidebarRef.current && !sidebarRef.current.contains(target)) {
        setIsOpen(false);
      }
    };
    // Small delay so the toggle button click doesn't immediately close
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleOutsideClick);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  const loadSavedAnswers = async () => {
    try {
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
      if (selectedAnswer?.id === id) setSelectedAnswer(null);
      loadSavedAnswers();
    } catch (err) {
      console.error("Error deleting answer:", err);
    }
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const date = d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "2-digit" });
    const time = d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
    return { date, time };
  };

  return (
    <>
      {/* Backdrop overlay — closes on outside click, sits below panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="history-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[59] bg-black/20 backdrop-blur-[2px]"
            onMouseDown={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel + toggle button wrapped together for outside-click ref */}
      <div ref={sidebarRef}>
        {/* Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`fixed top-1/2 -translate-y-1/2 z-[61] bg-white/90 backdrop-blur-md border border-indigo-100 shadow-lg px-2 py-3 rounded-r-xl transition-all duration-300 flex flex-col items-center gap-1 hover:bg-indigo-50 ${
            isOpen ? "left-[320px]" : "left-0"
          }`}
        >
          <FileText size={18} className="text-indigo-600" />
          {!isOpen && (
            <span
              className="text-[9px] font-bold text-gray-500"
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
              Tarix
            </span>
          )}
          {isOpen ? <ChevronLeft size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
        </button>

        {/* Sidebar */}
        <div
          className={`fixed top-0 left-0 h-full bg-white/95 backdrop-blur-2xl shadow-[0_0_60px_rgba(99,102,241,0.2)] border-r border-indigo-100/60 z-[60] transition-all duration-300 flex flex-col ${
            isOpen ? "w-[320px] translate-x-0" : "w-[320px] -translate-x-full"
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-indigo-100/60 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 flex-shrink-0">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Clock size={18} className="text-indigo-200" />
              Javoblar Tarixi
              <span className="ml-auto text-xs text-indigo-200 font-normal">{savedAnswers.length} ta</span>
            </h2>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {savedAnswers.length === 0 ? (
              <div className="text-center mt-16 px-4">
                <FileText size={32} className="mx-auto text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">Hali javoblar saqlanmagan.</p>
              </div>
            ) : (
              savedAnswers.map((answer) => {
                const { date, time } = formatDate(answer.timestamp);
                const isSelected = selectedAnswer?.id === answer.id;
                return (
                  <div key={answer.id}>
                    {/* List item — date, time, part only */}
                    <div
                      onClick={() => setSelectedAnswer(isSelected ? null : answer)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-indigo-50 border-indigo-200 shadow-sm"
                          : "bg-white border-gray-100 hover:border-indigo-200 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md">
                          {answer.part}
                        </span>
                        <button
                          onClick={(e) => handleDeleteAnswer(answer.id, e)}
                          className="text-gray-300 hover:text-red-400 transition-colors p-0.5 rounded"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Clock size={10} className="text-gray-300 shrink-0" />
                        <span className="text-[11px] text-gray-500">{date}</span>
                        <span className="text-[11px] text-gray-400">{time}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-1">{answer.questionText}</p>
                    </div>

                    {/* Expanded detail — transcript + AI Tutor button */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-1.5 p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-3">
                            {/* Audio */}
                            {answer.audioUrl && (
                              <div>
                                <p className="text-[10px] font-semibold text-gray-400 mb-1 flex items-center gap-1">
                                  <Play size={10} /> Audio yozuv
                                </p>
                                <audio src={answer.audioUrl} controls className="w-full h-8" />
                              </div>
                            )}

                            {/* Transcript */}
                            {answer.transcript ? (
                              <div>
                                <p className="text-[10px] font-semibold text-gray-400 mb-1 flex items-center gap-1">
                                  <FileText size={10} /> Transcript
                                </p>
                                <p className="text-xs text-gray-700 leading-relaxed bg-white rounded-lg p-2 border border-gray-100">
                                  {answer.transcript}
                                </p>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 italic text-center py-1">
                                Transcript mavjud emas
                              </p>
                            )}

                            {/* AI Tutor button */}
                            <button
                              onClick={() => {
                                onOpenAITeacher(answer);
                                setIsOpen(false);
                              }}
                              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white py-2.5 rounded-xl transition-all text-xs font-bold shadow-sm hover:shadow-md"
                            >
                              <GraduationCap size={14} />
                              AI Tutor bilan tahlil
                              <Sparkles size={11} className="text-yellow-200" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
};
