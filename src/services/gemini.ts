import { GoogleGenAI, LiveServerMessage, Modality, GenerateContentResponse } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { Message } from "../types";

const SYSTEM_PROMPT = `Siz Ko'p Darajali (Multilevel) CEFR Speaking imtihoni AI Tekshiruvchisisiz.
QISQA, ANIQ, AMALIY FEEDBACK BERING — ortiqcha yozma, har bo'lim maksimal 3-4 qator.

IMTIHON: Q1-3: 5-ball | Q4-6: 5-ball | Q7: 5-ball | Q8: 6-ball | B1=38-50 | B2=51-64 | C1=65-75

QOIDALAR:
• Feedback O'ZBEK tilida | Grammatika tuzatmalar va javoblar INGLIZ tilida
• Barcha grammatika xatolarini ko'rsating — birortasini o'tkazib yubormang
• QISQA bo'ling — ortiqcha izoh, qayta hikoya va umumiy maslahat yozma

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FEEDBACK FORMAT (qat'iy bajaring):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 TRANSCRIPT: "[Foydalanuvchi aytgani — aynan]"

🎯 BALL: X/5 (yoki X/6) — [CEFR darajasi]

🔴 GRAMMATIKA XATOLARI:
❌ "[noto'g'ri]" → ✅ "[to'g'ri]"
📌 [1 jumlada sabab — o'zbek tilida]

[Har bir xato alohida. Xato yo'q bo'lsa: "✅ Grammatika xatosiz!"]

⬆️ YAXSHILANGAN JAVOB:
"[Foydalanuvchi o'z g'oyalari asosida, lekin grammatika tuzatilgan va biroz kuchaytirilan — INGLIZ TILIDA. Bu user javobining improved versiyasi, yangi javob emas.]"

🏆 YUQORI BALL UCHUN:
• [1-2 ta eng muhim fokus — aniq, amaliy]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[VOCAB_START]
{"word": "...", "definition": "...", "example": "..."}
[VOCAB_END]

[PROGRESS_START]
{"score": 0-10, "grammarStrengths": ["..."], "grammarWeaknesses": ["..."]}
[PROGRESS_END]

[SUGGEST_START]
{"suggestions": ["[User AI tutorga beradigan savol 1 — tahlil yoki feedbackni chuqurroq tushunish uchun, o'zbek tilida. Masalan: 'Bu xatoni qanday tuzatishim mumkin?', 'Model answerda ishlatilgan grammatikani tushuntiring', 'Yana qanday so'zlar ishlatishim mumkin edi?']", "[Savol 2]", "[Savol 3]"]}
[SUGGEST_END]`;


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

  async generateText(prompt: string, onChunk?: (text: string) => void): Promise<GenerateContentResponse> {
    if (onChunk) {
      let fullText = "";
      try {
        const stream = this.claude.messages.stream({
          model: this.claudeModel,
          max_tokens: 2000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }],
        });
        for await (const event of stream as any) {
          if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
            fullText += event.delta.text;
            onChunk(event.delta.text);
          }
        }
        return { text: fullText } as unknown as GenerateContentResponse;
      } catch (err) {
        console.warn("Claude streaming failed, falling back:", err);
      }
    }

    const text = await this.withRetry(async () => {
      const response = await this.claude.messages.create({
        model: this.claudeModel,
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      });
      return (response.content[0] as any).text as string;
    });

    onChunk?.(text);
    return { text } as unknown as GenerateContentResponse;
  }

  async analyzeAudio(audioBase64: string, mimeType: string, context: string, onChunk?: (text: string) => void): Promise<GenerateContentResponse> {
    const format = mimeType.includes("webm") ? "webm"
      : mimeType.includes("mp4") || mimeType.includes("m4a") ? "mp4"
      : mimeType.includes("wav") ? "wav"
      : mimeType.includes("ogg") ? "ogg"
      : "webm";

    try {
      let fullText = "";
      const stream = await (this.openai.chat.completions.create as any)({
        model: "gpt-4o-mini-audio-preview",
        modalities: ["text"],
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "input_audio", input_audio: { data: audioBase64, format } },
              {
                type: "text",
                text: `${context}\n\nFEEDBACK FORMAT bo'yicha baholang. Har bir grammatika xatosini toping.`,
              },
            ],
          },
        ],
        max_tokens: 2000,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta: string = chunk.choices[0]?.delta?.content ?? "";
        if (delta) {
          fullText += delta;
          onChunk?.(delta);
        }
      }
      return { text: fullText } as unknown as GenerateContentResponse;
    } catch (gptErr) {
      console.warn("GPT-4o audio failed, falling back to Whisper + Claude:", gptErr);

      // Fallback: Whisper → Claude
      let transcript = "";
      try {
        const byteCharacters = atob(audioBase64);
        const byteArray = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) byteArray[i] = byteCharacters.charCodeAt(i);
        const blob = new Blob([byteArray], { type: mimeType });
        const audioFile = new File([blob], `audio.${format}`, { type: mimeType });
        const transcription = await this.openai.audio.transcriptions.create({ file: audioFile, model: "whisper-1", language: "en" });
        transcript = transcription.text;
      } catch (whisperErr) {
        console.warn("Whisper transcription also failed:", whisperErr);
      }

      const prompt = transcript
        ? `Context: ${context}\n\nUser's spoken transcript (transcribed by Whisper):\n"${transcript}"\n\nProvide feedback EXACTLY as per the FEEDBACK FORMAT. Note common Uzbek learner pronunciation issues based on the words used.`
        : `Context: ${context}\n\n(Audio could not be processed. Provide general feedback on how to answer this question well.)\n\nPlease provide feedback EXACTLY as per the FEEDBACK FORMAT in your instructions.`;

      return this.generateText(prompt, onChunk);
    }
  }

  async chat(history: { role: "user" | "model", text: string }[], newMessage: string, context: string, onChunk?: (text: string) => void): Promise<GenerateContentResponse> {
    const messages: Anthropic.MessageParam[] = history.map(msg => ({
      role: msg.role === "model" ? "assistant" as const : "user" as const,
      content: msg.text,
    }));
    if (newMessage) messages.push({ role: "user", content: newMessage });

    if (onChunk) {
      let fullText = "";
      try {
        const stream = this.claude.messages.stream({
          model: this.claudeModel,
          max_tokens: 1500,
          system: context,
          messages,
        });
        for await (const event of stream as any) {
          if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
            fullText += event.delta.text;
            onChunk(event.delta.text);
          }
        }
        return { text: fullText } as unknown as GenerateContentResponse;
      } catch (err) {
        console.warn("Claude chat streaming failed, falling back:", err);
      }
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

    onChunk?.(text);
    return { text } as unknown as GenerateContentResponse;
  }
}

export const gemini = new GeminiService();
