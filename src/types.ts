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
  questionId: string;
  part: string;
  questionText: string;
  audioUrl: string;
  audioBlob: Blob;
  transcript: string | null;
  analysis: string | null;
  timestamp: number;
}

export interface ExamState {
  stage: ExamStage;
  level: CEFRLevel;
  currentQuestionIndex: number;
  isRecording: boolean;
  transcript?: string;
  duration?: number;
}
