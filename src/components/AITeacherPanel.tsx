import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Send, Loader2, GraduationCap, Sparkles, User, Trash2, MessageSquare, BookOpen, BarChart, Mic, Square, RotateCcw } from "lucide-react";
import localforage from "localforage";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { gemini } from "../services/gemini";
import { SavedAnswer } from "../types";
import { VocabularyBuilder } from "./VocabularyBuilder";
import { ProgressDashboard } from "./ProgressDashboard";

interface AITeacherPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelectedAnswer?: SavedAnswer | null;
}

const EXAMINER_CONTEXT = `Sen Uzbekiston Multi-level English Exam (CEFR) bo'yicha eng yuqori malakali Professional Examiner AI o'qituvchisan.

Sening vazifang:
1. Foydalanuvchining audio javobini CEFR mezonlari bo'yicha chuqur tahlil qilish
2. Xatolarni aniq ko'rsatish va tuzatish yo'llarini ko'rsatish
3. Foydalanuvchi bilan bemalol fikr almashish, savollariga javob berish
4. Har bir javobni qayta yozdirib, yangi javobni ham tahlil qilish

Tahlil qilganda quyidagi formatdan foydalaning:

📝 **Sizning javobingiz (Transcript):**
"[Audio transkripsiyasi]"

✅ **Natija (Score):** [Ball] / 5
⏱ **Vaqt boshqaruvi:** [Vaqt tahlili]

🔍 **Batafsil tahlil:**

**1. Ravonlik va bog'liqlik (Fluency & Coherence):**
- [Tahlil — o'zbek tilida]

**2. So'z boyligi (Lexical Resource):**
- [Ishlatilgan so'zlar va ularning C1/C2 alternativlari]

**3. Grammatik aniqlik (Grammatical Range & Accuracy):**
- [Aniq xatolar va tuzatilgan versiyalari]
| Xato | Tuzatilgan | Izoh |
|------|-----------|------|
| ... | ... | ... |

**4. Talaffuz (Pronunciation):** [1-10 ball]
- [Talaffuz bo'yicha tahlil]

🌟 **Namunaviy javob (Model Answer):**
[C1 darajasidagi mukammal javob ingliz tilida]

📊 **Solishtirma jadval:**
| Jihat | Sizning javobingiz | Model answer |
|-------|-------------------|--------------|
| ... | ... | ... |

💡 **Tavsiyalar:**
1. [Aniq, amaliy tavsiya]
2. [Aniq, amaliy tavsiya]
3. [Aniq, amaliy tavsiya]

[VOCAB_START]
{"word": "...", "definition": "...", "example": "..."}
[VOCAB_END]

[PROGRESS_START]
{"score": 0-10, "grammarStrengths": ["...", "..."], "grammarWeaknesses": ["...", "..."]}
[PROGRESS_END]

Muhim qoidalar:
- O'zbek tilida samimiy, lekin professional ohangda gapir
- Ingliz tilidagi atamalar va misollarni ingliz tilida yoz
- Har doim dalillar bilan gapir — "yaxshi" dema, NIMA yaxshi ekanini ko'rsat
- Xatolarni yumshoq, lekin ANIQ ko'rsat
- Foydalanuvchi qayta yozdirib tahlil so'rasa, oldingi javob bilan SOLISHTIR va o'sishni ko'rsat`;

