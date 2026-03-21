import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Mic, Send, Loader2, Bot, User, Trash2, Play, Square } from "lucide-react";
import localforage from "localforage";
import ReactMarkdown from "react-markdown";
import { gemini } from "../services/gemini";
import { SavedAnswer } from "../types";

interface AITeacherPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelectedAnswer?: SavedAnswer | null;
}

export const AITeacherPanel: React.FC<AITeacherPanelProps> = ({ isOpen, onClose, initialSelectedAnswer }) => {
  const [savedAnswers, setSavedAnswers] = useState<SavedAnswer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<SavedAnswer | null>(null);
  const [messages, setMessages] = useState<{ role: "user" | "model"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadSavedAnswers();
      if (initialSelectedAnswer) {
        handleSelectAnswer(initialSelectedAnswer);
      }
    }
  }, [isOpen, initialSelectedAnswer]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const loadSavedAnswers = async () => {
    try {
      const answers: SavedAnswer[] = [];
      await localforage.iterate((value: SavedAnswer, key: string) => {
        if (key.startsWith("answer_")) {
          // Recreate audio URL from blob since object URLs are session-specific
          if (value.audioBlob) {
            value.audioUrl = URL.createObjectURL(value.audioBlob);
          }
          answers.push(value);
        }
      });
      answers.sort((a, b) => b.timestamp - a.timestamp);
      setSavedAnswers(answers);
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

  const handleSelectAnswer = (answer: SavedAnswer) => {
    setSelectedAnswer(answer);
    setMessages([
      {
        role: "model",
        text: `Salom! Men sizning AI o'qituvchingizman. Siz **${answer.part}** dagi "${answer.questionText}" savoliga bergan javobingizni tanladingiz. Bu javobni tahlil qilishimni xohlaysizmi yoki qandaydir savolingiz bormi?`
      }
    ]);
  };

  const handleSendMessage = async () => {
    if (!input.trim() && !selectedAnswer) return;

    const userMessage = input.trim();
    if (userMessage) {
      setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
      setInput("");
    }

    setIsTyping(true);

    try {
      // Construct context
      let context = "Sen IELTS/Multi-level bo'yicha ekspert AI o'qituvchisan. O'zbek tilida do'stona va yordam beruvchi ohangda javob ber.";
      let audioBase64: string | undefined;
      let mimeType = "audio/webm";

      if (selectedAnswer && messages.length === 1) {
        // First message about this answer, send the audio for analysis
        context += `\n\nFoydalanuvchi quyidagi savolga javob bergan: "${selectedAnswer.questionText}" (${selectedAnswer.part}). Iltimos, uning javobini tahlil qilib ber.`;
        
        const reader = new FileReader();
        reader.readAsDataURL(selectedAnswer.audioBlob);
        await new Promise((resolve) => {
          reader.onloadend = () => {
            audioBase64 = (reader.result as string).split(",")[1];
            resolve(null);
          };
        });
      } else if (selectedAnswer) {
         context += `\n\nBiz hozir foydalanuvchining "${selectedAnswer.questionText}" savoliga bergan javobini muhokama qilyapmiz.`;
      }

      // We can use gemini.analyzeAudio if we have audio, or just a text chat.
      // Since geminiService currently only has analyzeAudio and connectLive, let's add a simple text chat method or reuse analyzeAudio.
      // For now, let's use analyzeAudio if audio exists, otherwise we need a text chat method.
      // I will update geminiService to have a chat method.
      
      let responseText = "";
      if (audioBase64) {
         const response = await gemini.analyzeAudio(audioBase64, mimeType, context + (userMessage ? `\nFoydalanuvchi xabari: ${userMessage}` : ""));
         responseText = response.text || "Kechirasiz, tahlil qila olmadim.";
         
         // Save analysis to localforage if it's the first time
         if (selectedAnswer && !selectedAnswer.analysis) {
           const updatedAnswer = { ...selectedAnswer, analysis: responseText };
           await localforage.setItem(selectedAnswer.id, updatedAnswer);
           setSelectedAnswer(updatedAnswer);
           // Also update in the list
           setSavedAnswers(prev => prev.map(a => a.id === updatedAnswer.id ? updatedAnswer : a));
         }
      } else {
         // We need a text chat method in geminiService. I'll call a new method `chat` which I will add.
         const response = await gemini.chat(messages.map(m => ({ role: m.role, text: m.text })), userMessage, context);
         responseText = response.text || "Kechirasiz, javob bera olmadim.";
      }

      setMessages((prev) => [...prev, { role: "model", text: responseText }]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [...prev, { role: "model", text: "Kechirasiz, xatolik yuz berdi. Iltimos qayta urinib ko'ring." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full md:w-[450px] bg-white shadow-2xl z-50 flex flex-col"
          >
            <div className="p-4 border-b bg-indigo-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bot size={24} />
                <h2 className="font-bold text-lg">AI Teacher</h2>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-indigo-700 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col bg-gray-50">
              {!selectedAnswer ? (
                <div className="flex-1 overflow-y-auto p-4">
                  <h3 className="font-bold text-gray-700 mb-4">Saqlangan javoblaringiz:</h3>
                  {savedAnswers.length === 0 ? (
                    <p className="text-gray-500 text-center mt-10">Hali hech qanday javob saqlanmagan. Testni ishlaganingizda javoblaringiz shu yerda paydo bo'ladi.</p>
                  ) : (
                    <div className="space-y-3">
                      {savedAnswers.map((answer) => (
                        <div
                          key={answer.id}
                          onClick={() => handleSelectAnswer(answer)}
                          className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:border-indigo-300 transition-colors group"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                              {answer.part}
                            </span>
                            <button
                              onClick={(e) => handleDeleteAnswer(answer.id, e)}
                              className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <p className="text-sm text-gray-800 font-medium line-clamp-2 mb-2">
                            {answer.questionText}
                          </p>
                          <div className="text-xs text-gray-500">
                            {new Date(answer.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col h-full">
                  <div className="bg-white p-3 border-b shadow-sm flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-indigo-600 font-bold mb-1">{selectedAnswer.part}</p>
                        <p className="text-sm text-gray-800 truncate">{selectedAnswer.questionText}</p>
                      </div>
                      <button
                        onClick={() => setSelectedAnswer(null)}
                        className="ml-2 text-xs text-gray-500 hover:text-indigo-600 underline whitespace-nowrap"
                      >
                        Boshqasini tanlash
                      </button>
                    </div>
                    {selectedAnswer.audioUrl && (
                      <audio controls src={selectedAnswer.audioUrl} className="w-full h-8 mt-1" />
                    )}
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-2xl p-3 ${msg.role === "user" ? "bg-indigo-600 text-white rounded-tr-sm" : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"}`}>
                          <div className="flex items-center gap-2 mb-1 opacity-70">
                            {msg.role === "user" ? <User size={12} /> : <Bot size={12} />}
                            <span className="text-[10px] font-bold uppercase">{msg.role === "user" ? "Siz" : "AI Teacher"}</span>
                          </div>
                          <div className="text-sm prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-gray-100 prose-pre:text-gray-800">
                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm p-4 shadow-sm flex items-center gap-2 text-gray-500">
                          <Loader2 size={16} className="animate-spin" />
                          <span className="text-sm">AI Teacher yozmoqda...</span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-4 bg-white border-t">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                        placeholder="Xabaringizni yozing..."
                        className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={isTyping || (!input.trim() && messages.length > 1)}
                        className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
