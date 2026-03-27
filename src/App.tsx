import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mic,
  Square,
  Play,
  RotateCcw,
  User,
  Bot,
  Loader2,
  AlertTriangle,
  Clock,
  LogOut,
  ChevronLeft,
  Sparkles,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import ReactMarkdown from "react-markdown";


import localforage from "localforage";
import { gemini } from "./services/gemini";
import { Message, SavedAnswer, AnalysisPreferences, MockQuestion, MockTestSet, UserProfile } from "./types";
import { AITeacherPanel } from "./components/AITeacherPanel";
import { HistorySidebar } from "./components/HistorySidebar";
import { ProfileSection } from "./components/ProfileSection";
import { MOCK_TESTS } from "./mockTests";

// Mock tests are imported from ./mockTests

type PracticeSet = {
  id: string;
  title: string;
  questions: MockQuestion[];
};

const PRACTICE_BANK: Record<string, { description: string; level: string; sets: PracticeSet[] }> = {
  "Qism 1.1": {
    description: "Shaxsiy savollar • 30 soniya • Tayyorgarlik yo'q",
    level: "A1-A2",
    sets: [
      { id: "p1.1.1", title: "Eng yaqin do'st", questions: [{ id: "p1.1.1", part: "Qism 1.1", text: "Please tell me about your best friend.", timeLimit: 30 }] },
      { id: "p1.1.2", title: "Mamlakat haqida", questions: [{ id: "p1.1.2", part: "Qism 1.1", text: "Tell me about your country.", timeLimit: 30 }] },
      { id: "p1.1.3", title: "Bo'sh vaqt", questions: [{ id: "p1.1.3", part: "Qism 1.1", text: "What do you like to do in your free time?", timeLimit: 30 }] },
      { id: "p1.1.4", title: "Musiqa", questions: [{ id: "p1.1.4", part: "Qism 1.1", text: "What kind of music do you enjoy listening to?", timeLimit: 30 }] },
      { id: "p1.1.5", title: "Shahar yoki qishloq", questions: [{ id: "p1.1.5", part: "Qism 1.1", text: "Do you prefer living in the city or the countryside? Why?", timeLimit: 30 }] },
      { id: "p1.1.6", title: "Oila", questions: [{ id: "p1.1.6", part: "Qism 1.1", text: "Tell me about your family.", timeLimit: 30 }] },
      { id: "p1.1.7", title: "Sevimli taom", questions: [{ id: "p1.1.7", part: "Qism 1.1", text: "What is your favourite food and why?", timeLimit: 30 }] },
      { id: "p1.1.8", title: "Dam olish kunlari", questions: [{ id: "p1.1.8", part: "Qism 1.1", text: "What do you usually do on weekends?", timeLimit: 30 }] },
      { id: "p1.1.9", title: "Kitob o'qish", questions: [{ id: "p1.1.9", part: "Qism 1.1", text: "Do you like reading books? Why or why not?", timeLimit: 30 }] },
      { id: "p1.1.10", title: "Sevimli fasl", questions: [{ id: "p1.1.10", part: "Qism 1.1", text: "What is your favourite season and why?", timeLimit: 30 }] },
    ],
  },
  "Qism 1.2": {
    description: "2 rasm asosida 3 savol • Q1=45s, Q2-3=30s",
    level: "B1",
    sets: [
      {
        id: "p1.2.set1", title: "Haydash va Yurish",
        questions: [
          { id: "p1.2.1a", part: "Qism 1.2", text: "What do you see in these pictures?", timeLimit: 45, imageUrls: ["https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=800", "https://images.unsplash.com/photo-1519817914152-22d216bb9170?auto=format&fit=crop&q=80&w=800"] },
          { id: "p1.2.1b", part: "Qism 1.2", text: "What are some advantages of walking over driving?", timeLimit: 30, imageUrls: ["https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=800", "https://images.unsplash.com/photo-1519817914152-22d216bb9170?auto=format&fit=crop&q=80&w=800"] },
          { id: "p1.2.1c", part: "Qism 1.2", text: "Why do some people prefer having a car of their own?", timeLimit: 30, imageUrls: ["https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=800", "https://images.unsplash.com/photo-1519817914152-22d216bb9170?auto=format&fit=crop&q=80&w=800"] },
        ],
      },
      {
        id: "p1.2.set2", title: "Kitob va Texnologiya",
        questions: [
          { id: "p1.2.2a", part: "Qism 1.2", text: "Compare the two pictures. What can you see?", timeLimit: 45, imageUrls: ["https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=800", "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=800"] },
          { id: "p1.2.2b", part: "Qism 1.2", text: "What are the benefits of reading books compared to using technology?", timeLimit: 30, imageUrls: ["https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=800", "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=800"] },
          { id: "p1.2.2c", part: "Qism 1.2", text: "Do you think young people read less nowadays? Why?", timeLimit: 30, imageUrls: ["https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=800", "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=800"] },
        ],
      },
      {
        id: "p1.2.set3", title: "Uy ovqati va Restoran",
        questions: [
          { id: "p1.2.3a", part: "Qism 1.2", text: "What activities can you see in these pictures?", timeLimit: 45, imageUrls: ["https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&q=80&w=800", "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800"] },
          { id: "p1.2.3b", part: "Qism 1.2", text: "Which do you think is healthier — cooking at home or eating at a restaurant?", timeLimit: 30, imageUrls: ["https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&q=80&w=800", "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800"] },
          { id: "p1.2.3c", part: "Qism 1.2", text: "Why do many people prefer eating out instead of cooking?", timeLimit: 30, imageUrls: ["https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&q=80&w=800", "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800"] },
        ],
      },
    ],
  },
  "Qism 2": {
    description: "1 rasm + 3 savol • 1 daqiqa tayyorgarlik • 2 daqiqa javob",
    level: "B2",
    sets: [
      {
        id: "p2.set1", title: "Muhim qaror",
        questions: [{
          id: "p2.1", part: "Qism 2", text: "Look at the photograph and answer the following questions.", timeLimit: 120, prepTime: 60,
          imageUrls: ["https://images.unsplash.com/photo-1556388158-158ea5ccacbd?auto=format&fit=crop&q=80&w=800"],
          subQuestions: ["Tell me about a critical decision you have made.", "How has this decision influenced you and your life?", "What factors have the highest impact on the decisions people make?"],
        }],
      },
      {
        id: "p2.set2", title: "Unutilmas sayohat",
        questions: [{
          id: "p2.2", part: "Qism 2", text: "Look at the photograph and answer the following questions.", timeLimit: 120, prepTime: 60,
          imageUrls: ["https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=800"],
          subQuestions: ["Describe a memorable journey or trip you have taken.", "How did this experience change your perspective on life?", "What do people gain from travelling to new places?"],
        }],
      },
      {
        id: "p2.set3", title: "Qiyin vaziyat",
        questions: [{
          id: "p2.3", part: "Qism 2", text: "Look at the photograph and answer the following questions.", timeLimit: 120, prepTime: 60,
          imageUrls: ["https://images.unsplash.com/photo-1504805572947-34fad45aed93?auto=format&fit=crop&q=80&w=800"],
          subQuestions: ["Tell me about a time you faced a difficult challenge.", "How did you overcome this challenge?", "What skills are most important when dealing with problems?"],
        }],
      },
    ],
  },
  "Qism 3": {
    description: "FOR/AGAINST munozara • 1 daqiqa tayyorgarlik • 2 daqiqa javob",
    level: "C1",
    sets: [
      {
        id: "p3.set1", title: "Qurol ko'tarish huquqi",
        questions: [{
          id: "p3.1", part: "Qism 3", text: "Citizens should be allowed to carry personal guns.", timeLimit: 120, prepTime: 60,
          part3Data: {
            topic: "Citizens should be allowed to carry personal guns.",
            for: ["Guns can help people protect themselves", "They prevent people from becoming victims of crimes like burglary", "Necessary for hunting or target sports"],
            against: ["Guns are weapons that are used to commit a crime", "Fewer guns will reduce the murder rate", "Small or military guns are not useful for activities like hunting"],
          },
        }],
      },
      {
        id: "p3.set2", title: "Ijtimoiy tarmoqlar",
        questions: [{
          id: "p3.2", part: "Qism 3", text: "Social media does more harm than good to young people.", timeLimit: 120, prepTime: 60,
          part3Data: {
            topic: "Social media does more harm than good to young people.",
            for: ["Social media can lead to cyberbullying and mental health issues", "It is highly addictive and wastes valuable study time", "Privacy concerns — young people share too much personal information"],
            against: ["It helps young people connect with friends and family globally", "It provides access to educational content and current events", "It allows young entrepreneurs to promote their ideas and businesses"],
          },
        }],
      },
      {
        id: "p3.set3", title: "Maktab formasi",
        questions: [{
          id: "p3.3", part: "Qism 3", text: "All students should be required to wear school uniforms.", timeLimit: 120, prepTime: 60,
          part3Data: {
            topic: "All students should be required to wear school uniforms.",
            for: ["Uniforms promote equality and reduce bullying based on clothing", "They create a sense of belonging and school identity", "Students spend less time choosing what to wear each morning"],
            against: ["Uniforms limit students' freedom of self-expression", "They can be expensive for low-income families", "There is no evidence that uniforms improve academic performance"],
          },
        }],
      },
    ],
  },
};

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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Mock test selection
  const [selectedMockTest, setSelectedMockTest] = useState<MockTestSet | null>(null);
  const [showMockIntro, setShowMockIntro] = useState(false);

  // Practice mode states
  const [practiceTab, setPracticeTab] = useState<string>("Qism 1.1");
  const [practiceSelectedSet, setPracticeSelectedSet] = useState<PracticeSet | null>(null);
  const [practiceQIndex, setPracticeQIndex] = useState(0);
  const [isGeneratingQ, setIsGeneratingQ] = useState(false);
  const [lastSavedPracticeAnswer, setLastSavedPracticeAnswer] = useState<SavedAnswer | null>(null);

  // Load saved profile from localforage
  useEffect(() => {
    localforage.getItem<UserProfile>('user_profile').then(saved => {
      if (saved) setUserProfile(saved);
    });
  }, []);

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
  const startLiveSessionRef = useRef<(isTutorMode?: boolean) => void>(() => {});
  const stopLiveSessionRef = useRef<(analyzeAfter?: boolean) => void>(() => {});
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
  const recordingMimeTypeRef = useRef<string>("audio/webm");
  const chunksRef = useRef<Blob[]>([]);
  const pendingAnalysisRef = useRef(false);

  // Persistent microphone stream — requested ONCE, reused for all recordings
  const persistentStreamRef = useRef<MediaStream | null>(null);
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  // Track question transitions for smooth animation
  const [transitionKey, setTransitionKey] = useState(0);

  // Ref-based callback for recording stop — always points to latest function
  const onRecordingStopRef = useRef<(blob: Blob) => void>(() => {});
  // Guard: prevent double-handling of recording stop
  const recordingHandledRef = useRef(false);

  // Request microphone permission ONCE on first interaction, reuse forever
  const ensureMicPermission = async (): Promise<MediaStream> => {
    if (persistentStreamRef.current) {
      // Check if tracks are still alive
      const tracks = persistentStreamRef.current.getAudioTracks();
      if (tracks.length > 0 && tracks[0].readyState === "live") {
        return persistentStreamRef.current;
      }
    }
    // Request new stream
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    persistentStreamRef.current = stream;
    setMicPermissionGranted(true);
    return stream;
  };

  // Active mock test questions (fallback to first test)
  const activeMockQuestions = selectedMockTest?.questions ?? MOCK_TESTS[0].questions;

  // Pre-request mic permission when user enters mock or practice mode
  useEffect(() => {
    if (examMode === "mock_running" || examMode === "practice") {
      ensureMicPermission().catch(err => {
        console.warn("Mic permission not granted yet:", err);
      });
    }
  }, [examMode]);

  // Cleanup persistent stream on unmount only
  useEffect(() => {
    return () => {
      if (persistentStreamRef.current) {
        persistentStreamRef.current.getTracks().forEach(t => t.stop());
        persistentStreamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handlePracticeRecordingStop = async (blob: Blob) => {
    if (!practiceSelectedSet) return;

    try {
      const audioUrl = URL.createObjectURL(blob);
      const currentQ = practiceSelectedSet.questions[practiceQIndex];
      const answerId = `answer_${Date.now()}_${currentQ.id}`;

      const savedAnswer: SavedAnswer = {
        id: answerId,
        questionId: currentQ.id,
        part: currentQ.part,
        questionText: currentQ.text,
        audioUrl,
        audioBlob: blob,
        transcript: null,
        analysis: null,
        timestamp: Date.now(),
      };

      await localforage.setItem(answerId, savedAnswer);
      setLastSavedPracticeAnswer(savedAnswer);
      setHistoryRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Error saving practice answer:", err);
    }
  };

  // CRITICAL: This function must be SYNCHRONOUS for state updates.
  // localforage saves are fire-and-forget to prevent blocking question advance.
  const handleMockRecordingStop = (blob: Blob) => {
    const qIdx = currentQuestionIndex;
    const currentQ = activeMockQuestions[qIdx];
    const audioUrl = URL.createObjectURL(blob);

    // Fire-and-forget: save to localforage in background
    const answerId = `answer_${Date.now()}_${currentQ.id}`;
    localforage.setItem(answerId, {
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
    }).then(() => {
      setHistoryRefreshTrigger(prev => prev + 1);
    }).catch(err => console.error("Error saving mock answer:", err));

    // Update answers array
    setMockAnswers((prev) => {
      const newAnswers = [...prev];
      newAnswers[qIdx] = {
        questionId: currentQ.id,
        audioUrl,
        analysis: null,
        isAnalyzing: false,
      };
      return newAnswers;
    });

    // ADVANCE TO NEXT QUESTION — all synchronous, no awaits, no timeouts
    const isLastQuestion = qIdx === activeMockQuestions.length - 1;

    if (!isLastQuestion) {
      const nextQ = activeMockQuestions[qIdx + 1];

      // Reset recording state for next question
      setUserAudioUrl(null);
      setRecordedChunks([]);

      // Advance to next question — start prep countdown directly
      setCurrentQuestionIndex(qIdx + 1);
      setTransitionKey(prev => prev + 1);
      setIsPrepTime(true);
      setPrepTimeLeft(nextQ.prepTime || 5);
    } else {
      setExamMode("mock_finished");
      setIsContinuousMockRunning(false);

      // Fire-and-forget: save full mock feedback entry
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

  // ═══════════════════════════════════════════════════════
  // TIMER SYSTEM — robust, single-interval, ref-based
  // ═══════════════════════════════════════════════════════

  // 1) BREAK TIME countdown (between parts)
  useEffect(() => {
    if (!isBreakTime) return;
    const timer = setInterval(() => {
      setBreakTimeLeft(prev => (prev !== null && prev > 0) ? prev - 1 : prev);
    }, 1000);
    return () => clearInterval(timer);
  }, [isBreakTime]);

  // 1b) Break time expiry → advance to next question
  useEffect(() => {
    if (isBreakTime && breakTimeLeft !== null && breakTimeLeft <= 0) {
      setIsBreakTime(false);
      setBreakTimeLeft(null);
      setPendingNextQuestion(true);
    }
  }, [isBreakTime, breakTimeLeft]);

  // 2) PENDING NEXT QUESTION → start prep time
  // Uses a small delay to ensure currentQuestionIndex has settled after setState batching
  useEffect(() => {
    if (!pendingNextQuestion || isBreakTime) return;
    // Use requestAnimationFrame to ensure state has settled
    const raf = requestAnimationFrame(() => {
      setPendingNextQuestion(false);
      setTransitionKey(prev => prev + 1); // trigger transition animation
      const currentQ = activeMockQuestions[currentQuestionIndex];
      if (currentQ.prepTime) {
        setIsPrepTime(true);
        setPrepTimeLeft(currentQ.prepTime);
      } else {
        // Part 1.1 va 1.2: 5 soniya savolni o'qish vaqti
        setIsPrepTime(true);
        setPrepTimeLeft(5);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [currentQuestionIndex, pendingNextQuestion, isBreakTime]);

  // 3) PREP TIME countdown
  useEffect(() => {
    if (!isPrepTime) return;
    const timer = setInterval(() => {
      setPrepTimeLeft(prev => (prev !== null && prev > 0) ? prev - 1 : prev);
    }, 1000);
    return () => clearInterval(timer);
  }, [isPrepTime]);

  // 3b) Prep time expiry → start live recording session
  useEffect(() => {
    if (isPrepTime && prepTimeLeft !== null && prepTimeLeft <= 0) {
      setIsPrepTime(false);
      setPrepTimeLeft(null);
      startLiveSessionRef.current();
    }
  }, [isPrepTime, prepTimeLeft]);

  // 4) RECORDING TIME countdown
  useEffect(() => {
    if (!isLive) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev !== null && prev > 0) ? prev - 1 : prev);
    }, 1000);
    return () => clearInterval(timer);
  }, [isLive]);

  // 4b) Recording time expiry → auto-stop (with guard to prevent double-fire)
  const autoStopFiredRef = useRef(false);
  useEffect(() => {
    if (isLive && timeLeft !== null && timeLeft <= 0 && !autoStopFiredRef.current) {
      autoStopFiredRef.current = true;
      stopLiveSessionRef.current(true);
    }
    if (!isLive) {
      autoStopFiredRef.current = false;
    }
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
    if (isStartingLive || isLive) return;
    setIsStartingLive(true);
    try {
      // Set initial time based on current question
      let initialTime = 30; // default Qism 1.1
      if (examMode === "mock_running") {
        initialTime = activeMockQuestions[currentQuestionIndex].timeLimit;
      } else if (practiceSelectedSet) {
        initialTime = practiceSelectedSet.questions[practiceQIndex].timeLimit;
      }
      setTimeLeft(initialTime);

      // Reuse persistent stream — no new permission prompt
      const stream = await ensureMicPermission();

      const ctx = new AudioContext({ sampleRate: 16000 });
      setAudioContext(ctx);

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

      // Detect supported codec for this device/browser
      const supportedMime = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg",
        "audio/mp4",
        "",
      ].find(t => !t || MediaRecorder.isTypeSupported(t)) ?? "";
      recordingMimeTypeRef.current = supportedMime || "audio/webm";

      const recorder = supportedMime ? new MediaRecorder(stream, { mimeType: supportedMime }) : new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      // onstop is only a SAFETY NET — primary handling is in stopLiveSession
      recorder.onstop = () => {
        if (isSwitchingModeRef.current) {
          isSwitchingModeRef.current = false;
          return;
        }
        // Skip if already handled in stopLiveSession (the normal path)
        if (recordingHandledRef.current) {
          recordingHandledRef.current = false;
          return;
        }
        // Fallback: onstop fired without stopLiveSession handling it
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || recordingMimeTypeRef.current });
        onRecordingStopRef.current(blob);
      };
      // timeslice=200ms: ensures chunks accumulate regularly so we don't
      // depend on onstop to get audio data — chunks are available immediately
      recorder.start(200);
      mediaRecorderRef.current = recorder;
      recordingHandledRef.current = false;

      // Recording is now LIVE — set state immediately (don't wait for WebSocket)
      setIsLive(true);
      setIsStartingLive(false);

      // Setup AudioWorklet + Gemini Live connection (non-blocking)
      // SKIP for mock mode — mock only needs local recording, no AI audio feedback
      // Only connect for practice/tutor mode where real-time AI interaction is needed
      if (examMode !== "mock_running") {
      try {
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
            console.error("Live API Error (recording continues):", err);
          },
          onclose: () => {
            console.log("Live API connection closed (recording continues)");
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
            .catch(() => {}); // Silently ignore if session failed
        };

        setSession(sessionPromise);
      } catch (aiErr) {
        console.warn("AI Live connection failed, recording continues locally:", aiErr);
        // Recording is still working — just no real-time AI
      }
      } // end if (examMode !== "mock_running")
    } catch (err) {
      console.error("Live Session Error:", err);
      setIsStartingLive(false);
      setIsLive(false);
    }
  };

  const stopLiveSession = async (analyzeAfter = false) => {
    pendingAnalysisRef.current = analyzeAfter;

    // Stop the MediaRecorder
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop(); // will fire onstop async (but we don't wait)
      }
    }

    // CRITICAL: Handle recording result IMMEDIATELY — do NOT wait for onstop.
    // With timeslice=200ms, chunksRef.current already has all audio data
    // (may miss last <200ms which is negligible).
    if (analyzeAfter && !recordingHandledRef.current) {
      recordingHandledRef.current = true; // prevent onstop from double-handling
      const recMime = mediaRecorderRef.current?.mimeType || recordingMimeTypeRef.current;
      const blob = new Blob(chunksRef.current, { type: recMime });
      if (blob.size > 0) {
        onRecordingStopRef.current(blob);
      } else {
        // Edge case: no audio data — still advance the question
        onRecordingStopRef.current(new Blob([], { type: recMime }));
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

  // Keep function refs updated every render (avoids stale closures in useEffects)
  useEffect(() => { startLiveSessionRef.current = startLiveSession; });
  useEffect(() => { stopLiveSessionRef.current = stopLiveSession; });
  // CRITICAL: Update onstop ref every render so recorder.onstop always calls latest functions
  useEffect(() => {
    onRecordingStopRef.current = (blob: Blob) => {
      setUserAudioUrl(URL.createObjectURL(blob));
      setRecordedChunks([...chunksRef.current]);
      if (examMode === "mock_running") {
        handleMockRecordingStop(blob);
      } else if (examMode === "practice") {
        handlePracticeRecordingStop(blob);
      }
    };
  });

  const generateRandomQuestion = async () => {
    setIsGeneratingQ(true);
    try {
      const partPrompts: Record<string, string> = {
        "Qism 1.1": "Generate a single personal question for Multi-level Speaking Exam Qism 1.1 (A1-A2 level). It should be a simple question about the student's life, interests, or opinions. Reply with ONLY the question text in English, nothing else. Do not add quotation marks.",
        "Qism 1.2": `Generate a set of 3 questions for Multi-level Speaking Exam Qism 1.2 (B1 level) based on comparing two pictures. Format your response exactly like this (no extra text):
TOPIC: [short topic title in Uzbek, 2-3 words]
Q1: [45-second question asking what you see or to compare the pictures]
Q2: [30-second question about advantages or benefits]
Q3: [30-second question asking for opinion or preference]`,
        "Qism 2": `Generate a set of 3 sub-questions for Multi-level Speaking Exam Qism 2 (B2 level). The questions should relate to a single life experience topic. Format your response exactly like this (no extra text):
TOPIC: [short topic title in Uzbek, 2-3 words]
Q1: [personal experience question]
Q2: [impact or consequence question]
Q3: [general opinion question]`,
        "Qism 3": `Generate a debate topic with FOR and AGAINST points for Multi-level Speaking Exam Qism 3 (C1 level). Format your response exactly like this (no extra text):
TOPIC: [debatable statement in English]
TITLE: [short title in Uzbek, 2-3 words]
FOR1: [argument for]
FOR2: [argument for]
FOR3: [argument for]
AGAINST1: [argument against]
AGAINST2: [argument against]
AGAINST3: [argument against]`,
      };

      const response = await gemini.generateText(partPrompts[practiceTab]);
      const text = response.text || "";
      const aiSetId = `ai_${Date.now()}`;
      let newSet: PracticeSet;

      if (practiceTab === "Qism 1.1") {
        newSet = {
          id: aiSetId, title: "AI Savol",
          questions: [{ id: aiSetId, part: "Qism 1.1", text: text.trim(), timeLimit: 30 }],
        };
      } else if (practiceTab === "Qism 1.2") {
        const lines = text.split("\n").filter((l: string) => l.trim());
        const topic = lines.find((l: string) => l.startsWith("TOPIC:"))?.replace("TOPIC:", "").trim() || "AI Savol";
        const q1 = lines.find((l: string) => l.startsWith("Q1:"))?.replace("Q1:", "").trim() || "What do you see in these pictures?";
        const q2 = lines.find((l: string) => l.startsWith("Q2:"))?.replace("Q2:", "").trim() || "Compare the two pictures.";
        const q3 = lines.find((l: string) => l.startsWith("Q3:"))?.replace("Q3:", "").trim() || "Which do you prefer and why?";
        const bankSets = PRACTICE_BANK["Qism 1.2"].sets;
        const randomImages = bankSets[Math.floor(Math.random() * bankSets.length)].questions[0].imageUrls;

        newSet = {
          id: aiSetId, title: `AI: ${topic}`,
          questions: [
            { id: `${aiSetId}_a`, part: "Qism 1.2", text: q1, timeLimit: 45, imageUrls: randomImages },
            { id: `${aiSetId}_b`, part: "Qism 1.2", text: q2, timeLimit: 30, imageUrls: randomImages },
            { id: `${aiSetId}_c`, part: "Qism 1.2", text: q3, timeLimit: 30, imageUrls: randomImages },
          ],
        };
      } else if (practiceTab === "Qism 2") {
        const lines = text.split("\n").filter((l: string) => l.trim());
        const topic = lines.find((l: string) => l.startsWith("TOPIC:"))?.replace("TOPIC:", "").trim() || "AI Savol";
        const q1 = lines.find((l: string) => l.startsWith("Q1:"))?.replace("Q1:", "").trim() || "";
        const q2 = lines.find((l: string) => l.startsWith("Q2:"))?.replace("Q2:", "").trim() || "";
        const q3 = lines.find((l: string) => l.startsWith("Q3:"))?.replace("Q3:", "").trim() || "";
        const bankSets = PRACTICE_BANK["Qism 2"].sets;
        const randomImages = bankSets[Math.floor(Math.random() * bankSets.length)].questions[0].imageUrls;

        newSet = {
          id: aiSetId, title: `AI: ${topic}`,
          questions: [{
            id: aiSetId, part: "Qism 2", text: "Look at the photograph and answer the following questions.",
            timeLimit: 120, prepTime: 60, imageUrls: randomImages,
            subQuestions: [q1, q2, q3].filter(Boolean),
          }],
        };
      } else {
        const lines = text.split("\n").filter((l: string) => l.trim());
        const topicText = lines.find((l: string) => l.startsWith("TOPIC:"))?.replace("TOPIC:", "").trim() || "";
        const title = lines.find((l: string) => l.startsWith("TITLE:"))?.replace("TITLE:", "").trim() || "AI Mavzu";
        const forPoints = [1, 2, 3].map(i => lines.find((l: string) => l.startsWith(`FOR${i}:`))?.replace(`FOR${i}:`, "").trim() || "").filter(Boolean);
        const againstPoints = [1, 2, 3].map(i => lines.find((l: string) => l.startsWith(`AGAINST${i}:`))?.replace(`AGAINST${i}:`, "").trim() || "").filter(Boolean);

        newSet = {
          id: aiSetId, title: `AI: ${title}`,
          questions: [{
            id: aiSetId, part: "Qism 3", text: topicText, timeLimit: 120, prepTime: 60,
            part3Data: { topic: topicText, for: forPoints, against: againstPoints },
          }],
        };
      }

      setPracticeSelectedSet(newSet);
      setPracticeQIndex(0);
      setUserAudioUrl(null);
      setRecordedChunks([]);
      setLastSavedPracticeAnswer(null);
    } catch (err) {
      console.error("Error generating question:", err);
    } finally {
      setIsGeneratingQ(false);
    }
  };

  const startPrepOrLive = () => {
    const currentQ = activeMockQuestions[currentQuestionIndex];
    if (examMode === "mock_running" && currentQ.prepTime && !isPrepTime) {
      setIsPrepTime(true);
      setPrepTimeLeft(currentQ.prepTime);
    } else {
      startLiveSession();
    }
  };

  const handleReviewNext = () => {
    if (currentQuestionIndex < activeMockQuestions.length - 1) {
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
      <AnimatePresence>
        {!isAITeacherOpen && (
          <motion.button
            onClick={() => setIsAITeacherOpen(true)}
            className="fixed bottom-6 right-5 z-40"
            initial={{ scale: 0.7, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.7, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
          >
            {/* Glow halo */}
            <span className="absolute inset-0 rounded-2xl bg-indigo-500 opacity-40 blur-xl animate-pulse pointer-events-none" />
            {/* Button body */}
            <span className="relative flex items-center gap-3 bg-gradient-to-br from-violet-600 via-indigo-500 to-purple-700 text-white pl-4 pr-5 py-3 rounded-2xl shadow-[0_8px_24px_rgba(99,102,241,0.55)]">
              {/* Icon with sparkle badge */}
              <span className="relative shrink-0 bg-white/15 rounded-xl p-1.5">
                <GraduationCap size={20} />
                <Sparkles size={8} className="absolute -top-1 -right-1 text-yellow-300" />
              </span>
              {/* Label */}
              <span className="flex flex-col items-start leading-none gap-0.5">
                <span className="text-[9px] font-semibold tracking-widest text-indigo-200 uppercase">Multilevel</span>
                <span className="text-sm font-bold tracking-wide">AI Examiner</span>
              </span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 flex flex-col">
        {/* Top row: Logo + Profile */}
        <div className="h-14 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <div className="bg-[#1E73BE] text-white px-2 py-1 rounded text-xs font-bold">
              ML
            </div>
            <span className="font-bold text-[#1E293B] tracking-wide text-sm md:text-base">
              MULTI-LEVEL
            </span>
          </div>
          {/* Desktop mode buttons */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => {
                isSwitchingModeRef.current = true;
                stopLiveSession();
                setIsPrepTime(false);
                setPrepTimeLeft(null);
                setExamMode("practice");
                setPracticeSelectedSet(null);
                setPracticeQIndex(0);
                setUserAudioUrl(null);
                setRecordedChunks([]);
                setLastSavedPracticeAnswer(null);
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
                setExamMode("mock_setup");
                setSelectedMockTest(null);
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
              <div className="text-xs text-gray-500">{userProfile.targetCEFR} daraja</div>
            </div>
            <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center text-white">
              <User size={18} />
            </div>
          </button>
        </div>
        {/* Mobile mode tabs — always visible on small screens */}
        <div className="flex md:hidden border-t border-gray-100">
          <button
            onClick={() => {
              isSwitchingModeRef.current = true;
              stopLiveSession();
              setIsPrepTime(false);
              setPrepTimeLeft(null);
              setExamMode("practice");
              setPracticeSelectedSet(null);
              setPracticeQIndex(0);
              setUserAudioUrl(null);
              setRecordedChunks([]);
              setLastSavedPracticeAnswer(null);
            }}
            className={`flex-1 py-2.5 text-center text-sm font-bold transition-colors ${examMode === "practice" ? "text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50" : "text-gray-500"}`}
          >
            Practice
          </button>
          <button
            onClick={() => {
              isSwitchingModeRef.current = true;
              stopLiveSession();
              setIsPrepTime(false);
              setPrepTimeLeft(null);
              setExamMode("mock_setup");
              setSelectedMockTest(null);
            }}
            className={`flex-1 py-2.5 text-center text-sm font-bold transition-colors ${examMode !== "practice" ? "text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50" : "text-gray-500"}`}
          >
            Mock Exam
          </button>
        </div>
      </header>

      {examMode === "practice" && (
        <main className="max-w-5xl mx-auto px-6 mt-8">
          {/* Part Selector Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {Object.entries(PRACTICE_BANK).map(([part, data]) => (
              <button
                key={part}
                onClick={() => {
                  if (isLive || isStartingLive) return;
                  setPracticeTab(part);
                  setPracticeSelectedSet(null);
                  setPracticeQIndex(0);
                  setUserAudioUrl(null);
                  setRecordedChunks([]);
                  setLastSavedPracticeAnswer(null);
                }}
                className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                  practiceTab === part
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300"
                }`}
              >
                {part} <span className="text-xs opacity-75">({data.level})</span>
              </button>
            ))}
          </div>

          {!practiceSelectedSet ? (
            /* ═══ QUESTION SELECTION MODE ═══ */
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <div>
                  <h2 className="font-bold text-lg text-[#1E293B]">{practiceTab}</h2>
                  <p className="text-sm text-gray-500">{PRACTICE_BANK[practiceTab].description}</p>
                </div>
                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold">
                  {PRACTICE_BANK[practiceTab].level}
                </span>
              </div>
              <div className="h-1 w-full bg-[#E87722]"></div>

              {/* AI Random Question Button */}
              <div className="p-4 border-b border-gray-100">
                <button
                  onClick={generateRandomQuestion}
                  disabled={isGeneratingQ}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md disabled:opacity-50"
                >
                  {isGeneratingQ ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Sparkles size={20} />
                  )}
                  {isGeneratingQ ? "AI savol yaratmoqda..." : "AI Tasodifiy Savol"}
                </button>
              </div>

              {/* Question Sets List */}
              <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
                {PRACTICE_BANK[practiceTab].sets.map((set) => (
                  <button
                    key={set.id}
                    onClick={() => {
                      setPracticeSelectedSet(set);
                      setPracticeQIndex(0);
                      setUserAudioUrl(null);
                      setRecordedChunks([]);
                      setLastSavedPracticeAnswer(null);
                      setAnalysisResult(null);
                    }}
                    className="w-full p-4 hover:bg-indigo-50 transition-colors flex items-center gap-4 text-left group"
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
                      {set.questions.length > 1 ? set.questions.length : "1"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[#1E293B] text-sm mb-0.5">{set.title}</div>
                      <div className="text-gray-500 text-sm truncate">{set.questions[0].text}</div>
                    </div>
                    <ArrowRight size={18} className="text-gray-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ═══ PRACTICE MODE — Question Selected ═══ */
            (() => {
              const currentQ = practiceSelectedSet.questions[practiceQIndex];
              const hasDoneRecording = !isLive && !isStartingLive && !isPrepTime && !!userAudioUrl;
              const isReady = !isLive && !isStartingLive && !isPrepTime && !userAudioUrl;

              return (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {/* Header with Back Button */}
                  <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
                    <button
                      onClick={() => {
                        isSwitchingModeRef.current = true;
                        stopLiveSession();
                        setPracticeSelectedSet(null);
                        setPracticeQIndex(0);
                        setUserAudioUrl(null);
                        setRecordedChunks([]);
                        setIsPrepTime(false);
                        setPrepTimeLeft(null);
                        setLastSavedPracticeAnswer(null);
                      }}
                      className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 font-bold text-sm transition-colors"
                    >
                      <ChevronLeft size={18} /> Ortga
                    </button>
                    <div className="font-bold text-[#1E293B] uppercase">
                      {practiceTab}{" "}
                      <span className="text-xs text-gray-400 normal-case">
                        ({PRACTICE_BANK[practiceTab].level})
                      </span>
                    </div>
                    {practiceSelectedSet.questions.length > 1 ? (
                      <div className="text-sm font-bold text-indigo-600">
                        Savol {practiceQIndex + 1} / {practiceSelectedSet.questions.length}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">Practice</div>
                    )}
                  </div>
                  <div className="h-1 w-full bg-[#E87722]"></div>

                  {/* Question Content */}
                  <div className="p-8 md:p-12 flex flex-col items-center">
                    {/* Images */}
                    {currentQ.imageUrls && (
                      <div className={`grid gap-4 mb-6 w-full max-w-2xl ${currentQ.imageUrls.length === 1 ? "grid-cols-1 max-w-md" : "grid-cols-1 md:grid-cols-2"}`}>
                        {currentQ.imageUrls.map((url, index) => (
                          <ExamImage key={`${url}-${index}`} src={url} alt={`Practice ${index + 1}`} className="h-64 shadow-md" />
                        ))}
                      </div>
                    )}

                    {/* Question Text */}
                    <div className="text-[#1E293B] font-bold text-xl md:text-2xl text-center whitespace-pre-line mb-6">
                      {currentQ.text}
                    </div>

                    {/* Sub-questions for Qism 2 */}
                    {currentQ.subQuestions && (
                      <div className="w-full max-w-3xl mb-6">
                        <ul className="space-y-3 text-left">
                          {currentQ.subQuestions.map((q, i) => (
                            <li key={i} className="flex gap-3 text-lg text-gray-800 bg-gray-50 p-4 rounded-xl border border-gray-200">
                              <span className="font-bold text-indigo-600 shrink-0">{i + 1}.</span>
                              <span>{q}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* FOR/AGAINST for Qism 3 */}
                    {currentQ.part3Data && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mb-6 text-left">
                        <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                          <h4 className="font-bold text-green-800 mb-3">FOR</h4>
                          <ul className="list-disc pl-5 space-y-2 text-green-900">
                            {currentQ.part3Data.for.map((point, i) => (
                              <li key={i}>{point}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-red-50 p-6 rounded-xl border border-red-200">
                          <h4 className="font-bold text-red-800 mb-3">AGAINST</h4>
                          <ul className="list-disc pl-5 space-y-2 text-red-900">
                            {currentQ.part3Data.against.map((point, i) => (
                              <li key={i}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Prep Time Countdown */}
                    {isPrepTime && (
                      <div className="flex flex-col items-center gap-3 mb-8">
                        <AlertTriangle size={32} className="text-amber-500" />
                        <div className="text-[#1E293B] font-bold">Tayyorlanish vaqti</div>
                        <div className="font-bold text-4xl text-amber-600 animate-pulse">
                          {prepTimeLeft} soniya
                        </div>
                        <p className="text-sm text-gray-500">Fikrlaringizni jamlang...</p>
                        <button
                          onClick={() => setPrepTimeLeft(0)}
                          className="text-sm text-indigo-600 hover:text-indigo-800 underline font-medium"
                        >
                          O'tkazib yuborish
                        </button>
                      </div>
                    )}

                    {/* Audio Visualizer */}
                    {!hasDoneRecording && (
                      <div className="flex items-end gap-1 h-16 justify-center w-full mb-6">
                        {isLive
                          ? Array.from(visualizerData).slice(0, 24).map((value, i) => (
                              <div
                                key={i}
                                style={{ height: `${Math.max(10, (value / 255) * 100)}%` }}
                                className="w-2 md:w-3 bg-indigo-500 rounded-t-sm transition-all duration-75"
                              />
                            ))
                          : Array.from({ length: 24 }).map((_, i) => (
                              <div key={i} className="w-2 md:w-3 bg-gray-200 rounded-t-sm h-4" />
                            ))}
                      </div>
                    )}

                    {/* Recording Controls */}
                    {isReady && !hasDoneRecording && (
                      <button
                        onClick={() => {
                          if (currentQ.prepTime && !isPrepTime) {
                            setIsPrepTime(true);
                            setPrepTimeLeft(currentQ.prepTime);
                          } else {
                            startLiveSession(false);
                          }
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5"
                      >
                        <Mic size={20} /> JAVOB BERISH
                      </button>
                    )}

                    {isStartingLive && (
                      <div className="bg-blue-100 text-blue-800 px-8 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg">
                        <Loader2 size={20} className="animate-spin" /> ULANMOQDA...
                      </div>
                    )}

                    {isLive && !isPrepTime && (
                      <button
                        onClick={() => stopLiveSession(true)}
                        className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-red-200 hover:-translate-y-0.5 animate-pulse"
                      >
                        <Square size={20} fill="currentColor" /> YAKUNLASH
                      </button>
                    )}

                    {/* Timer */}
                    {!hasDoneRecording && !isPrepTime && (
                      <div className="flex items-center gap-2 mt-6">
                        <Clock size={18} className="text-gray-500" />
                        <span className={`font-bold ${isLive && timeLeft !== null && timeLeft <= 5 ? "text-red-600 animate-pulse" : "text-[#1E73BE]"}`}>
                          {isLive && timeLeft !== null ? `${timeLeft} soniya` : `${currentQ.timeLimit} soniya`}
                        </span>
                      </div>
                    )}

                    {/* ═══ DONE STATE — After Recording ═══ */}
                    {hasDoneRecording && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-2xl flex flex-col items-center gap-6"
                      >
                        {/* Audio Player */}
                        <div className="w-full bg-gray-50 rounded-xl p-4 border border-gray-200">
                          <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm mb-3">
                            <Play size={16} /> Sizning javobingiz:
                          </div>
                          <audio src={userAudioUrl!} controls className="w-full" />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap justify-center gap-3">
                          {/* Re-record */}
                          <button
                            onClick={() => {
                              setUserAudioUrl(null);
                              setRecordedChunks([]);
                              setLastSavedPracticeAnswer(null);
                            }}
                            className="flex items-center gap-2 border-2 border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white px-5 py-2.5 rounded-xl font-bold transition-colors"
                          >
                            <RotateCcw size={18} /> Qayta yozish
                          </button>

                          {/* AI Analysis — opens AI Teacher */}
                          <button
                            onClick={() => {
                              if (lastSavedPracticeAnswer) {
                                setInitialSelectedAnswer(lastSavedPracticeAnswer);
                                setIsAITeacherOpen(true);
                              }
                            }}
                            disabled={!lastSavedPracticeAnswer}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-md disabled:opacity-50"
                          >
                            <Bot size={18} /> AI Tahlil
                          </button>

                          {/* Next Question in Set (for multi-question sets like Qism 1.2) */}
                          {practiceSelectedSet.questions.length > 1 && practiceQIndex < practiceSelectedSet.questions.length - 1 && (
                            <button
                              onClick={() => {
                                setPracticeQIndex((prev) => prev + 1);
                                setUserAudioUrl(null);
                                setRecordedChunks([]);
                                setLastSavedPracticeAnswer(null);
                              }}
                              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-md"
                            >
                              <ArrowRight size={18} /> Keyingi savol
                            </button>
                          )}

                          {/* Back to question list */}
                          <button
                            onClick={() => {
                              setPracticeSelectedSet(null);
                              setPracticeQIndex(0);
                              setUserAudioUrl(null);
                              setRecordedChunks([]);
                              setLastSavedPracticeAnswer(null);
                            }}
                            className="flex items-center gap-2 border-2 border-gray-300 text-gray-600 hover:bg-gray-100 px-5 py-2.5 rounded-xl font-bold transition-colors"
                          >
                            Boshqa savol
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              );
            })()
          )}
        </main>
      )}

      {examMode === "mock_setup" && (
        <main className="max-w-5xl mx-auto px-6 mt-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#1E293B] mb-1">Mock Exam</h1>
            <p className="text-gray-500 text-sm">To'liq imtihon formatida mashq qiling. Har bir test 4 qismdan iborat.</p>
          </div>

          {/* Test info badges */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
              <Clock size={14} /> ~12 daqiqa
            </div>
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1.5 rounded-lg text-xs font-bold">
              Part 1.1 → Part 3
            </div>
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-bold">
              8 ta savol
            </div>
          </div>

          {/* Mock test cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MOCK_TESTS.map((test, idx) => {
              const part11Count = test.questions.filter(q => q.part === "Qism 1.1").length;
              const part12Count = test.questions.filter(q => q.part === "Qism 1.2").length;
              const part2Count = test.questions.filter(q => q.part === "Qism 2").length;
              const part3Count = test.questions.filter(q => q.part === "Qism 3").length;
              return (
                <button
                  key={test.id}
                  onClick={() => {
                    setSelectedMockTest(test);
                    setShowMockIntro(true);
                    setExamMode("mock_running");
                    setMockSessionId(Date.now().toString());
                    setCurrentQuestionIndex(0);
                    setMockAnswers([]);
                    setIsBreakTime(false);
                    setBreakTimeLeft(null);
                    setIsContinuousMockRunning(false);
                  }}
                  className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:border-indigo-400 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-lg shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-[#1E293B] group-hover:text-indigo-600 transition-colors">{test.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{test.description}</p>
                      </div>
                    </div>
                    <ArrowRight size={18} className="text-gray-300 group-hover:text-indigo-500 transition-colors mt-1 shrink-0" />
                  </div>
                  {/* Part breakdown */}
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-bold">1.1 × {part11Count}</span>
                    <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-bold">1.2 × {part12Count}</span>
                    <span className="text-[10px] bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full font-bold">P2 × {part2Count}</span>
                    <span className="text-[10px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full font-bold">P3 × {part3Count}</span>
                  </div>
                  {/* First question preview */}
                  <p className="text-xs text-gray-400 mt-3 line-clamp-1 italic">"{test.questions[0].text}"</p>
                </button>
              );
            })}
          </div>
        </main>
      )}

      {examMode === "mock_running" && (
        <main className="max-w-5xl mx-auto px-3 md:px-6 mt-4 md:mt-8">
          {showMockIntro ? (
            /* ═══ MOCK INTRO — Full exam overview ═══ */
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <div className="font-bold text-[#1E293B]">{selectedMockTest?.title || "Mock Test"}</div>
                <button
                  onClick={() => { setShowMockIntro(false); setExamMode("mock_setup"); setSelectedMockTest(null); }}
                  className="text-xs text-gray-500 hover:text-gray-800 font-bold"
                >
                  ← Ortga
                </button>
              </div>
              <div className="h-1 w-full bg-[#E87722]"></div>
              <div className="p-6 md:p-10">
                <h2 className="text-xl font-bold text-center text-[#1E293B] mb-2">Mock Exam Tuzilishi</h2>
                <p className="text-sm text-gray-500 text-center mb-8">Imtihon 4 qismdan iborat. Har bir qism haqida quyida batafsil:</p>

                <div className="space-y-4">
                  {/* Part 1.1 */}
                  <div className="border border-sky-200 rounded-xl p-4 bg-sky-50/50">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-sky-600 text-white rounded-lg flex items-center justify-center text-xs font-bold shrink-0">1.1</div>
                      <div>
                        <h3 className="font-bold text-[#1E293B] text-sm">Part 1.1 — Shaxsiy savollar</h3>
                        <span className="text-[10px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-bold">A1-A2</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">3 ta oddiy savol. Har bir savolga <strong>30 soniya</strong> javob berish vaqti. Tayyorgarlik vaqti yo'q. O'zingiz haqingizda gapiring.</p>
                  </div>

                  {/* Part 1.2 */}
                  <div className="border border-teal-200 rounded-xl p-4 bg-teal-50/50">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-teal-600 text-white rounded-lg flex items-center justify-center text-xs font-bold shrink-0">1.2</div>
                      <div>
                        <h3 className="font-bold text-[#1E293B] text-sm">Part 1.2 — Rasmlarni taqqoslash</h3>
                        <span className="text-[10px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-bold">B1</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">2 ta rasm ko'rsatiladi va 3 ta savol beriladi. Birinchi savolga <strong>45 soniya</strong>, qolganlariga <strong>30 soniya</strong>. Rasmlarni taqqoslab gapiring.</p>
                  </div>

                  {/* Part 2 */}
                  <div className="border border-violet-200 rounded-xl p-4 bg-violet-50/50">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-violet-600 text-white rounded-lg flex items-center justify-center text-xs font-bold shrink-0">2</div>
                      <div>
                        <h3 className="font-bold text-[#1E293B] text-sm">Part 2 — Batafsil hikoya</h3>
                        <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-bold">B2</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">1 ta mavzu va 3-4 ta yo'naltiruvchi savol. <strong>1 daqiqa</strong> tayyorgarlik, <strong>2 daqiqa</strong> javob berish. Batafsil gapiring.</p>
                  </div>

                  {/* Part 3 */}
                  <div className="border border-rose-200 rounded-xl p-4 bg-rose-50/50">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-rose-600 text-white rounded-lg flex items-center justify-center text-xs font-bold shrink-0">3</div>
                      <div>
                        <h3 className="font-bold text-[#1E293B] text-sm">Part 3 — Munozara (FOR / AGAINST)</h3>
                        <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">C1</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">1 ta mavzu, FOR va AGAINST dalillar beriladi. <strong>1 daqiqa</strong> tayyorgarlik, <strong>2 daqiqa</strong> javob. Har ikkala tomonni muvozanatli ko'rsating.</p>
                  </div>
                </div>

                <div className="mt-8 flex justify-center">
                  <button
                    onClick={() => {
                      setShowMockIntro(false);
                      setIsContinuousMockRunning(true);
                      setIsPrepTime(true);
                      setPrepTimeLeft(5);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3.5 rounded-full font-bold text-lg transition-colors shadow-lg flex items-center gap-2"
                  >
                    <Play size={20} fill="currentColor" />
                    Imtihonni Boshlash
                  </button>
                </div>
              </div>
            </div>
          ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-3 md:p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold text-sm text-[#1E293B] uppercase shrink-0">
                  {activeMockQuestions[currentQuestionIndex].part}
                  <span className="text-[10px] text-gray-400 ml-1 normal-case">
                    ({activeMockQuestions[currentQuestionIndex].part === "Qism 1.1" ? "A1-A2" :
                      activeMockQuestions[currentQuestionIndex].part === "Qism 1.2" ? "B1" :
                      activeMockQuestions[currentQuestionIndex].part === "Qism 2" ? "B2" : "C1"})
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-xs font-bold text-indigo-600 whitespace-nowrap">
                    {currentQuestionIndex + 1}/{activeMockQuestions.length}
                  </div>
                  <div className="hidden sm:flex gap-1">
                    {activeMockQuestions.map((_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${
                          i < currentQuestionIndex ? "bg-green-500" :
                          i === currentQuestionIndex ? "bg-indigo-600" : "bg-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm("Examni tugatmoqchimisiz? Barcha javoblaringiz saqlanadi.")) {
                        isSwitchingModeRef.current = true;
                        stopLiveSession();
                        setIsPrepTime(false);
                        setPrepTimeLeft(null);
                        setIsBreakTime(false);
                        setBreakTimeLeft(null);
                        setExamMode("mock_finished");
                        setIsContinuousMockRunning(false);
                      }
                    }}
                    className="flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-red-100 transition-colors"
                  >
                    <LogOut size={12} />
                    <span className="hidden sm:inline">Tugatish</span>
                  </button>
                </div>
              </div>
              {/* Mobile progress bar */}
              <div className="flex gap-0.5 mt-2 sm:hidden">
                {activeMockQuestions.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full ${
                      i < currentQuestionIndex ? "bg-green-500" :
                      i === currentQuestionIndex ? "bg-indigo-600" : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="h-1 w-full bg-[#E87722]"></div>

            <div className="p-4 md:p-8 flex flex-col items-center">
                <motion.div
                  key={`q-${transitionKey}`}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="flex flex-col items-center w-full"
                >
                  {activeMockQuestions[currentQuestionIndex].imageUrls && (
                    <div className="grid grid-cols-2 gap-2 md:gap-4 mb-4 md:mb-8 w-full max-w-2xl">
                      {activeMockQuestions[currentQuestionIndex].imageUrls?.map((url, index) => (
                        <ExamImage key={`${url}-${index}`} src={url} alt={`Exam prompt ${index + 1}`} className="h-36 md:h-56 shadow-md" />
                      ))}
                    </div>
                  )}

                  <div className="text-[#1E293B] font-bold text-lg md:text-2xl mb-4 md:mb-6 text-center max-w-3xl whitespace-pre-line">
                    {activeMockQuestions[currentQuestionIndex].text}
                  </div>

                  {/* Sub-questions for Qism 2 */}
                  {activeMockQuestions[currentQuestionIndex].subQuestions && (
                    <div className="w-full max-w-3xl mb-6 md:mb-12">
                      <ul className="space-y-2 md:space-y-4 text-left">
                        {activeMockQuestions[currentQuestionIndex].subQuestions?.map((q, i) => (
                          <li key={i} className="flex gap-2 md:gap-3 text-sm md:text-lg text-gray-800 bg-gray-50 p-3 md:p-4 rounded-xl border border-gray-200">
                            <span className="font-bold text-indigo-600 shrink-0">{i + 1}.</span>
                            <span>{q}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {activeMockQuestions[currentQuestionIndex].part3Data && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 w-full max-w-4xl mb-6 md:mb-12 text-left">
                      <div className="bg-green-50 p-4 md:p-6 rounded-xl border border-green-200">
                        <h4 className="font-bold text-green-800 mb-2 text-sm md:text-base">FOR</h4>
                        <ul className="list-disc pl-4 space-y-1.5 text-green-900 text-sm md:text-base">
                          {activeMockQuestions[currentQuestionIndex].part3Data?.for.map(
                            (point, i) => (
                              <li key={i}>{point}</li>
                            ),
                          )}
                        </ul>
                      </div>
                      <div className="bg-red-50 p-4 md:p-6 rounded-xl border border-red-200">
                        <h4 className="font-bold text-red-800 mb-2 text-sm md:text-base">AGAINST</h4>
                        <ul className="list-disc pl-4 space-y-1.5 text-red-900 text-sm md:text-base">
                          {activeMockQuestions[currentQuestionIndex].part3Data?.against.map(
                            (point, i) => (
                              <li key={i}>{point}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                </motion.div>

                <div className="flex flex-col items-center w-full gap-5">
                  {/* Unified Timer — switches between prep and recording with animation */}
                  <AnimatePresence mode="wait">
                    {isPrepTime ? (
                      <motion.div
                        key="prep-timer"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                        className="flex items-center gap-3 bg-amber-50 border border-amber-200 px-5 py-3 rounded-2xl"
                      >
                        <AlertTriangle size={22} className="text-amber-500 shrink-0" />
                        <div className="text-sm font-bold text-amber-800">
                          {!activeMockQuestions[currentQuestionIndex].prepTime ? "Savolni o'qing" : "Tayyorlanish"}
                        </div>
                        <div className="font-bold text-2xl text-amber-600 animate-pulse tabular-nums min-w-[3ch] text-center">
                          {prepTimeLeft}s
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="speak-timer"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                        className={`flex items-center gap-3 px-5 py-3 rounded-2xl border ${
                          isLive && timeLeft !== null && timeLeft <= 5
                            ? "bg-red-50 border-red-200"
                            : "bg-indigo-50 border-indigo-200"
                        }`}
                      >
                        <Clock size={22} className={`shrink-0 ${
                          isLive && timeLeft !== null && timeLeft <= 5 ? "text-red-500" : "text-indigo-500"
                        }`} />
                        <div className={`text-sm font-bold ${
                          isLive && timeLeft !== null && timeLeft <= 5 ? "text-red-800" : "text-indigo-800"
                        }`}>
                          Qolgan vaqt
                        </div>
                        <div className={`font-bold text-2xl tabular-nums min-w-[3ch] text-center ${
                          isLive && timeLeft !== null && timeLeft <= 5
                            ? "text-red-600 animate-pulse"
                            : "text-[#1E73BE]"
                        }`}>
                          {isLive && timeLeft !== null
                            ? `${timeLeft}s`
                            : `${activeMockQuestions[currentQuestionIndex].timeLimit}s`}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Visualizer */}
                  <div className="flex items-end gap-1 h-16 justify-center w-full max-w-md">
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

                  {/* Action Button */}
                  {!isContinuousMockRunning ? (
                    <button
                      onClick={() => {
                        setIsContinuousMockRunning(true);
                        setIsBreakTime(true);
                        setBreakTimeLeft(8);
                      }}
                      className="bg-[#1E73BE] hover:bg-blue-800 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-colors shadow-lg"
                    >
                      <Mic size={20} />
                      IMTIHONNI BOSHLASH
                    </button>
                  ) : isStartingLive ? (
                    <div className="bg-blue-100 text-blue-800 px-8 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg">
                      <Loader2 size={20} className="animate-spin" />
                      ULANMOQDA...
                    </div>
                  ) : isPrepTime ? (
                    <button
                      onClick={() => {
                        setIsPrepTime(false);
                        setPrepTimeLeft(null);
                        startLiveSession();
                      }}
                      className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-colors shadow-lg"
                    >
                      <ArrowRight size={20} />
                      GAPIRISHNI BOSHLASH
                    </button>
                  ) : isLive ? (
                    <button
                      onClick={() => stopLiveSession(true)}
                      className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-colors shadow-lg animate-pulse"
                    >
                      <Square size={20} fill="currentColor" />
                      YAKUNLASH
                    </button>
                  ) : (
                    <button
                      onClick={() => startLiveSession()}
                      className="bg-[#1E73BE] hover:bg-blue-800 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-colors shadow-lg"
                    >
                      <Mic size={20} />
                      GAPIRISHNI BOSHLASH
                    </button>
                  )}
                </div>
            </div>
          </div>
          )}
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
                const q = activeMockQuestions[idx];
                // Filter logic
                if (examMode === "mock_review") {
                  if (
                    analysisPreference === "each_question" &&
                    idx !== currentQuestionIndex
                  )
                    return null;
                  if (
                    analysisPreference === "each_part" &&
                    q.part !== activeMockQuestions[currentQuestionIndex].part
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
                  {currentQuestionIndex < activeMockQuestions.length - 1
                    ? analysisPreference === "each_part"
                      ? "Keyingi Bosqich"
                      : "Keyingi Savol"
                    : "Natijalarni Ko'rish"}
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSelectedMockTest(null);
                    setExamMode("mock_setup");
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

// Reliable image component with retry, loading state, and fallback
const ExamImage: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className }) => {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 5;

  // Add cache-buster on retry to bypass cached failed response
  const imgSrc = retryCount > 0 ? `${src}${src.includes("?") ? "&" : "?"}cb=${retryCount}-${Date.now()}` : src;

  useEffect(() => {
    setStatus("loading");
    setRetryCount(0);
  }, [src]);

  return (
    <div className={`relative bg-gray-100 rounded-lg overflow-hidden ${className || "h-48 md:h-64"}`}>
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-500 gap-2 p-4">
          <AlertTriangle size={24} />
          <span className="text-xs text-center">Rasm yuklanmadi</span>
          <button
            onClick={() => { setRetryCount(prev => prev + 1); setStatus("loading"); }}
            className="text-xs text-indigo-600 hover:text-indigo-800 underline font-medium"
          >
            Qayta yuklash
          </button>
        </div>
      )}
      <img
        src={imgSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${status === "loaded" ? "opacity-100" : "opacity-0"}`}
        referrerPolicy="no-referrer"
        onLoad={() => setStatus("loaded")}
        onError={() => {
          if (retryCount < maxRetries) {
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
            }, 800 * (retryCount + 1));
          } else {
            setStatus("error");
          }
        }}
      />
    </div>
  );
};
