export enum ExamStage {
  PLACEMENT = 'PLACEMENT',
  PART1 = 'PART1',
  PART2 = 'PART2',
  PART3 = 'PART3',
  FEEDBACK = 'FEEDBACK',
  IDLE = 'IDLE'
}

export type CEFRLevel = 'A2' | 'B1' | 'B2' | 'C1' | 'Unknown';

export interface Message {
  role: 'user' | 'model';
  text: string;
  audioUrl?: string;
  timestamp: number;
}

export interface SavedAnswer {
  id: string;
  sessionId?: string;
  questionId: string;
  part: string;
  questionText: string;
  audioUrl: string | null;
  audioBlob: Blob | null;
  transcript: string | null;
  analysis: string | null;
  timestamp: number;
}
export interface VocabularyWord {
  id: string;
  word: string;
  definition: string;
  example: string;
  timestamp: number;
}

export interface ProgressData {
  id: string;
  timestamp: number;
  score: number;
  grammarStrengths: string[];
  grammarWeaknesses: string[];
  vocabularyCount: number;
}

export interface UserProfile {
  targetCEFR: CEFRLevel;
  preferredLanguage: 'Uzbek' | 'English';
  name: string;
}

export interface AnalysisPreferences {
  pronunciation: boolean;
  grammar: boolean;
  vocabulary: boolean;
  fluency: boolean;
}

export type MockQuestion = {
  id: string;
  part: string;
  text: string;
  timeLimit: number;
  prepTime?: number;
  imageUrls?: string[];
  subQuestions?: string[];
  part3Data?: { topic: string; for: string[]; against: string[] };
};

export type MockTestSet = {
  id: string;
  title: string;
  description: string;
  questions: MockQuestion[];
};

export interface ExamState {
  stage: ExamStage;
  level: CEFRLevel;
  currentQuestionIndex: number;
  isRecording: boolean;
  transcript?: string;
  duration?: number;
}
