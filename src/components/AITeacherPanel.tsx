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
  onWidthChange?: (w: number) => void;
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

export const AITeacherPanel: React.FC<AITeacherPanelProps> = ({ isOpen, onClose, initialSelectedAnswer, onWidthChange }) => {
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

  // UI state for collapsible sections
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [expandedFeedback, setExpandedFeedback] = useState(true);
  const [expandedAudioBar, setExpandedAudioBar] = useState(true);
  const [reRecordedBlob, setReRecordedBlob] = useState<Blob | null>(null);
  const [isAnalyzingReRecord, setIsAnalyzingReRecord] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Audio level analysis for real-time visualizer
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

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

  // Sync panel width to parent (for desktop push layout)
  useEffect(() => { onWidthChange?.(panelWidth); }, [panelWidth, onWidthChange]);

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
    setExpandedAudioBar(true);
    setExpandedFeedback(true);
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

      // Audio level analyser (real-time mic visualization)
      try {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);
        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          // Average of lower frequencies (voice range)
          const slice = dataArray.slice(0, 40);
          const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
          setAudioLevel(Math.min(avg / 128, 1)); // normalize 0-1
          animFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      } catch (e) {
        console.warn("AudioContext not supported for visualizer:", e);
      }

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
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
      analyserRef.current = null;
    }
    setAudioLevel(0);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, []);

  const cancelRecording = useCallback(() => {
    // Stop recording and discard the result
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
      analyserRef.current = null;
    }
    setAudioLevel(0);
    // Discard chunks so onstop produces empty/discarded blob
    chunksRef.current = [];
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setReRecordedAudioUrl(null);
    setReRecordedBlob(null);
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
          {/* Backdrop — mobile only (desktop uses push layout, no overlay) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-gradient-to-br from-violet-950/60 to-indigo-950/60 backdrop-blur-sm z-40 md:hidden"
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
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-lg border border-violet-100">
                            {selectedAnswer.part}
                          </span>
                          {selectedAnswer.audioUrl && (
                            <button onClick={() => setExpandedAudioBar(!expandedAudioBar)}
                              className="text-violet-500 hover:text-violet-700 transition-colors p-1">
                              <span className={`text-sm transition-transform duration-200 ${expandedAudioBar ? "" : "rotate-90"}`}>▼</span>
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => { setSelectedAnswer(null); setMessages([]); setReRecordedAudioUrl(null); setReRecordedBlob(null); stopRecording(); setQuotedText(""); }}
                          className="text-[11px] text-violet-500 hover:text-violet-700 font-medium transition-colors"
                        >
                          ← Boshqasini tanlash
                        </button>
                      </div>
                      <p className="text-sm text-gray-800 font-medium leading-snug">{selectedAnswer.questionText}</p>
                      {/* Collapsible audio bar with smooth animation */}
                      <AnimatePresence>
                        {selectedAnswer.audioUrl && expandedAudioBar && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }} className="mt-2">
                            <audio controls src={selectedAnswer.audioUrl} className="w-full h-8 rounded-xl" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3" onMouseUp={handleTextSelect}>
                      {messages.map((msg, idx) => {
                        const isAnalysis = msg.role === "model" && msg.text.includes("Natija (Score)");
                        const isCollapsedAnalysis = isAnalysis && idx === 0 && !expandedFeedback;

                        return (
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
                            {/* Message role label with collapse button for analysis */}
                            <div className={`flex items-center gap-1.5 ${isCollapsedAnalysis ? "mb-0" : "mb-1.5"} ${msg.role === "user" ? "opacity-70" : "opacity-60"}`}>
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
                              {isAnalysis && (
                                <button onClick={() => setExpandedFeedback(!expandedFeedback)}
                                  className="ml-auto text-[10px] text-violet-500 hover:text-violet-700 font-bold transition-colors">
                                  {expandedFeedback ? "▼" : "▶"} Tahlil
                                </button>
                              )}
                            </div>
                            {/* Content — show/hide for analysis */}
                            {!isCollapsedAnalysis && (
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
                            )}
                          </div>
                        </motion.div>
                      );
                      })}

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

                    {/* Suggestion chips — collapsible dropdown */}
                    <AnimatePresence>
                      {suggestions.length > 0 && !isStreaming && !isTyping && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }} className="px-3 overflow-hidden">
                          <button onClick={() => setShowSuggestions(!showSuggestions)}
                            className="w-full text-left flex items-center gap-2 py-1.5 text-[10px] font-semibold text-violet-600 hover:text-violet-700 transition-colors">
                            <span className={`transition-transform duration-200 ${showSuggestions ? "rotate-90" : ""}`}>▶</span>
                            <span>💬 AI Tutorga savol bering ({suggestions.length})</span>
                          </button>
                          <AnimatePresence>
                            {showSuggestions && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.15 }} className="flex flex-col gap-1.5 pb-2 overflow-hidden">
                                {suggestions.map((s, i) => (
                                  <motion.button key={i} whileTap={{ scale: 0.97 }} onClick={() => { setInput(s); setShowSuggestions(false); }}
                                    className="text-left text-xs text-violet-700 bg-violet-50/80 backdrop-blur-sm border border-violet-100/80 rounded-xl px-3 py-2 hover:bg-violet-100/80 hover:border-violet-200 transition-all shadow-sm">
                                    {s}
                                  </motion.button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Re-recorded audio player — compact */}
                    {reRecordedAudioUrl && !isRecording && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="px-3 pt-1.5 pb-0.5 shrink-0">
                        <div className="flex flex-col gap-1.5">
                          <audio controls src={reRecordedAudioUrl} className="w-full h-7 rounded-xl text-xs" />
                          <div className="flex gap-1.5">
                            <button onClick={() => { if (reRecordedAudioUrl) URL.revokeObjectURL(reRecordedAudioUrl); setReRecordedAudioUrl(null); setReRecordedBlob(null); }}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-gray-100/80 text-gray-600 rounded-lg hover:bg-gray-200/80 transition-colors text-xs font-medium">
                              <RotateCcw size={12} /> Qayta
                            </button>
                            <button onClick={handleReRecordAnalysis} disabled={isAnalyzingReRecord || isTyping}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-gradient-to-br from-violet-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all text-xs font-medium disabled:opacity-50">
                              {isAnalyzingReRecord ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                              Tahlil
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Telegram-style input bar */}
                    <div className="px-3 pb-3 pt-1.5 bg-white/60 backdrop-blur-sm border-t border-violet-100/40 shrink-0">
                      <div className="flex gap-2 items-end">
                        {isRecording ? (
                          /* ── Recording mode ── */
                          <>
                            <div className="flex-1 flex items-center gap-2.5 bg-white/70 backdrop-blur-sm border border-rose-200/60 rounded-2xl px-4 py-2.5">
                              <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                              <span className="text-rose-700 font-mono text-sm font-bold">{formatTime(recordingTime)}</span>
                              <button onClick={cancelRecording}
                                className="ml-auto text-[11px] text-rose-500 hover:text-rose-700 font-semibold transition-colors uppercase tracking-wide">
                                Bekor
                              </button>
                            </div>
                            {/* Send/Stop button with live audio ring */}
                            <motion.button
                              whileTap={{ scale: 0.88 }}
                              onClick={stopRecording}
                              className="relative shrink-0"
                            >
                              {/* Live audio level ring */}
                              <div className="absolute inset-0 rounded-full transition-transform duration-75"
                                style={{
                                  transform: `scale(${1 + audioLevel * 0.5})`,
                                  background: `radial-gradient(circle, rgba(139,92,246,${0.08 + audioLevel * 0.2}) 0%, transparent 70%)`
                                }}
                              />
                              <div className="relative bg-gradient-to-br from-violet-500 to-indigo-600 text-white p-2.5 rounded-full shadow-md"
                                style={{
                                  boxShadow: `0 0 ${4 + audioLevel * 16}px rgba(139,92,246,${0.3 + audioLevel * 0.4})`
                                }}>
                                <Send size={17} />
                              </div>
                            </motion.button>
                          </>
                        ) : (
                          /* ── Normal mode ── */
                          <>
                            <input
                              type="text"
                              value={input}
                              onChange={(e) => setInput(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                              placeholder={quotedText ? "Iqtibosga javob yozing..." : "Savol yoki fikringizni yozing..."}
                              className="flex-1 bg-white/70 backdrop-blur-sm border border-violet-200/60 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/50 placeholder-gray-400 transition-all"
                              disabled={isTyping}
                            />
                            {/* Single button: mic when empty, send when text exists */}
                            <AnimatePresence mode="wait">
                              {input.trim() ? (
                                <motion.button
                                  key="send"
                                  initial={{ scale: 0.5, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0.5, opacity: 0 }}
                                  transition={{ duration: 0.15 }}
                                  whileTap={{ scale: 0.88 }}
                                  onClick={handleSendMessage}
                                  disabled={isTyping}
                                  className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white p-2.5 rounded-full hover:shadow-lg transition-all disabled:opacity-50 shadow-md shrink-0"
                                >
                                  <Send size={17} />
                                </motion.button>
                              ) : (
                                <motion.button
                                  key="mic"
                                  initial={{ scale: 0.5, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0.5, opacity: 0 }}
                                  transition={{ duration: 0.15 }}
                                  whileTap={{ scale: 0.88 }}
                                  onClick={startRecording}
                                  disabled={isTyping || isAnalyzingReRecord}
                                  className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white p-2.5 rounded-full hover:shadow-lg transition-all disabled:opacity-50 shadow-md shrink-0"
                                >
                                  <Mic size={17} />
                                </motion.button>
                              )}
                            </AnimatePresence>
                          </>
                        )}
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
