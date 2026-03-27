import React, { useState, useEffect } from "react";
import { BookOpen, Trash2, CheckCircle, Circle } from "lucide-react";
import localforage from "localforage";
import { VocabularyWord } from "../types";

export const VocabularyBuilder: React.FC = () => {
  const [savedWords, setSavedWords] = useState<VocabularyWord[]>([]);
  const [learnedIds, setLearnedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const words: VocabularyWord[] = [];
    const learned: string[] = [];

    await localforage.iterate((value: any, key: string) => {
      if (key.startsWith("vocab_")) words.push(value as VocabularyWord);
      if (key.startsWith("learned_")) learned.push(value as string);
    });

    setSavedWords(words.sort((a, b) => b.timestamp - a.timestamp));
    setLearnedIds(new Set(learned));
  };

  const toggleLearned = async (id: string) => {
    const key = `learned_${id}`;
    if (learnedIds.has(id)) {
      await localforage.removeItem(key);
      setLearnedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    } else {
      await localforage.setItem(key, id);
      setLearnedIds(prev => new Set(prev).add(id));
    }
  };

  const deleteWord = async (id: string) => {
    await localforage.removeItem(id);
    await localforage.removeItem(`learned_${id}`);
    loadData();
  };

  const learnedCount = savedWords.filter(w => learnedIds.has(w.id)).length;
  const unlearnedWords = savedWords.filter(w => !learnedIds.has(w.id));
  const learnedWords = savedWords.filter(w => learnedIds.has(w.id));

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="text-indigo-600" size={20} />
            <h2 className="font-bold text-gray-800">Vocabulary Builder</h2>
          </div>
          <span className="text-xs text-gray-500">{savedWords.length} ta so'z</span>
        </div>
        {savedWords.length > 0 && (
          <div className="flex gap-2">
            <div className="flex-1 bg-indigo-50 rounded-xl p-2 text-center">
              <div className="text-lg font-bold text-indigo-600">{unlearnedWords.length}</div>
              <div className="text-[10px] text-indigo-400">O'rganilmagan</div>
            </div>
            <div className="flex-1 bg-green-50 rounded-xl p-2 text-center">
              <div className="text-lg font-bold text-green-600">{learnedCount}</div>
              <div className="text-[10px] text-green-400">O'rganilgan</div>
            </div>
            <div className="flex-1 bg-gray-50 rounded-xl p-2 text-center">
              <div className="text-lg font-bold text-gray-600">
                {savedWords.length > 0 ? Math.round((learnedCount / savedWords.length) * 100) : 0}%
              </div>
              <div className="text-[10px] text-gray-400">Progress</div>
            </div>
          </div>
        )}
      </div>

      {savedWords.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
          <BookOpen size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">Hali hech qanday so'z saqlanmagan.</p>
          <p className="text-gray-400 text-xs mt-1">AI tahlildan so'ng so'zlar avtomatik saqlanadi.</p>
        </div>
      ) : (
        <>
          {unlearnedWords.length > 0 && (
            <div className="space-y-2">
              {unlearnedWords.map((word) => (
                <WordCard key={word.id} word={word} learned={false} onToggle={toggleLearned} onDelete={deleteWord} />
              ))}
            </div>
          )}
          {learnedWords.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 font-medium px-1">✅ O'rganilgan so'zlar</p>
              {learnedWords.map((word) => (
                <WordCard key={word.id} word={word} learned={true} onToggle={toggleLearned} onDelete={deleteWord} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

interface WordCardProps {
  word: VocabularyWord;
  learned: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const WordCard: React.FC<WordCardProps> = ({ word, learned, onToggle, onDelete }) => (
  <div className={`bg-white rounded-xl border p-3 shadow-sm transition-all ${learned ? "border-green-200 opacity-60" : "border-gray-100"}`}>
    <div className="flex justify-between items-start gap-2">
      <div className="flex-1 min-w-0">
        <span className={`font-bold text-base ${learned ? "text-green-600 line-through" : "text-indigo-700"}`}>
          {word.word}
        </span>
        <p className="text-xs text-gray-600 italic leading-relaxed mt-1">{word.definition}</p>
        <p className="text-xs text-gray-500 mt-1.5 bg-gray-50 rounded-lg px-2 py-1.5 leading-relaxed">
          <span className="font-semibold text-gray-400 not-italic">Misol: </span>
          {word.example}
        </p>
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        <button
          onClick={() => onToggle(word.id)}
          className={`p-1 rounded-lg transition-colors ${learned ? "text-green-500 hover:text-gray-400" : "text-gray-300 hover:text-green-500"}`}
          title={learned ? "Belgilashni olib tashlash" : "O'rganildi deb belgilash"}
        >
          {learned ? <CheckCircle size={18} /> : <Circle size={18} />}
        </button>
        <button onClick={() => onDelete(word.id)} className="p-1 text-gray-300 hover:text-red-500 rounded-lg transition-colors">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  </div>
);
