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
  const [panelWidth, setPanelWidth] = useState(480);
  const [fontSize, setFontSize] = useState(14);
  const [quotedText, setQuotedText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

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
          await localforage.setItem(id, { ...progress, id, timestamp: Date.now(), vocabularyCount: vocabBlockMatches?.length || 0 });
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

    const userMessage = quotedText
      ? `> "${quotedText}"\n\n${input.trim()}`
      : input.trim();
    setMessages(prev => [...prev, { role: "user", text: userMessage }]);
    setInput("");
    setQuotedText("");
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

  const startResize = useCallback((e: React.MouseEvent) => {
    isResizingRef.current = true;
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = panelWidth;
    const onMove = (ev: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = resizeStartX.current - ev.clientX;
      setPanelWidth(Math.min(860, Math.max(360, resizeStartWidth.current + delta)));
    };
    const onUp = () => {
      isResizingRef.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [panelWidth]);

  const handleTextSelect = useCallback(() => {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? "";
    if (text.length > 8) setQuotedText(text);
  }, []);

  const cleanText = (text: string) =>
    text
      .replace(/\[VOCAB_START\][\s\S]*?\[VOCAB_END\]/g, "")
      .replace(/\[PROGRESS_START\][\s\S]*?\[PROGRESS_END\]/g, "")
      .replace(/\[SUGGEST_START\][\s\S]*?\[SUGGEST_END\]/g, "")
      .trim();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-gradient-to-br from-violet-950/60 to-indigo-950/60 backdrop-blur-sm z-40"
          />
          {/* Panel */}
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            style={{ width: typeof window !== "undefined" && window.innerWidth < 768 ? "100%" : panelWidth }}
            className="fixed top-0 right-0 h-full bg-white/95 backdrop-blur-2xl shadow-[0_0_60px_rgba(109,40,217,0.2)] z-50 flex flex-col border-l border-violet-100/60"
          >
            {/* Resize handle — desktop only */}
            <div
              onMouseDown={startResize}
              className="hidden md:flex absolute left-0 top-0 w-2 h-full cursor-col-resize z-20 items-center justify-center group"
            >
              <div className="w-0.5 h-14 rounded-full bg-violet-200 group-hover:bg-violet-400 group-hover:h-20 transition-all duration-200" />
            </div>
            {/* Header — glassmorphism gradient */}
            <div className="relative overflow-hidden shrink-0">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-indigo-500 to-purple-600" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15)_0%,_transparent_60%)]" />
              <div className="relative px-4 py-3 flex justify-between items-center gap-2">
                {/* Logo + title */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0 bg-white/20 backdrop-blur-sm p-2 rounded-xl border border-white/25 shadow-lg">
                    <GraduationCap size={20} className="text-white" />
                    <Sparkles size={8} className="absolute -top-1 -right-1 text-yellow-300 drop-shadow" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold text-white text-[15px] leading-tight">AI Examiner</h2>
                    <p className="text-white/55 text-[9px] tracking-widest uppercase truncate">Professional CEFR Feedback</p>
                  </div>
                </div>
                {/* Controls */}
                <div className="flex items-center gap-0.5 shrink-0">
                  {/* Font size — desktop only */}
                  <div className="hidden md:flex items-center gap-0.5 mr-1.5 bg-white/10 rounded-lg p-0.5">
                    <button onClick={() => setFontSize(s => Math.max(11, s - 1))}
                      className="w-6 h-6 text-white/80 hover:text-white hover:bg-white/20 rounded-md text-xs font-bold transition-all flex items-center justify-center">A-</button>
                    <button onClick={() => setFontSize(s => Math.min(20, s + 1))}
                      className="w-6 h-6 text-white/80 hover:text-white hover:bg-white/20 rounded-md text-sm font-bold transition-all flex items-center justify-center">A+</button>
                  </div>
                  {/* Tabs */}
                  {(["chat", "vocab", "progress"] as const).map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`p-2 rounded-xl transition-all ${activeTab === tab ? "bg-white/25 shadow-inner" : "hover:bg-white/15"}`}>
                      {tab === "chat" && <MessageSquare size={17} className="text-white" />}
                      {tab === "vocab" && <BookOpen size={17} className="text-white" />}
                      {tab === "progress" && <BarChart size={17} className="text-white" />}
                    </button>
                  ))}
                  <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors ml-0.5 border border-white/10">
                    <X size={17} className="text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-hidden flex flex-col bg-gradient-to-b from-slate-50 via-white to-indigo-50/30">
              {activeTab === "chat" ? (
                !selectedAnswer ? (
                  /* ── Answer Selection List ── */
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest px-1">Saqlangan javoblar</p>
                    {savedAnswers.length === 0 ? (
                      <div className="text-center mt-16 px-6">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center">
                          <GraduationCap size={32} className="text-violet-400" />
                        </div>
                        <p className="text-gray-600 font-medium">Hali javob saqlanmagan</p>
                        <p className="text-gray-400 text-sm mt-1">Mock yoki Practice rejimida javob bering</p>
                      </div>
                    ) : (
                      savedAnswers.map((answer) => (
                        <motion.div
                          key={answer.id}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => handleSelectAnswer(answer)}
                          className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-violet-100/60 cursor-pointer hover:border-violet-300 hover:shadow-[0_4px_20px_rgba(109,40,217,0.1)] transition-all group shadow-sm"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[11px] font-bold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-lg border border-violet-100">
                              {answer.part}
                            </span>
                            <div className="flex items-center gap-2">
                              {answer.analysis && (
                                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium border border-emerald-100">✓ Tahlil</span>
                              )}
                              <button onClick={(e) => handleDeleteAnswer(answer.id, e)}
                                className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1 rounded-lg hover:bg-red-50">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-800 font-medium line-clamp-2 mb-2 leading-relaxed">{answer.questionText}</p>
                          <p className="text-[10px] text-gray-400">{new Date(answer.timestamp).toLocaleString()}</p>
                        </motion.div>
                      ))
                    )}
                  </div>
                ) : (
                  /* ── Chat + Analysis View ── */
                  <div className="flex-1 flex flex-col h-full" style={{ fontSize }}>
                    {/* Selected answer header */}
                    <div className="bg-white/70 backdrop-blur-sm px-4 py-3 border-b border-violet-100/50 shrink-0">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[11px] font-bold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-lg border border-violet-100">
                          {selectedAnswer.part}
                        </span>
                        <button
                          onClick={() => { setSelectedAnswer(null); setMessages([]); setReRecordedAudioUrl(null); setReRecordedBlob(null); stopRecording(); setQuotedText(""); }}
                          className="text-[11px] text-violet-500 hover:text-violet-700 font-medium transition-colors"
                        >
                          ← Boshqasini tanlash
                        </button>
                      </div>
                      <p className="text-sm text-gray-800 font-medium leading-snug">{selectedAnswer.questionText}</p>
                      {selectedAnswer.audioUrl && (
                        <audio controls src={selectedAnswer.audioUrl} className="w-full h-8 mt-2 rounded-xl" />
                      )}
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3" onMouseUp={handleTextSelect}>
                      {messages.map((msg, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div className={`max-w-[92%] rounded-2xl px-3.5 py-3 ${
                            msg.role === "user"
                              ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white rounded-tr-sm shadow-[0_4px_14px_rgba(109,40,217,0.3)]"
                              : "bg-white/80 backdrop-blur-sm border border-violet-100/60 text-gray-800 rounded-tl-sm shadow-[0_2px_12px_rgba(99,102,241,0.07)]"
                          }`}>
                            {/* Message role label */}
                            <div className={`flex items-center gap-1.5 mb-1.5 ${msg.role === "user" ? "opacity-70" : "opacity-60"}`}>
                              {msg.role === "user" ? (
                                <User size={11} />
                              ) : isStreaming && idx === messages.length - 1 ? (
                                <motion.div animate={{ scale: [1, 1.35, 1] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }} style={{ display: "flex" }}>
                                  <GraduationCap size={11} />
                                </motion.div>
                              ) : (
                                <GraduationCap size={11} />
                              )}
                              <span className="text-[9px] font-bold uppercase tracking-wider">
                                {msg.role === "user" ? "Siz" : "AI Examiner"}
                              </span>
                              {msg.role === "model" && isStreaming && idx === messages.length - 1 && (
                                <span className="text-[9px] text-violet-400 font-medium animate-pulse">· yozmoqda</span>
                              )}
                            </div>
                            {/* Content */}
                            <div className={`prose prose-sm max-w-none leading-relaxed
                              prose-p:my-1 prose-p:leading-relaxed
                              prose-pre:bg-slate-100 prose-pre:text-slate-800 prose-pre:rounded-xl prose-pre:text-xs
                              prose-code:text-violet-600 prose-code:bg-violet-50 prose-code:px-1 prose-code:rounded
                              [&_table]:w-full [&_table]:border-collapse [&_table]:rounded-xl [&_table]:overflow-hidden [&_table]:text-xs
                              [&_th]:bg-gradient-to-r [&_th]:from-violet-600 [&_th]:to-indigo-600 [&_th]:text-white [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold
                              [&_td]:px-3 [&_td]:py-2 [&_td]:border-b [&_td]:border-violet-50
                              [&_tr:nth-child(even)_td]:bg-violet-50/40 [&_tr:hover_td]:bg-indigo-50/60
                              [&_table]:shadow-sm [&_blockquote]:border-l-4 [&_blockquote]:border-violet-300 [&_blockquote]:pl-3 [&_blockquote]:text-gray-600 [&_blockquote]:italic
                              ${msg.role === "user" ? "prose-invert [&_*]:text-white/90" : ""}`}>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanText(msg.text)}</ReactMarkdown>
                            </div>
                          </div>
                        </motion.div>
                      ))}

                      {/* Typing indicator */}
                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="bg-white/80 backdrop-blur-sm border border-violet-100/60 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                            <div className="flex items-center gap-1.5 mb-2 opacity-50">
                              <motion.div animate={{ scale: [1, 1.35, 1] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }} style={{ display: "flex" }}>
                                <GraduationCap size={11} />
                              </motion.div>
                              <span className="text-[9px] font-bold uppercase tracking-wider">AI Examiner</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {[0, 1, 2].map(i => (
                                <motion.div key={i} className="w-2 h-2 bg-violet-400 rounded-full"
                                  animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                                  transition={{ duration: 0.65, repeat: Infinity, delay: i * 0.16, ease: "easeInOut" }} />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Quote selected text banner */}
                    <AnimatePresence>
                      {quotedText && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                          className="mx-3 mb-1 flex items-start gap-2 bg-violet-50/90 backdrop-blur-sm border-l-4 border-violet-400 rounded-r-xl px-3 py-2">
                          <span className="text-[11px] text-violet-700 flex-1 line-clamp-2 italic">"{quotedText}"</span>
                          <button onClick={() => setQuotedText("")} className="text-gray-400 hover:text-red-400 shrink-0 mt-0.5 transition-colors">
                            <X size={13} />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Suggestion chips */}
                    <AnimatePresence>
                      {suggestions.length > 0 && !isStreaming && !isTyping && (
                        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                          transition={{ duration: 0.2 }} className="px-3 pt-1.5 pb-1 flex flex-col gap-1.5">
                          <p className="text-[9px] text-violet-400 font-semibold uppercase tracking-widest px-1">💬 Savol bering:</p>
                          {suggestions.map((s, i) => (
                            <motion.button key={i} whileTap={{ scale: 0.97 }} onClick={() => setInput(s)}
                              className="text-left text-xs text-violet-700 bg-violet-50/80 backdrop-blur-sm border border-violet-100/80 rounded-xl px-3 py-2 hover:bg-violet-100/80 hover:border-violet-200 transition-all shadow-sm">
                              {s}
                            </motion.button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Re-record section */}
                    <div className="px-3 pt-2 pb-1 shrink-0">
                      {!isRecording && !reRecordedAudioUrl && (
                        <button onClick={startRecording} disabled={isTyping || isAnalyzingReRecord}
                          className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-50/80 backdrop-blur-sm text-rose-500 border border-rose-200/60 rounded-2xl hover:bg-rose-100/80 transition-all text-sm font-medium disabled:opacity-50 shadow-sm">
                          <Mic size={15} />
                          Qayta yozdirish (Re-record)
                        </button>
                      )}
                      {isRecording && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex items-center gap-2.5 bg-rose-50/80 border border-rose-200/60 rounded-2xl px-4 py-2.5">
                            <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
                            <span className="text-rose-700 font-mono text-sm font-bold">{formatTime(recordingTime)}</span>
                            <span className="text-rose-400 text-xs">yozilmoqda...</span>
                          </div>
                          <button onClick={stopRecording} className="bg-gradient-to-br from-rose-500 to-red-600 text-white p-3 rounded-2xl shadow-md hover:shadow-lg transition-all">
                            <Square size={15} fill="white" />
                          </button>
                        </div>
                      )}
                      {reRecordedAudioUrl && !isRecording && (
                        <div className="flex flex-col gap-2">
                          <audio controls src={reRecordedAudioUrl} className="w-full h-8 rounded-xl" />
                          <div className="flex gap-2">
                            <button onClick={() => { if (reRecordedAudioUrl) URL.revokeObjectURL(reRecordedAudioUrl); setReRecordedAudioUrl(null); setReRecordedBlob(null); }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gray-100/80 text-gray-600 rounded-2xl hover:bg-gray-200/80 transition-colors text-sm font-medium">
                              <RotateCcw size={13} /> Qayta
                            </button>
                            <button onClick={handleReRecordAnalysis} disabled={isAnalyzingReRecord || isTyping}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-br from-violet-500 to-indigo-600 text-white rounded-2xl hover:shadow-lg transition-all text-sm font-medium disabled:opacity-50 shadow-md">
                              {isAnalyzingReRecord ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                              Tahlil
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Text input */}
                    <div className="px-3 pb-3 pt-1.5 bg-white/60 backdrop-blur-sm border-t border-violet-100/40 shrink-0">
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                          placeholder={quotedText ? "Iqtibosga javob yozing..." : "Savol yoki fikringizni yozing..."}
                          className="flex-1 bg-white/70 backdrop-blur-sm border border-violet-200/60 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/50 placeholder-gray-400 transition-all"
                          disabled={isTyping}
                        />
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          onClick={handleSendMessage}
                          disabled={isTyping || !input.trim()}
                          className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white p-2.5 rounded-2xl hover:shadow-lg transition-all disabled:opacity-50 shadow-md shrink-0"
                        >
                          <Send size={17} />
                        </motion.button>
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
