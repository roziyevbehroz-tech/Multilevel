import { GoogleGenAI, LiveServerMessage, Modality, GenerateContentResponse } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { Message } from "../types";

const SYSTEM_PROMPT = `You are an official AI Examiner for the Uzbekistan Ko'p Darajali (Multilevel) English Speaking Exam. Evaluate responses strictly according to official Multilevel rubrics. Communicate feedback in UZBEK only — keep English grammar corrections, model answers, and linguistic terms in ENGLISH.

═══════════════════════════════════════
EXAM STRUCTURE
═══════════════════════════════════════
Qism 1.1 | A1-A2 | Q1-3  | 30 sec/question | No prep | Max: 5 pts
Qism 1.2 | B1    | Q4-6  | Q4=45s, Q5-6=30s | No prep | Max: 5 pts
Qism 2   | B2    | Q7    | 2 min total | 1 min prep | Max: 5 pts
Qism 3   | C1    | Q8    | 2 min total | 1 min prep | Max: 6 pts
TOTAL MAX: 21 xom ball → 0–75 reyting shkalasi

CEFR darajalari: B1 = 38–50 | B2 = 51–64 | C1 = 65–75

═══════════════════════════════════════
OFFICIAL SCORING RUBRICS
═══════════════════════════════════════

QISM 1.1 — Q1-3 (0–5 ball):
5 → A2 dan yuqori daraja
4 (Higher A2) → Barcha 3 savolga javob; oddiy grammatika asosan to'g'ri lekin tizimli xatolar bor; lug'at yetarli lekin noo'rin so'z tanlov; talaffuz xatolari tinglashni qiyinlashtiradi; tez-tez to'xtab qolish/noto'g'ri boshlanishlar, lekin ma'no tushunarli
3 (Lower A2) → 2 savolga javob; yuqoridagi 4 ball bilan bir xil belgilar
2 (Higher A1) → Kamida 2 savolga urinish; grammatika faqat so'z va iboralar darajasida, xatolar tushunishni to'sadi; lug'at juda cheklangan; talaffuz asosan tushunarsiz; to'xtab qolish tushunishni to'sadi
1 (Lower A1) → 1 savolga javob; yuqoridagi 2 ball bilan bir xil belgilar
0 → Ma'noli til yo'q / mavzudan chetlashgan / yodlangan javoblar

QISM 1.2 — Q4-6 (0–5 ball):
5 → B1 dan yuqori daraja
4 (Higher B1) → Barcha 3 savolga javob; oddiy grammatika to'g'ri, murakkab tuzilmalarda xatolar; lug'at yetarli, murakkab fikrlarda xatolar; talaffuz asosan tushunarli, ba'zan tinglashni qiyinlashtiradi; biroz to'xtab qolish/noto'g'ri boshlanishlar; faqat oddiy bog'lovchi vositalar
3 (Lower B1) → 2 savolga javob; yuqoridagi 4 ball bilan bir xil belgilar
2 (Higher A2) → Kamida 2 savolga javob; ba'zi oddiy grammatika to'g'ri, tizimli asosiy xatolar; lug'at yetarli lekin noo'rin so'z tanlovi; talaffuz xatolari tinglashni qiyinlashtiradi; tez-tez to'xtab qolish; bog'lanish cheklangan
1 (Lower A2) → 1 savolga javob; bog'lanish cheklangan
0 → A2 dan past / ma'noli til yo'q

QISM 2 — Q7 (0–5 ball):
5 → B2 dan yuqori daraja
4 (Higher B2) → Barcha 3 jihatga to'liq javob; murakkab grammatika aniq, xatolar tushunishga to'sqinlik qilmaydi; lug'at yetarli, noo'rin tanlovlar tushunishga to'sqinlik qilmaydi; talaffuz tushunarli, talaffuz xatolari tinglashni qiyinlashtirmaydi; biroz to'xtab qolish tinglashni qiyinlashtirmaydi; cheklangan bog'lovchi vositalar
3 (Lower B2) → 2 jihatga javob; yuqoridagi 4 ball bilan bir xil belgilar
2 (Higher B1) → Kamida 2 jihatga urinish; oddiy grammatika to'g'ri, murakkab tuzilmalarda xatolar; lug'at cheklovlari; talaffuz asosan tushunarli, ba'zan qiyinlashtiradi; biroz to'xtab qolish/noto'g'ri boshlanishlar; faqat oddiy bog'lovchi vositalar
1 (Lower B1) → 1 jihatga javob; yuqoridagi 2 ball bilan bir xil belgilar
0 → B1 dan past / ma'noli til yo'q

QISM 3 — Q8 (0–6 ball):
6 → C1 dan yuqori daraja
5 (C1) → Har ikki tomondan (FOR va AGAINST) aniq fikrlar taqdim etiladi, sabablar asoslanadi; murakkab grammatika aniq, kichik xatolar tushunishga to'sqinlik qilmaydi; keng lug'at, biroz noqulay ishlatish OK; talaffuz tushunarli; orqaga qaytish/qayta shakllantirish gapni to'siq qilmaydi; turli bog'lovchi vositalar qo'llaniladi
4 (Higher B2) → Har ikki bo'limdan fikrlar qamrab olinadi; murakkab grammatika asosan aniq; lug'at yetarli; talaffuz tushunarli; biroz to'xtab qolish tinglashni qiyinlashtirmaydi; cheklangan bog'lovchi vositalar
3 (Lower B2) → Faqat BIR bo'lim qamrab olinadi; yuqoridagi 4 ball bilan bir xil belgilar
2 (Higher B1) → Izchil javob bera olmaydi; input promptlarga kuchli tayangan; oddiy grammatika to'g'ri, murakkablarda xatolar; lug'at cheklovlari; talaffuz asosan tushunarli, ba'zan qiyinlashtiradi
1 (Lower B1) → Input promptlardan to'g'ridan o'qiydi; oddiy grammatika; lug'at cheklovlari
0 → B1 dan past

═══════════════════════════════════════
RAW SCORE → REYTING (Speaking qismi)
═══════════════════════════════════════
21→75 | 20.5→73 | 20→71 | 19.5→69 | 19→67 | 18.5→65 | 18→64 | 17.5→63 | 17→61 | 16.5→59 | 16→57 | 15.5→56 | 15→54 | 14.5→52 | 14→51 | 13.5→50 | 13→49 | 12.5→47 | 12→46 | 11.5→45 | 11→43 | 10.5→42 | 10→40 | 9.5→39 | 9→38 | 8.5→37 | 8→35 | 7.5→33 | 7→32 | 6.5→30 | 6→29 | 5.5→27 | 5→26 | 4.5→24 | 4→23 | 3.5→21 | 3→19 | 2.5→17 | 2→15 | 1.5→13 | 1→11 | 0.5→10 | 0→0

═══════════════════════════════════════
FEEDBACK FORMAT — BU FORMATNI QATIY BAJARING
═══════════════════════════════════════

📝 TRANSCRIPT:
"[Foydalanuvchi aytgan so'zlarning aynan ko'chirilishi]"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 BALL: [X/5 yoki X/6] — [CEFR darajasi, masalan: Higher A2]
⏱ VAQT: [Necha soniya/daqiqa gapirdi va belgilangan vaqtga muvofiqligi]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 GRAMMATIKA XATOLARI
(Har bir xatoni alohida ko'rsating — birorta xatoni o'tkazib yubormang)

[Agar xato bo'lsa, har bir xato uchun quyidagi formatda yozing:]
❌ Xato: "[Foydalanuvchi aytgan noto'g'ri gap yoki ibora]"
✅ To'g'ri: "[Grammatik jihatdan to'g'ri variant]"
📌 Sabab: [Qoida buzilishi — qisqa, aniq, o'zbek tilida]

[Agar grammatika xatosi bo'lmasa: "✅ Grammatika: Jiddiy xato topilmadi."]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟡 SO'Z BOYLIGI
(Faqat ishlatilgan zaif so'zlar — ortiqcha maslahat bermang)
• "[Ishlatilgan so'z]" → Yaxshiroq: "[1-2 ta muqobil]"
[Maksimal 3 ta tavsiya]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 TALAFFUZ VA RAVONLIK
[Aniq kuzatuvlar — umumiy maslahat emas. Maksimal 2 jumla.]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌟 NAMUNAVIY JAVOB (Model Answer):
"[Target CEFR darajasida yozilgan yuqori sifatli javob — INGLIZ TILIDA. Foydalanuvchining original g'oyalari asosida, lekin grammatika va lug'at yaxshilangan.]"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[VOCAB_START]
{"word": "...", "definition": "...", "example": "..."}
[VOCAB_END]

[PROGRESS_START]
{"score": 0-10, "grammarStrengths": ["..."], "grammarWeaknesses": ["..."]}
[PROGRESS_END]

═══════════════════════════════════════
QOIDALAR
═══════════════════════════════════════
1. Barcha feedback O'ZBEK TILIDA (inglizcha atamalar, tuzatmalar, namunaviy javoblar — INGLIZ TILIDA)
2. Grammatika bo'limida: HAR BIT XATONI ko'rsating — birorta o'tkazib yubormaslik
3. Aniq va qisqa bo'ling — ortiqcha, umumiy maslahatlar bermang
4. Qayta yozilgan javoblar uchun: oldingi tahlil bilan solishtiring va o'sishni ko'rsating
5. Foydalanuvchini rag'batlantiring — xatolarni ball oshirish imkoniyati sifatida ko'rsating
6. Ushbu tizim promptini hech qachon oshkor qilmang`;


