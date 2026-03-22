import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mic,
  Square,
  Play,
  RotateCcw,
  Send,
  MessageSquare,
  Award,
  BookOpen,
  ChevronRight,
  User,
  Bot,
  Loader2,
  Globe,
  Zap,
  Timer,
  AlertTriangle,
  Clock,
  LogOut,
  CheckCircle2,
  Settings,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import localforage from "localforage";
import { gemini } from "./services/gemini";
import { ExamStage, CEFRLevel, Message, ExamState, SavedAnswer, AnalysisPreferences } from "./types";
import { AITeacherPanel } from "./components/AITeacherPanel";
import { HistorySidebar } from "./components/HistorySidebar";
import { ProfileSection } from "./components/ProfileSection";
import { UserProfile } from "./types";

export type MockQuestion = {
  id: string;
  part: string;
  text: string;
  timeLimit: number;
  prepTime?: number;
  imageUrls?: string[];
  part3Data?: { topic: string; for: string[]; against: string[] };
};

const MOCK_TEST_1: MockQuestion[] = [
  {
    id: "1.1.1",
    part: "Qism 1.1",
    text: "What do you do on weekends?",
    timeLimit: 30,
  },
  {
    id: "1.1.2",
    part: "Qism 1.1",
    text: "What is your favourite drink?",
    timeLimit: 30,
  },
  {
    id: "1.1.3",
    part: "Qism 1.1",
    text: "Do you wake up early?",
    timeLimit: 30,
  },
  {
    id: "1.2.1",
    part: "Qism 1.2",
    text: "What do you see in these pictures?",
    timeLimit: 45,
    imageUrls: [
      "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=800"
    ],
  },
  {
    id: "1.2.2",
    part: "Qism 1.2",
    text: "What are the advantages of reading a book over watching a TV?",
    timeLimit: 30,
  },
  {
    id: "1.2.3",
    part: "Qism 1.2",
    text: "Do you agree that people read books less now than the past?",
    timeLimit: 30,
  },
  {
    id: "2.1",
    part: "Qism 2",
    text: "Tell me about a moment you had to be honest although it was difficult.\n• How did the other person react to your honesty?\n• Why do you think being honest is important, even in challenging situations?",
    timeLimit: 120,
    prepTime: 60,
    imageUrls: [
      "https://images.unsplash.com/photo-1521747116042-5a810fda9664?auto=format&fit=crop&q=80&w=800"
    ],
  },
  {
    id: "3.1",
    part: "Qism 3",
    text: "All students should learn a second language.",
    timeLimit: 120,
    prepTime: 60,
    part3Data: {
      topic: "All students should learn a second language.",
      for: [
        "Improves cognitive abilities like memory and problem-solving.",
        "Enhances career opportunities in a globalized job market.",
        "Promotes cultural understanding and global communication skills.",
      ],
      against: [
        "Not all students are interested or skilled in languages.",
        "Time could be spent on more essential subjects.",
        "Translation technology reduces the need for learning languages.",
      ],
    },
  },
];