export const AITeacherPanel: React.FC<AITeacherPanelProps> = ({ isOpen, onClose, initialSelectedAnswer }) => {
  const [savedAnswers, setSavedAnswers] = useState<SavedAnswer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<SavedAnswer | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "vocab" | "progress">("chat");
  const [messages, setMessages] = useState<{ role: "user" | "model"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Re-recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [reRecordedAudioUrl, setReRecordedAudioUrl] = useState<string | null>(null);
  const [reRecordedBlob, setReRecordedBlob] = useState<Blob | null>(null);
  const [isAnalyzingReRecord, setIsAnalyzingReRecord] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Track if initial analysis was already triggered for this answer
  const analysisTriggeredRef = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSavedAnswers();
      if (initialSelectedAnswer) {
        handleSelectAnswer(initialSelectedAnswer);
      }
    }
    // Cleanup on close
    if (!isOpen) {
      stopRecording();
    }
  }, [isOpen, initialSelectedAnswer]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Parse suggestions from last AI message when streaming ends
  useEffect(() => {
    if (!isStreaming && messages.length > 0) {
      const lastModel = [...messages].reverse().find(m => m.role === "model");
      if (lastModel) {
        const match = lastModel.text.match(/\[SUGGEST_START\]([\s\S]*?)\[SUGGEST_END\]/);
        if (match) {
          try {
            const data = JSON.parse(match[1].trim());
            setSuggestions(data.suggestions || []);
          } catch {
            setSuggestions([]);
          }
        } else {
          setSuggestions([]);
        }
      }
    }
  }, [isStreaming, messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (reRecordedAudioUrl) URL.revokeObjectURL(reRecordedAudioUrl);
    };
  }, []);

  const loadSavedAnswers = async () => {
    try {
      savedAnswers.forEach(a => {
        if (a.audioUrl) URL.revokeObjectURL(a.audioUrl);
      });

      const answers: SavedAnswer[] = [];
      await localforage.iterate((value: any, key: string) => {
        if (key.startsWith("answer_")) {
          const answer = value as SavedAnswer;
          if (answer.audioBlob) {
            answer.audioUrl = URL.createObjectURL(answer.audioBlob);
          }
          answers.push(answer);
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
        setMessages([]);
      }
      loadSavedAnswers();
    } catch (err) {
      console.error("Error deleting answer:", err);
    }
  };

  const handleSelectAnswer = (answer: SavedAnswer) => {
    setSelectedAnswer(answer);
    setReRecordedAudioUrl(null);
    setReRecordedBlob(null);
    analysisTriggeredRef.current = null;

    if (answer.analysis) {
      // Already analyzed — show previous analysis and allow discussion
      setMessages([
        {
          role: "model",
          text: answer.analysis
        },
        {
          role: "model",
          text: `---\n\nYuqoridagi tahlilni ko'rib chiqdingiz. Savollaringiz bo'lsa bemalol yozing yoki **qayta yozdirib** yangi javobingizni tahlil qildiring.`
        }
      ]);
    } else {
      setMessages([
        {
          role: "model",
          text: `Salom! **${answer.part}** bo'limidagi savol:\n\n> "${answer.questionText}"\n\nJavobingizni tahlil qilaman. Iltimos kuting...`
        }
      ]);
      // Auto-trigger analysis
      triggerAudioAnalysis(answer);
    }
  };

  const triggerAudioAnalysis = async (answer: SavedAnswer, isReRecord = false) => {
    if (!isReRecord && analysisTriggeredRef.current === answer.id) return;
    if (!isReRecord) analysisTriggeredRef.current = answer.id;

    const audioBlob = isReRecord ? reRecordedBlob : answer.audioBlob;
    if (!audioBlob) {
      setMessages(prev => [...prev, {
        role: "model",
        text: "Kechirasiz, audio topilmadi. Audio yozib bo'lgandan keyin qayta urinib ko'ring."
      }]);
      return;
    }

    setIsTyping(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      const audioBase64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          if (!result || !result.includes(",")) {
            reject(new Error("Audio o'qishda xatolik"));
            return;
          }
          resolve(result.split(",")[1]);
        };
        reader.onerror = () => reject(new Error("FileReader xatolik"));
      });

      let context = EXAMINER_CONTEXT;
      context += `\n\nSavol: "${answer.questionText}" (${answer.part})`;

      if (isReRecord) {
        context += `\n\nBu foydalanuvchining QAYTA YOZDIRILGAN javobi. Oldingi javob bilan solishtir va o'sishni ko'rsat. Oldingi tahlil chat tarixida mavjud.`;
        // Include previous analysis for comparison
        const prevAnalysis = messages.find(m => m.role === "model" && m.text.includes("Natija (Score)"));
        if (prevAnalysis) {
          context += `\n\nOldingi tahlil:\n${prevAnalysis.text.substring(0, 500)}...`;
        }
      }

      const audioMime = audioBlob.type || "audio/webm";

      // Add empty placeholder — streaming will fill it
      const prefix = isReRecord ? "🔄 **Yangi javobingiz tahlili:**\n\n" : "";
      setMessages(prev => [...prev, { role: "model", text: prefix }]);
      setIsTyping(false);
      setIsStreaming(true);

      let fullResponseText = prefix;
      const response = await gemini.analyzeAudio(audioBase64, audioMime, context, (chunk) => {
        fullResponseText += chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "model", text: fullResponseText };
          return updated;
        });
      });

      const responseText = response.text || fullResponseText || "Kechirasiz, tahlil qila olmadim. Iltimos qayta urinib ko'ring.";

      if (!isReRecord) {
        // Save analysis
        const updatedAnswer = { ...answer, analysis: responseText };
        await localforage.setItem(answer.id, updatedAnswer);
        setSelectedAnswer(updatedAnswer);
        setSavedAnswers(prev => prev.map(a => a.id === updatedAnswer.id ? updatedAnswer : a));
      }

      // Parse and save vocabulary — handle single or multiple JSON objects per block
      const vocabBlockMatches = responseText.match(/\[VOCAB_START\]([\s\S]*?)\[VOCAB_END\]/g);
      if (vocabBlockMatches) {
        for (const block of vocabBlockMatches) {
          const content = block.replace(/\[VOCAB_START\]|\[VOCAB_END\]/g, "").trim();
          // Extract each JSON object individually (handles multiple per block)
          const jsonObjects = content.match(/\{[^{}]+\}/g) || [];
          for (const jsonStr of jsonObjects) {
            try {
              const vocab = JSON.parse(jsonStr);
              if (vocab.word) {
                const id = `vocab_${Date.now()}_${vocab.word.replace(/\s+/g, "_")}`;
                await localforage.setItem(id, { ...vocab, id, timestamp: Date.now() });
              }
            } catch (e) {
              console.error("Error parsing vocab object:", e, jsonStr);
            }
          }
        }
      }

      // Parse and save progress
      const progressMatch = responseText.match(/\[PROGRESS_START\]([\s\S]*?)\[PROGRESS_END\]/);
      if (progressMatch) {
        try {
          const progress = JSON.parse(progressMatch[1].trim());
          const id = `progress_${Date.now()}`;
          await localforage.setItem(id, { ...progress, id, timestamp: Date.now(), vocabularyCount: vocabMatches?.length || 0 });
        } catch (e) {
          console.error("Error parsing progress:", e);
        }
      }
    } catch (err: any) {
      console.error("Audio analysis error:", err);
      const errorMsg = err?.message || String(err);
      const isQuota = errorMsg.includes("quota") || errorMsg.includes("kvota") || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("429");
      setMessages(prev => [...prev, {
        role: "model",
        text: isQuota
          ? "⚠️ **API kvota limiti tugagan.** Gemini API bepul rejimining kunlik/daqiqalik limiti oshib ketgan. Iltimos 1-2 daqiqa kutib qayta urinib ko'ring yoki API kalitingizni yangilang."
          : `Kechirasiz, tahlil qilishda xatolik yuz berdi:\n\n\`${errorMsg}\`\n\nQayta yozdirib ko'ring yoki keyinroq urinib ko'ring.`
      }]);
    } finally {
      setIsTyping(false);
      setIsStreaming(false);
      if (isReRecord) setIsAnalyzingReRecord(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: "user", text: userMessage }]);
    setInput("");
    setSuggestions([]);
    setIsTyping(true);

    try {
      let context = EXAMINER_CONTEXT;
      if (selectedAnswer) {
        context += `\n\nBiz hozir foydalanuvchining "${selectedAnswer.questionText}" (${selectedAnswer.part}) savoliga bergan javobini muhokama qilyapmiz.`;
        if (selectedAnswer.analysis) {
          context += `\n\nOldingi tahlil natijasi mavjud. Foydalanuvchi savollariga javob ber, xatolarini tushuntir, maslahat ber.`;
        }
      }

      const chatHistory = messages.map(m => ({ role: m.role, text: m.text }));

      // Add empty placeholder for streaming
      setMessages(prev => [...prev, { role: "model", text: "" }]);
      setIsTyping(false);
      setIsStreaming(true);

      let streamedText = "";
      await gemini.chat(chatHistory, userMessage, context, (chunk) => {
        streamedText += chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "model", text: streamedText };
          return updated;
        });
      });
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, {
        role: "model",
        text: "Kechirasiz, xatolik yuz berdi. Iltimos qayta urinib ko'ring."
      }]);
    } finally {
      setIsTyping(false);
      setIsStreaming(false);
    }
  };

  // --- Re-recording functions ---

  const startRecording = async () => {
    try {
      if (reRecordedAudioUrl) {
        URL.revokeObjectURL(reRecordedAudioUrl);
        setReRecordedAudioUrl(null);
      }
      setReRecordedBlob(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      // Detect supported codec — fallback for Android 7 / older browsers
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg",
        "audio/mp4",
        "",
      ].find(t => !t || MediaRecorder.isTypeSupported(t)) ?? "";

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const recordedMime = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: recordedMime });
        const url = URL.createObjectURL(blob);
        setReRecordedAudioUrl(url);
        setReRecordedBlob(blob);
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);

      // Timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      setMessages(prev => [...prev, {
        role: "model",
        text: "Mikrofondan foydalanishga ruxsat berilmadi. Iltimos, brauzer sozlamalaridan mikrofonga ruxsat bering."
      }]);
    }
  };

  const stopRecording = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, []);

  const handleReRecordAnalysis = () => {
    if (!reRecordedBlob || !selectedAnswer) return;
    setIsAnalyzingReRecord(true);
    setMessages(prev => [...prev, {
      role: "user",
      text: `🎤 Yangi javob yozdirildi (${formatTime(recordingTime)}). Tahlil qiling.`
    }]);
    triggerAudioAnalysis(selectedAnswer, true);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
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
            className="fixed top-0 right-0 h-full w-full md:w-[480px] bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="relative bg-white/20 p-1.5 rounded-xl">
                  <GraduationCap size={22} />
                  <Sparkles size={9} className="absolute -top-1 -right-1 text-yellow-300" />
                </div>
                <div>
                  <h2 className="font-bold text-lg leading-tight">AI Examiner</h2>
                  <p className="text-[10px] text-white/70">Professional CEFR Feedback</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setActiveTab("chat")}
                  className={`p-2 rounded-lg transition-colors ${activeTab === "chat" ? "bg-white/25" : "hover:bg-white/15"}`}
                  title="Chat"
                >
                  <MessageSquare size={18} />
                </button>
                <button
                  onClick={() => setActiveTab("vocab")}
                  className={`p-2 rounded-lg transition-colors ${activeTab === "vocab" ? "bg-white/25" : "hover:bg-white/15"}`}
                  title="Lug'at"
                >
                  <BookOpen size={18} />
                </button>
                <button
                  onClick={() => setActiveTab("progress")}
                  className={`p-2 rounded-lg transition-colors ${activeTab === "progress" ? "bg-white/25" : "hover:bg-white/15"}`}
                  title="Progress"
                >
                  <BarChart size={18} />
                </button>
                <button onClick={onClose} className="p-2 hover:bg-white/15 rounded-lg transition-colors ml-1">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col bg-gray-50">
              {activeTab === "chat" ? (
                !selectedAnswer ? (
                  /* Answer Selection List */
                  <div className="flex-1 overflow-y-auto p-4">
                    <h3 className="font-bold text-gray-700 mb-4">Saqlangan javoblaringiz:</h3>
                    {savedAnswers.length === 0 ? (
                      <div className="text-center mt-10 px-4">
                        <GraduationCap size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">Hali hech qanday javob saqlanmagan.</p>
                        <p className="text-gray-400 text-sm mt-2">Mock yoki Practice rejimida javob berganingizda ular shu yerda paydo bo'ladi.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {savedAnswers.map((answer) => (
                          <div
                            key={answer.id}
                            onClick={() => handleSelectAnswer(answer)}
                            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                                {answer.part}
                              </span>
                              <div className="flex items-center gap-2">
                                {answer.analysis && (
                                  <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">Tahlil qilingan</span>
                                )}
                                <button
                                  onClick={(e) => handleDeleteAnswer(answer.id, e)}
                                  className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
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
                  /* Chat + Analysis View */
                  <div className="flex-1 flex flex-col h-full">
                    {/* Selected answer header */}
                    <div className="bg-white p-3 border-b shadow-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {selectedAnswer.part}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedAnswer(null);
                            setMessages([]);
                            setReRecordedAudioUrl(null);
                            setReRecordedBlob(null);
                            stopRecording();
                          }}
                          className="text-xs text-gray-500 hover:text-indigo-600 underline"
                        >
                          Boshqasini tanlash
                        </button>
                      </div>
                      <p className="text-sm text-gray-800 font-medium">{selectedAnswer.questionText}</p>
                      {selectedAnswer.audioUrl && (
                        <audio controls src={selectedAnswer.audioUrl} className="w-full h-8 mt-2" />
                      )}
                    </div>

                    {/* Messages area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[90%] rounded-2xl p-3 ${
                            msg.role === "user"
                              ? "bg-indigo-600 text-white rounded-tr-sm"
                              : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"
                          }`}>
                            <div className="flex items-center gap-2 mb-1 opacity-70">
                              {msg.role === "user" ? (
                                <User size={12} />
                              ) : isStreaming && idx === messages.length - 1 ? (
                                <motion.div
                                  animate={{ scale: [1, 1.35, 1] }}
                                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                                  style={{ display: "flex" }}
                                >
                                  <GraduationCap size={12} />
                                </motion.div>
                              ) : (
                                <GraduationCap size={12} />
                              )}
                              <span className="text-[10px] font-bold uppercase">
                                {msg.role === "user" ? "Siz" : "AI Examiner"}
                              </span>
                              {msg.role === "model" && isStreaming && idx === messages.length - 1 && (
                                <span className="text-[9px] text-indigo-400 font-medium animate-pulse ml-1">yozmoqda...</span>
                              )}
                            </div>
                            <div className="text-sm prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-gray-100 prose-pre:text-gray-800 [&_table]:w-full [&_table]:border-collapse [&_table]:rounded-lg [&_table]:overflow-hidden [&_table]:text-xs [&_th]:bg-indigo-600 [&_th]:text-white [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_td]:px-3 [&_td]:py-2 [&_td]:border-b [&_td]:border-gray-100 [&_tr:nth-child(even)_td]:bg-gray-50 [&_tr:hover_td]:bg-indigo-50 [&_table]:shadow-sm">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.text
                                  .replace(/\[VOCAB_START\][\s\S]*?\[VOCAB_END\]/g, "")
                                  .replace(/\[PROGRESS_START\][\s\S]*?\[PROGRESS_END\]/g, "")
                                  .replace(/\[SUGGEST_START\][\s\S]*?\[SUGGEST_END\]/g, "")
                                  .trim()}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      ))}
                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm p-3 shadow-sm">
                            <div className="flex items-center gap-2 mb-2 opacity-60">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                style={{ display: "flex" }}
                              >
                                <GraduationCap size={12} />
                              </motion.div>
                              <span className="text-[10px] font-bold uppercase">AI Examiner</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-1">
                              {[0, 1, 2].map(i => (
                                <motion.div
                                  key={i}
                                  className="w-2.5 h-2.5 bg-indigo-400 rounded-full"
                                  animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
                                  transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Quick reply suggestion chips */}
                    <AnimatePresence>
                      {suggestions.length > 0 && !isStreaming && !isTyping && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.25 }}
                          className="px-4 pt-2 pb-1 flex flex-col gap-1.5"
                        >
                          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">💬 Savol bering:</p>
                          {suggestions.map((s, i) => (
                            <button
                              key={i}
                              onClick={() => setInput(s)}
                              className="text-left text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 hover:bg-indigo-100 active:scale-95 transition-all"
                            >
                              {s}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Re-record section */}
                    <div className="bg-gradient-to-t from-gray-100 to-transparent px-4 pt-2 pb-0">
                      {!isRecording && !reRecordedAudioUrl && (
                        <button
                          onClick={startRecording}
                          disabled={isTyping || isAnalyzingReRecord}
                          className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Mic size={16} />
                          Qayta yozdirish (Re-record)
                        </button>
                      )}
                      {isRecording && (
                        <div className="flex items-center gap-3 py-2">
                          <div className="flex-1 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-red-700 font-mono text-sm font-bold">{formatTime(recordingTime)}</span>
                            <span className="text-red-500 text-xs">Yozilmoqda...</span>
                          </div>
                          <button
                            onClick={stopRecording}
                            className="bg-red-600 text-white p-3 rounded-xl hover:bg-red-700 transition-colors"
                          >
                            <Square size={16} fill="white" />
                          </button>
                        </div>
                      )}
                      {reRecordedAudioUrl && !isRecording && (
                        <div className="flex flex-col gap-2 py-2">
                          <audio controls src={reRecordedAudioUrl} className="w-full h-8" />
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                if (reRecordedAudioUrl) URL.revokeObjectURL(reRecordedAudioUrl);
                                setReRecordedAudioUrl(null);
                                setReRecordedBlob(null);
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors text-sm"
                            >
                              <RotateCcw size={14} />
                              Qayta yozdirish
                            </button>
                            <button
                              onClick={handleReRecordAnalysis}
                              disabled={isAnalyzingReRecord || isTyping}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                              {isAnalyzingReRecord ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                              Tahlil qilish
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Text input */}
                    <div className="p-3 bg-white border-t">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                          placeholder="Savol yoki fikringizni yozing..."
                          className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          disabled={isTyping}
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={isTyping || !input.trim()}
                          className="bg-indigo-600 text-white p-2.5 rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              ) : activeTab === "vocab" ? (
                <div key="vocab" className="flex-1 overflow-y-auto p-4">
                  <VocabularyBuilder />
                </div>
              ) : (
                <div key="progress" className="flex-1 overflow-y-auto p-4">
                  <ProgressDashboard />
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