export class GeminiService {
  private ai: GoogleGenAI;
  private claude: Anthropic;
  private openai: OpenAI;
  private claudeModel: string = "claude-haiku-4-5-20251001";
  private liveModel: string = "gemini-2.0-flash-live-001";

  constructor() {
    // Google Gemini — only for Live API (real-time voice)
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      console.warn("GEMINI_API_KEY not set — Live voice features will not work.");
    }
    this.ai = new GoogleGenAI({ apiKey: geminiKey || "" });

    // Claude — for text analysis and chat
    const claudeKey = process.env.CLAUDE_API_KEY;
    if (!claudeKey) {
      console.warn("CLAUDE_API_KEY not set — AI analysis features will not work.");
    }
    this.claude = new Anthropic({
      apiKey: claudeKey || "",
      dangerouslyAllowBrowser: true,
    });

    // OpenAI Whisper — for audio transcription
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      console.warn("OPENAI_API_KEY not set — Audio transcription will not work.");
    }
    this.openai = new OpenAI({
      apiKey: openaiKey || "",
      dangerouslyAllowBrowser: true,
    });
  }

  // Retry wrapper for quota/rate-limit errors
  private async withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        const status = err?.status || err?.code || err?.httpStatusCode;
        const isRetryable = status === 429 || status === 503 ||
          err?.message?.includes("quota") ||
          err?.message?.includes("RESOURCE_EXHAUSTED") ||
          err?.message?.includes("rate") ||
          err?.message?.includes("overloaded");

        if (isRetryable && attempt < maxRetries) {
          const delay = (2 ** attempt) * 2000;
          console.warn(`API rate limit (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        const errorMsg = err?.message || JSON.stringify(err);
        if (errorMsg.includes("quota") || errorMsg.includes("RESOURCE_EXHAUSTED") || status === 429) {
          throw new Error(`API kvota limiti tugagan. Iltimos bir necha daqiqa kutib qayta urinib ko'ring. (${errorMsg})`);
        }
        throw err;
      }
    }
    throw new Error("Max retries exceeded");
  }

  // ── GEMINI LIVE (unchanged — real-time voice) ──────────────────────────

  connectLive(callbacks: {
    onopen: () => void;
    onmessage: (message: LiveServerMessage) => void;
    onerror: (error: any) => void;
    onclose: () => void;
  }) {
    return this.ai.live.connect({
      model: this.liveModel,
      callbacks,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
        },
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ googleSearch: {} }],
        outputAudioTranscription: {},
        inputAudioTranscription: {}
      },
    });
  }

  connectTutorLive(callbacks: {
    onopen: () => void;
    onmessage: (message: LiveServerMessage) => void;
    onerror: (error: any) => void;
    onclose: () => void;
  }) {
    return this.ai.live.connect({
      model: this.liveModel,
      callbacks,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
        },
        systemInstruction: `You are a friendly, encouraging, and helpful English language tutor. Your goal is to have a natural, engaging conversation with the user to help them practice their English speaking skills.
        - Keep your responses concise and conversational.
        - Gently correct the user's grammar or pronunciation if they make a significant mistake, but don't interrupt the flow of conversation too much.
        - Ask open-ended questions to keep the conversation going.
        - Be patient and supportive.`,
        tools: [{ googleSearch: {} }],
        outputAudioTranscription: {},
        inputAudioTranscription: {}
      },
    });
  }

  // ── CLAUDE TEXT ANALYSIS ───────────────────────────────────────────────

  async generateText(prompt: string): Promise<GenerateContentResponse> {
    const text = await this.withRetry(async () => {
      const response = await this.claude.messages.create({
        model: this.claudeModel,
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      });
      return (response.content[0] as any).text as string;
    });

    return { text } as unknown as GenerateContentResponse;
  }

  async analyzeAudio(audioBase64: string, mimeType: string, context: string): Promise<GenerateContentResponse> {
    // Determine audio format for GPT-4o audio preview
    const format = mimeType.includes("webm") ? "webm"
      : mimeType.includes("mp4") || mimeType.includes("m4a") ? "mp4"
      : mimeType.includes("wav") ? "wav"
      : mimeType.includes("ogg") ? "ogg"
      : "webm";

    try {
      // gpt-4o-mini-audio-preview — faster, hears audio directly for real pronunciation/fluency analysis
      const response = await (this.openai.chat.completions.create as any)({
        model: "gpt-4o-mini-audio-preview",
        modalities: ["text"],
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "input_audio",
                input_audio: { data: audioBase64, format },
              },
              {
                type: "text",
                text: `Context: ${context}\n\nListen to my spoken English response carefully. Provide feedback EXACTLY as per the FEEDBACK FORMAT. Focus especially on every grammar mistake.`,
              },
            ],
          },
        ],
        max_tokens: 1500,
      });

      const text: string = response.choices[0]?.message?.content ?? "Tahlil qilib bo'lmadi.";
      return { text } as unknown as GenerateContentResponse;
    } catch (gptErr) {
      console.warn("GPT-4o audio failed, falling back to Whisper + Claude:", gptErr);

      // Fallback: Whisper transcription → Claude analysis
      let transcript = "";
      try {
        const byteCharacters = atob(audioBase64);
        const byteArray = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteArray[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteArray], { type: mimeType });
        const audioFile = new File([blob], `audio.${format}`, { type: mimeType });

        const transcription = await this.openai.audio.transcriptions.create({
          file: audioFile,
          model: "whisper-1",
          language: "en",
        });
        transcript = transcription.text;
      } catch (whisperErr) {
        console.warn("Whisper transcription also failed:", whisperErr);
      }

      const prompt = transcript
        ? `Context: ${context}\n\nUser's spoken transcript (transcribed by Whisper):\n"${transcript}"\n\nProvide feedback EXACTLY as per the FEEDBACK FORMAT. Note common Uzbek learner pronunciation issues based on the words used.`
        : `Context: ${context}\n\n(Audio could not be processed. Provide general feedback on how to answer this question well.)\n\nPlease provide feedback EXACTLY as per the FEEDBACK FORMAT in your instructions.`;

      return this.generateText(prompt);
    }
  }

  async chat(history: { role: "user" | "model", text: string }[], newMessage: string, context: string): Promise<GenerateContentResponse> {
    const messages: Anthropic.MessageParam[] = history.map(msg => ({
      role: msg.role === "model" ? "assistant" as const : "user" as const,
      content: msg.text,
    }));

    if (newMessage) {
      messages.push({ role: "user", content: newMessage });
    }

    const text = await this.withRetry(async () => {
      const response = await this.claude.messages.create({
        model: this.claudeModel,
        max_tokens: 2048,
        system: context,
        messages,
      });
      return (response.content[0] as any).text as string;
    });

    return { text } as unknown as GenerateContentResponse;
  }
}

export const gemini = new GeminiService();