const LessonLabAssistant: React.FC = () => {
  const [isAITeacherOpen, setIsAITeacherOpen] = useState(false);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  const [initialSelectedAnswer, setInitialSelectedAnswer] = useState<SavedAnswer | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      text: "Assalomu alaykum! Men LessonLab Speaking Assistant-man. Bugun siz bilan ingliz tili speaking darajangizni aniqlaymiz va Multi-level imtihoniga tayyorlanamiz. Tayyormisiz? Let's start with a real-time voice conversation. Click the 'Live' button to begin!",
      timestamp: Date.now(),
    },
  ]);
  const [isLive, setIsLive] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedPart, setSelectedPart] = useState("Qism 1.1 (Personal)");
  const [session, setSession] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  // Mock Exam States
  const [examMode, setExamMode] = useState<
    "practice" | "mock_setup" | "mock_running" | "mock_review" | "mock_finished"
  >("practice");
  const [analysisPreference, setAnalysisPreference] = useState<
    "each_question" | "each_part" | "end_of_mock"
  >("end_of_mock");
  const [analysisPreferences, setAnalysisPreferences] = useState<AnalysisPreferences>({
    pronunciation: true,
    grammar: true,
    vocabulary: true,
    fluency: true,
  });
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Foydalanuvchi',
    targetCEFR: 'B2',
    preferredLanguage: 'Uzbek',
  });
  const [showProfile, setShowProfile] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [practiceQuestionIndex, setPracticeQuestionIndex] = useState(0);

  useEffect(() => {
    const partPrefix = selectedPart.split(" ").slice(0, 2).join(" ");
    const questions = MOCK_TEST_1.filter((q) => q.part === partPrefix);
    if (questions.length > 0) {
      const randomIndex = Math.floor(Math.random() * questions.length);
      const globalIndex = MOCK_TEST_1.findIndex((q) => q.id === questions[randomIndex].id);
      setPracticeQuestionIndex(globalIndex !== -1 ? globalIndex : 0);
    }
  }, [selectedPart]);

  const [mockAnswers, setMockAnswers] = useState<
    {
      questionId: string;
      audioUrl: string;
      analysis: string | null;
      isAnalyzing: boolean;
    }[]
  >([]);
  const isSwitchingModeRef = useRef(false);
  const [isPrepTime, setIsPrepTime] = useState(false);
  const [prepTimeLeft, setPrepTimeLeft] = useState<number | null>(null);
  const [isStartingLive, setIsStartingLive] = useState(false);

  const [isBreakTime, setIsBreakTime] = useState(false);
  const [breakTimeLeft, setBreakTimeLeft] = useState<number | null>(null);
  const [mockSessionId, setMockSessionId] = useState<string | null>(null);
  const [pendingNextQuestion, setPendingNextQuestion] = useState(false);
  const [isContinuousMockRunning, setIsContinuousMockRunning] = useState(false);

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [visualizerData, setVisualizerData] = useState<Uint8Array>(
    new Uint8Array(0),
  );
  const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [audioWorkletNode, setAudioWorkletNode] =
    useState<AudioWorkletNode | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const pendingAnalysisRef = useRef(false);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handlePracticeRecordingStop = async (blob: Blob) => {
    setIsTyping(true);
    setAnalysisResult(null);
    
    try {
      const audioUrl = URL.createObjectURL(blob);
      const answerId = `answer_${Date.now()}_practice`;
      
      await localforage.setItem(answerId, {
        id: answerId,
        questionId: "practice",
        part: selectedPart,
        questionText: `Practice: ${selectedPart}`,
        audioUrl,
        audioBlob: blob,
        transcript: null,
        analysis: null,
        timestamp: Date.now(),
      });
      
      setHistoryRefreshTrigger(prev => prev + 1);
      setAnalysisResult("Javobingiz saqlandi. Tahlil qilish uchun o'ng tomondagi 'AI Teacher' tugmasini bosing yoki chapdagi 'Javoblar Tarixi' panelidan foydalaning.");
    } catch (err) {
      console.error("Error saving practice answer:", err);
      setAnalysisResult("Kechirasiz, javobni saqlashda xatolik yuz berdi.");
    } finally {
      setIsTyping(false);
    }
  };

  const handleMockRecordingStop = async (blob: Blob) => {
    const currentQ = MOCK_TEST_1[currentQuestionIndex];
    const audioUrl = URL.createObjectURL(blob);

    try {
      const answerId = `answer_${Date.now()}_${currentQ.id}`;
      await localforage.setItem(answerId, {
        id: answerId,
        sessionId: mockSessionId || undefined,
        questionId: currentQ.id,
        part: currentQ.part,
        questionText: currentQ.text,
        audioUrl,
        audioBlob: blob,
        transcript: null,
        analysis: null,
        timestamp: Date.now(),
      });
      setHistoryRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Error saving mock answer:", err);
    }

    setMockAnswers((prev) => {
      const newAnswers = [...prev];
      newAnswers[currentQuestionIndex] = {
        questionId: currentQ.id,
        audioUrl,
        analysis: null,
        isAnalyzing: false,
      };
      return newAnswers;
    });

    const isLastQuestion = currentQuestionIndex === MOCK_TEST_1.length - 1;

    if (!isLastQuestion) {
      const nextQ = MOCK_TEST_1[currentQuestionIndex + 1];
      if (nextQ.part !== currentQ.part) {
        setIsBreakTime(true);
        setBreakTimeLeft(5);
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        setCurrentQuestionIndex((prev) => prev + 1);
        setPendingNextQuestion(true);
      }
    } else {
      setExamMode("mock_finished");
      setIsContinuousMockRunning(false);
      
      // Create Full Mock Feedback entry
      const fullMockId = `answer_${Date.now()}_full_mock`;
      localforage.setItem(fullMockId, {
        id: fullMockId,
        sessionId: mockSessionId || undefined,
        questionId: "full_mock",
        part: "Full Mock Feedback",
        questionText: "Multi-level Speaking Mock Test 1 - Yakuniy Xulosa",
        audioUrl: null,
        audioBlob: null,
        transcript: null,
        analysis: null,
        timestamp: Date.now(),
      }).then(() => {
        setHistoryRefreshTrigger(prev => prev + 1);
      }).catch(err => console.error("Error saving full mock feedback item:", err));
    }
  };

  useEffect(() => {
    if (isBreakTime && breakTimeLeft !== null) {
      if (breakTimeLeft <= 0) {
        setIsBreakTime(false);
        setPendingNextQuestion(true);
        return;
      }
      const timer = setInterval(() => {
        setBreakTimeLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isBreakTime, breakTimeLeft]);

  useEffect(() => {
    if (pendingNextQuestion && !isBreakTime) {
      setPendingNextQuestion(false);
      const currentQ = MOCK_TEST_1[currentQuestionIndex];
      if (currentQ.prepTime) {
        setIsPrepTime(true);
        setPrepTimeLeft(currentQ.prepTime);
      } else {
        startLiveSession();
      }
    }
  }, [currentQuestionIndex, pendingNextQuestion, isBreakTime]);

  useEffect(() => {
    if (isPrepTime && prepTimeLeft !== null) {
      if (prepTimeLeft <= 0) {
        setIsPrepTime(false);
        startLiveSession();
        return;
      }
      const timer = setInterval(() => {
        setPrepTimeLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isPrepTime, prepTimeLeft]);

  useEffect(() => {
    if (isLive && timeLeft !== null) {
      if (timeLeft <= 0) {
        stopLiveSession(true); // Auto-analyze when time is up
        return;
      }
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isLive, timeLeft]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const updateVisualizer = (analyserNode: AnalyserNode) => {
    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
    analyserNode.getByteFrequencyData(dataArray);
    setVisualizerData(new Uint8Array(dataArray));
    animationFrameRef.current = requestAnimationFrame(() =>
      updateVisualizer(analyserNode),
    );
  };

  const startLiveSession = async (isTutorMode: boolean = false) => {
    if (isStartingLive) return;
    setIsStartingLive(true);
    try {
      // Set initial time based on selected part or mock question
      let initialTime = 30; // default Qism 1.1
      if (examMode === "mock_running") {
        initialTime = MOCK_TEST_1[currentQuestionIndex].timeLimit;
      } else {
        if (selectedPart === "Qism 1.2 (Picture)") initialTime = 45;
      }
      setTimeLeft(initialTime);

      const ctx = new AudioContext({ sampleRate: 16000 });
      setAudioContext(ctx);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup Analyser for real visualizer
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 64;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyserNode);
      setAnalyser(analyserNode);
      updateVisualizer(analyserNode);

      // Setup Local Recording for playback
      chunksRef.current = [];
      pendingAnalysisRef.current = false;
      setAnalysisResult(null);
      setRecordedChunks([]);
      setUserAudioUrl(null);

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        if (isSwitchingModeRef.current) {
          isSwitchingModeRef.current = false;
          return;
        }
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setUserAudioUrl(URL.createObjectURL(blob));
        setRecordedChunks([...chunksRef.current]);

        if (examMode === "mock_running") {
          handleMockRecordingStop(blob);
        } else if (pendingAnalysisRef.current) {
          handlePracticeRecordingStop(blob);
          pendingAnalysisRef.current = false;
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;

      // Setup AudioWorklet for Live API
      await ctx.audioWorklet.addModule(
        URL.createObjectURL(
          new Blob(
            [
              `
        class AudioProcessor extends AudioWorkletProcessor {
          process(inputs, outputs, parameters) {
            const input = inputs[0][0];
            if (input) {
              const pcm = new Int16Array(input.length);
              for (let i = 0; i < input.length; i++) {
                pcm[i] = Math.max(-1, Math.min(1, input[i])) * 0x7FFF;
              }
              this.port.postMessage(pcm);
            }
            return true;
          }
        }
        registerProcessor('audio-processor', AudioProcessor);
      `,
            ],
            { type: "application/javascript" },
          ),
        ),
      );

      const processor = new AudioWorkletNode(ctx, "audio-processor");
      source.connect(processor);
      setAudioWorkletNode(processor);

      const callbacks = {
        onopen: () => {
          setIsLive(true);
          setIsStartingLive(false);
          setMessages((prev) => [
            ...prev,
            {
              role: "model",
              text: "Men eshityapman. Javobingizni boshlashingiz mumkin.",
              timestamp: Date.now(),
            },
          ]);
        },
        onmessage: async (message: any) => {
          if (message.serverContent?.modelTurn?.parts) {
            const parts = message.serverContent.modelTurn.parts;
            for (const part of parts) {
              if (part.inlineData?.data) {
                const base64 = part.inlineData.data;
                const binary = atob(base64);
                const pcm = new Int16Array(binary.length / 2);
                for (let i = 0; i < pcm.length; i++) {
                  pcm[i] =
                    binary.charCodeAt(i * 2) |
                    (binary.charCodeAt(i * 2 + 1) << 8);
                }
                playAudioChunk(pcm, ctx);
              }
              if (part.text) {
                setMessages((prev) => [
                  ...prev,
                  { role: "model", text: part.text, timestamp: Date.now() },
                ]);
              }
            }
          }
        },
        onerror: (err: any) => {
          console.error("Live Error:", err);
          setIsStartingLive(false);
        },
        onclose: () => {
          setIsLive(false);
          setIsStartingLive(false);
          if (examMode === "mock_running" && mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            stopLiveSession(true);
          }
        },
      };

      const sessionPromise = isTutorMode ? gemini.connectTutorLive(callbacks) : gemini.connectLive(callbacks);

      processor.port.onmessage = (e) => {
        const pcm = e.data;
        const bytes = new Uint8Array(pcm.buffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        sessionPromise
          .then((session) => {
            session.sendRealtimeInput({
              audio: { data: base64, mimeType: "audio/pcm;rate=16000" },
            });
          })
          .catch((err) => console.error(err));
      };

      setSession(sessionPromise);
    } catch (err) {
      console.error("Live Session Error:", err);
      setIsStartingLive(false);
    }
  };

  const stopLiveSession = async (analyzeAfter = false) => {
    pendingAnalysisRef.current = analyzeAfter;
    
    let onStopWillFire = false;
    
    // Stop recording immediately to ensure onstop fires
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
        onStopWillFire = true;
      }
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    // If we are supposed to analyze/advance, but onstop won't fire,
    // we must manually advance to prevent getting stuck.
    if (analyzeAfter && !onStopWillFire) {
      const blob = new Blob(recordedChunks, { type: "audio/webm" });
      if (examMode === "mock_running") {
        handleMockRecordingStop(blob);
      } else {
        handlePracticeRecordingStop(blob);
      }
    }
    
    if (session) {
      try {
        const s = await session;
        s.close();
      } catch (e) {}
    }
    if (audioContext && audioContext.state !== "closed") {
      audioContext.close().catch(() => {});
    }
    if (animationFrameRef.current)
      cancelAnimationFrame(animationFrameRef.current);
      
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsLive(false);
    setIsStartingLive(false);
    setSession(null);
    setTimeLeft(null);
    setVisualizerData(new Uint8Array(0));
  };

  const handleAnalyze = () => {
    if (recordedChunks.length === 0) return;
    const blob = new Blob(recordedChunks, { type: "audio/webm" });
    handlePracticeRecordingStop(blob);
  };

  const startPrepOrLive = () => {
    const currentQ = MOCK_TEST_1[currentQuestionIndex];
    if (examMode === "mock_running" && currentQ.prepTime && !isPrepTime) {
      setIsPrepTime(true);
      setPrepTimeLeft(currentQ.prepTime);
    } else {
      startLiveSession();
    }
  };

  const handleReviewNext = () => {
    if (currentQuestionIndex < MOCK_TEST_1.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setExamMode("mock_running");
    } else {
      setExamMode("mock_finished");
    }
  };

  const playAudioChunk = (pcm: Int16Array, ctx: AudioContext) => {
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const buffer = ctx.createBuffer(1, pcm.length, 16000);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) {
      data[i] = pcm[i] / 0x7fff;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-[#1E293B] font-sans pb-12 selection:bg-[#1E73BE]/30">
      <HistorySidebar 
        refreshTrigger={historyRefreshTrigger} 
        onOpenAITeacher={(answer) => {
          setInitialSelectedAnswer(answer);
          setIsAITeacherOpen(true);
        }} 
      />
      <AITeacherPanel 
        isOpen={isAITeacherOpen} 
        onClose={() => {
          setIsAITeacherOpen(false);
          setInitialSelectedAnswer(null);
        }} 
        initialSelectedAnswer={initialSelectedAnswer}
      />
      
      {/* Floating AI Teacher Button */}
      {!isAITeacherOpen && (
        <button
          onClick={() => setIsAITeacherOpen(true)}
          className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-all hover:scale-105 z-40 flex items-center gap-2 group"
        >
          <Bot size={24} />
          <span className="font-bold hidden group-hover:block pr-2">AI Teacher</span>
        </button>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="bg-[#1E73BE] text-white px-2 py-1 rounded text-xs font-bold">
            ML
          </div>
          <span className="font-bold text-[#1E293B] tracking-wide">
            MULTI-LEVEL
          </span>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={() => {
              isSwitchingModeRef.current = true;
              stopLiveSession();
              setIsPrepTime(false);
              setPrepTimeLeft(null);
              setExamMode("practice");
            }}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${examMode === "practice" ? "bg-indigo-100 text-indigo-700" : "text-gray-500 hover:bg-gray-100"}`}
          >
            Practice Mode
          </button>
          <button
            onClick={() => {
              isSwitchingModeRef.current = true;
              stopLiveSession();
              setIsPrepTime(false);
              setPrepTimeLeft(null);
              setMockSessionId(Date.now().toString());
              setCurrentQuestionIndex(0);
              setMockAnswers([]);
              setExamMode("mock_running");
              setIsBreakTime(false);
              setBreakTimeLeft(null);
              setIsContinuousMockRunning(false);
            }}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${examMode !== "practice" ? "bg-indigo-100 text-indigo-700" : "text-gray-500 hover:bg-gray-100"}`}
          >
            Mock Exam
          </button>
        </div>
        <button
          onClick={() => setShowProfile(true)}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="text-right hidden sm:block">
            <div className="text-sm font-bold text-[#1E293B]">{userProfile.name}</div>
            <div className="text-xs text-gray-500">+998907252040</div>
          </div>
          <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center text-white">
            <User size={18} />
          </div>
        </button>
      </header>

      {examMode === "practice" && (
        <>
          {/* Progress Steps */}
          <div className="max-w-4xl mx-auto px-6 my-8">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 z-0"></div>
              <motion.div 
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-600 z-0"
                initial={{ width: "0%" }}
                animate={{ width: selectedPart.includes("Qism 1") ? "33%" : selectedPart.includes("Qism 2") ? "66%" : "100%" }}
                transition={{ duration: 0.5 }}
              ></motion.div>

              {[1, 2, 3].map((part) => (
                <div key={part} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold z-10 relative transition-colors ${
                  (part === 1 && selectedPart.includes("Qism 1")) || 
                  (part === 2 && selectedPart.includes("Qism 2")) || 
                  (part === 3 && selectedPart.includes("Qism 3")) 
                  ? "bg-indigo-600 text-white" : "bg-white border-2 border-indigo-600 text-indigo-600"
                }`}>
                  {part}
                </div>
              ))}
            </div>
          </div>

          {/* Main Exam Card */}
          <main className="max-w-5xl mx-auto px-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-b border-gray-200 bg-white gap-4">
                <div className="font-bold text-[#1E293B]">
                  <select
                    value={selectedPart}
                    onChange={(e) => setSelectedPart(e.target.value)}
                    className="bg-transparent outline-none cursor-pointer uppercase text-indigo-700 font-bold"
                  >
                    <option value="Qism 1.1 (Personal)">QISM 1.1</option>
                    <option value="Qism 1.2 (Picture)">QISM 1.2</option>
                    <option value="Qism 2 (Cue Card)">QISM 2</option>
                    <option value="Qism 3 (Discussion)">QISM 3</option>
                  </select>
                </div>
                <div className="text-sm text-gray-500 border border-gray-200 px-4 py-1.5 rounded bg-gray-50">
                  По умолчанию - Набор микрофонов...
                </div>
              </div>
              <div className="h-1 w-full bg-[#E87722]"></div>

              {/* Card Body */}
              <div className="p-8 md:p-12 flex flex-col items-center">
                <button
                  onClick={() => startLiveSession(true)}
                  className="flex items-center gap-3 mb-6 bg-emerald-50 px-6 py-3 rounded-full border border-emerald-100 hover:bg-emerald-100 transition-colors"
                >
                  <Bot size={24} className="text-emerald-600" />
                  <span className="text-emerald-900 font-bold text-sm tracking-wide uppercase">
                    AI TUTOR
                  </span>
                </button>
                <h2 className="text-[#E87722] font-bold text-xl mb-4 tracking-wide uppercase">
                  Practice Mode
                </h2>

                {/* Display Practice Question */}
                <div className="w-full max-w-3xl mb-8 flex flex-col items-center">
                  {MOCK_TEST_1[practiceQuestionIndex].imageUrls && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 w-full max-w-2xl">
                      {MOCK_TEST_1[practiceQuestionIndex].imageUrls?.map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt={`Practice prompt ${index + 1}`}
                          className="w-full rounded-lg shadow-md object-cover h-64"
                          referrerPolicy="no-referrer"
                        />
                      ))}
                    </div>
                  )}
                  <div className="text-[#1E293B] font-bold text-xl md:text-2xl text-center whitespace-pre-line">
                    {MOCK_TEST_1[practiceQuestionIndex].text}
                  </div>
                  {MOCK_TEST_1[practiceQuestionIndex].part3Data && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mt-6 text-left">
                      <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                        <h4 className="font-bold text-green-800 mb-3">FOR</h4>
                        <ul className="list-disc pl-5 space-y-2 text-green-900">
                          {MOCK_TEST_1[practiceQuestionIndex].part3Data?.for.map(
                            (point, i) => (
                              <li key={i}>{point}</li>
                            ),
                          )}
                        </ul>
                      </div>
                      <div className="bg-red-50 p-6 rounded-xl border border-red-200">
                        <h4 className="font-bold text-red-800 mb-3">AGAINST</h4>
                        <ul className="list-disc pl-5 space-y-2 text-red-900">
                          {MOCK_TEST_1[practiceQuestionIndex].part3Data?.against.map(
                            (point, i) => (
                              <li key={i}>{point}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-gray-500 font-medium text-sm md:text-base mb-8 text-center max-w-xl leading-snug italic">
                  {messages
                    .filter((m) => m.role === "model")
                    .pop()
                    ?.text || "Tayyormisiz? Speaking mashqini boshlaymiz!"}
                </p>

                  {/* Visualizer & Record Button */}
                  <div className="flex flex-col items-center gap-4 w-full">
                    <div className="flex items-end gap-1 h-16 justify-center w-full">
                      {isLive
                        ? Array.from(visualizerData)
                            .slice(0, 24)
                            .map((value, i) => (
                              <div
                                key={i}
                                style={{
                                  height: `${Math.max(10, (value / 255) * 100)}%`,
                                }}
                                className="w-2 md:w-3 bg-indigo-500 rounded-t-sm transition-all duration-75"
                              />
                            ))
                        : Array.from({ length: 24 }).map((_, i) => (
                            <div
                              key={i}
                              className="w-2 md:w-3 bg-gray-200 rounded-t-sm h-4"
                            />
                          ))}
                    </div>

                    {!isLive && !isStartingLive ? (
                      <div className="flex flex-col md:flex-row gap-4">
                        <button
                          onClick={() => startLiveSession(false)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5"
                        >
                          <Mic size={20} />
                          JAVOB BERISH
                        </button>
                      </div>
                    ) : isStartingLive ? (
                      <div className="bg-blue-100 text-blue-800 px-8 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg">
                        <Loader2 size={20} className="animate-spin" />
                        ULANMOQDA...
                      </div>
                    ) : (
                      <button
                        onClick={() => stopLiveSession(true)}
                        className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-red-200 hover:-translate-y-0.5 animate-pulse"
                      >
                        <Square size={20} fill="currentColor" />
                        YAKUNLASH
                      </button>
                    )}
                  </div>

                  {/* Speak Time */}
                  <div className="flex flex-col items-center justify-center gap-3 mt-8">
                    <Clock size={32} className="text-[#1E293B]" />
                    <div className="text-[#1E293B] font-bold">
                      Qolgan vaqt
                    </div>
                    <div
                      className={`font-bold text-xl ${timeLeft !== null && timeLeft <= 5 ? "text-red-600 animate-pulse" : "text-[#1E73BE]"}`}
                    >
                      {timeLeft !== null ? `${timeLeft} second` : `${selectedPart === "Qism 1.2 (Picture)" ? 45 : 30} second`}
                    </div>
                  </div>
                </div>
              </div>

            {/* Footer Actions */}
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <button className="flex items-center gap-2 border-2 border-[#E87722] text-[#E87722] hover:bg-[#E87722] hover:text-white px-8 py-2.5 rounded font-bold transition-colors">
                <LogOut size={18} />
                Chiqish
              </button>
              {(recordedChunks.length > 0) && (
                <button
                  onClick={() => {
                    stopLiveSession();
                    setUserAudioUrl(null);
                    setRecordedChunks([]);
                  }}
                  className="flex items-center gap-2 border-2 border-[#1E73BE] text-[#1E73BE] hover:bg-[#1E73BE] hover:text-white px-8 py-2.5 rounded font-bold transition-colors"
                >
                  <RotateCcw size={18} />
                  Qayta topshirish
                </button>
              )}
            </div>

                   {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-12 bg-white rounded-xl shadow-lg border border-indigo-100 p-8 flex flex-col items-center justify-center gap-4"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
                  <Bot
                    size={48}
                    className="text-indigo-600 relative z-10 animate-bounce"
                  />
                </div>
                <h3 className="text-xl font-bold text-indigo-900">
                  Super AI Agent tahlil qilmoqda...
                </h3>
                <p className="text-gray-500 text-center max-w-md">
                  Iltimos kuting, sizning javobingiz Multi-level mezonlari
                  asosida tekshirilmoqda.
                </p>
              </motion.div>
            )}
          </main>
        </>
      )}

      {examMode === "mock_running" && (
        <main className="max-w-5xl mx-auto px-6 mt-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <div className="font-bold text-[#1E293B] uppercase">
                {MOCK_TEST_1[currentQuestionIndex].part}
              </div>
              <div className="text-sm font-bold text-indigo-600">
                Savol {currentQuestionIndex + 1} / {MOCK_TEST_1.length}
              </div>
            </div>
            <div className="h-1 w-full bg-[#E87722]"></div>

            <div className="p-8 md:p-12 flex flex-col items-center">
              <div className="flex items-center gap-3 mb-6 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100">
                <Bot size={24} className="text-indigo-600" />
                <span className="text-indigo-900 font-bold text-sm tracking-wide uppercase">
                  Super AI Examiner
                </span>
              </div>

              {isBreakTime ? (
                <div className="text-center py-16">
                  <h2 className="text-3xl font-bold text-indigo-600 mb-4 animate-pulse">
                    Keyingi: {MOCK_TEST_1[currentQuestionIndex].part}
                  </h2>
                  <p className="text-xl text-gray-500 mb-8">Nafas rostlab oling...</p>
                  <div className="text-6xl font-bold text-indigo-600 mb-8">
                    {breakTimeLeft}
                  </div>
                </div>
              ) : (
                <>
                  {MOCK_TEST_1[currentQuestionIndex].imageUrls && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 w-full max-w-2xl">
                      {MOCK_TEST_1[currentQuestionIndex].imageUrls?.map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt={`Exam prompt ${index + 1}`}
                          className="w-full rounded-lg shadow-md object-cover h-64"
                          referrerPolicy="no-referrer"
                        />
                      ))}
                    </div>
                  )}

                  <div className="text-[#1E293B] font-bold text-xl md:text-2xl mb-12 text-center max-w-3xl whitespace-pre-line">
                    {MOCK_TEST_1[currentQuestionIndex].text}
                  </div>

                  {MOCK_TEST_1[currentQuestionIndex].part3Data && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mb-12 text-left">
                      <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                        <h4 className="font-bold text-green-800 mb-3">FOR</h4>
                        <ul className="list-disc pl-5 space-y-2 text-green-900">
                          {MOCK_TEST_1[currentQuestionIndex].part3Data?.for.map(
                            (point, i) => (
                              <li key={i}>{point}</li>
                            ),
                          )}
                        </ul>
                      </div>
                      <div className="bg-red-50 p-6 rounded-xl border border-red-200">
                        <h4 className="font-bold text-red-800 mb-3">AGAINST</h4>
                        <ul className="list-disc pl-5 space-y-2 text-red-900">
                          {MOCK_TEST_1[currentQuestionIndex].part3Data?.against.map(
                            (point, i) => (
                              <li key={i}>{point}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                </>
              )}

              {!isBreakTime && (
                <div className="grid grid-cols-1 md:grid-cols-3 w-full gap-8 items-end">
                  {/* Think Time */}
                  <div className="flex flex-col items-center justify-center gap-3">
                    <AlertTriangle size={32} className="text-[#1E293B]" />
                    <div className="text-[#1E293B] font-bold">O'ylash uchun</div>
                    <div
                      className={`font-bold text-xl ${isPrepTime ? "text-red-600 animate-pulse" : "text-[#1E73BE]"}`}
                    >
                      {isPrepTime
                        ? `${prepTimeLeft} second`
                        : MOCK_TEST_1[currentQuestionIndex].prepTime
                          ? `${MOCK_TEST_1[currentQuestionIndex].prepTime} second`
                          : "Yo'q"}
                    </div>
                  </div>

                  {/* Visualizer & Record Button */}
                  <div className="flex flex-col items-center gap-6">
                    <div className="flex items-end gap-1 h-24 justify-center w-full">
                      {isLive
                        ? Array.from(visualizerData)
                            .slice(0, 24)
                            .map((value, i) => (
                              <div
                                key={i}
                                style={{
                                  height: `${Math.max(10, (value / 255) * 100)}%`,
                                }}
                                className="w-2 md:w-3 bg-[#1E73BE] rounded-t-sm transition-all duration-75"
                              />
                            ))
                        : Array.from({ length: 24 }).map((_, i) => (
                            <div
                              key={i}
                              className="w-2 md:w-3 bg-gray-200 rounded-t-sm h-4"
                            />
                          ))}
                    </div>

                    {!isContinuousMockRunning ? (
                      <button
                        onClick={() => {
                          setIsContinuousMockRunning(true);
                          startPrepOrLive();
                        }}
                        className="bg-[#1E73BE] hover:bg-blue-800 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-colors shadow-lg"
                      >
                        BOSHLASH
                      </button>
                    ) : isStartingLive ? (
                      <div className="bg-blue-100 text-blue-800 px-8 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg">
                        <Loader2 size={20} className="animate-spin" />
                        ULANMOQDA...
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (isBreakTime) {
                            setBreakTimeLeft(0);
                          } else if (isPrepTime) {
                            setPrepTimeLeft(0);
                            setIsPrepTime(false);
                            startLiveSession();
                          } else {
                            stopLiveSession(true);
                          }
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-colors shadow-lg animate-pulse"
                      >
                        <Square size={20} fill="currentColor" />
                        YAKUNLASH
                      </button>
                    )}
                  </div>

                  {/* Speak Time */}
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Clock size={32} className="text-[#1E293B]" />
                    <div className="text-[#1E293B] font-bold">
                      Qolgan vaqt
                    </div>
                    <div
                      className={`font-bold text-xl ${isLive && timeLeft !== null && timeLeft <= 5 ? "text-red-600 animate-pulse" : "text-[#1E73BE]"}`}
                    >
                      {isLive && timeLeft !== null
                        ? `${timeLeft} second`
                        : `${MOCK_TEST_1[currentQuestionIndex].timeLimit} second`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {(examMode === "mock_review" || examMode === "mock_finished") && (
        <main className="max-w-5xl mx-auto px-6 mt-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-12">
            <h2 className="text-3xl font-bold text-indigo-900 mb-8 text-center">
              {examMode === "mock_finished"
                ? "Mock Test Natijalari"
                : "Tahlil Natijalari"}
            </h2>

            <div className="space-y-8">
              {mockAnswers.map((answer, idx) => {
                if (!answer) return null;
                const q = MOCK_TEST_1[idx];
                // Filter logic
                if (examMode === "mock_review") {
                  if (
                    analysisPreference === "each_question" &&
                    idx !== currentQuestionIndex
                  )
                    return null;
                  if (
                    analysisPreference === "each_part" &&
                    q.part !== MOCK_TEST_1[currentQuestionIndex].part
                  )
                    return null;
                }

                return (
                  <div
                    key={idx}
                    className="bg-gray-50 rounded-xl border border-gray-200 p-6"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-bold">
                        {q.part}
                      </span>
                      <span className="text-gray-500 font-medium text-sm">
                        Savol {idx + 1}
                      </span>
                    </div>
                    <h3 className="font-bold text-xl text-gray-900 mb-6 whitespace-pre-line">
                      {q.text}
                    </h3>

                    <div className="mb-6">
                      <div className="flex items-center gap-2 text-indigo-700 font-bold uppercase tracking-wider text-sm mb-3">
                        <Play size={16} /> Sizning ovozingiz:
                      </div>
                      <audio
                        src={answer.audioUrl}
                        controls
                        className="w-full"
                      />
                    </div>

                    <div className="bg-white rounded-lg p-6 border border-indigo-100 shadow-sm">
                      <div className="flex items-center gap-2 text-indigo-700 font-bold uppercase tracking-wider text-sm mb-4">
                        <Bot size={18} /> Super AI Agent Tahlili:
                      </div>
                      {answer.isAnalyzing ? (
                        <div className="flex items-center gap-3 text-indigo-600 py-4">
                          <Loader2 size={24} className="animate-spin" />
                          <span className="font-medium">
                            Tahlil qilinmoqda...
                          </span>
                        </div>
                      ) : (
                        <div className="markdown-body prose prose-indigo max-w-none prose-sm md:prose-base">
                          <ReactMarkdown>{answer.analysis || ""}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-12 flex justify-center">
              {examMode === "mock_review" ? (
                <button
                  onClick={handleReviewNext}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-full font-bold text-lg transition-colors shadow-lg"
                >
                  {currentQuestionIndex < MOCK_TEST_1.length - 1
                    ? analysisPreference === "each_part"
                      ? "Keyingi Bosqich"
                      : "Keyingi Savol"
                    : "Natijalarni Ko'rish"}
                </button>
              ) : (
                <button
                  onClick={() => {
                    setMockSessionId(Date.now().toString());
                    setCurrentQuestionIndex(0);
                    setMockAnswers([]);
                    setExamMode("mock_running");
                    setIsBreakTime(false);
                    setBreakTimeLeft(null);
                    setIsPrepTime(false);
                    setPrepTimeLeft(null);
                    setIsContinuousMockRunning(false);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-10 py-4 rounded-full font-bold text-lg transition-colors shadow-lg flex items-center gap-2"
                >
                  <RotateCcw size={20} />
                  Yangi Mock Test Boshlash
                </button>
              )}
            </div>
          </div>
        </main>
      )}

      {showProfile && (
        <ProfileSection
          profile={userProfile}
          setProfile={setUserProfile}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
};

export default function App() {
  return <LessonLabAssistant />;
}
