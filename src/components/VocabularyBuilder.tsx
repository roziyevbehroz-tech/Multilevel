import React, { useState, useEffect } from "react";
import { BookOpen, Plus, Trash2, CheckCircle } from "lucide-react";
import localforage from "localforage";
import { VocabularyWord } from "../types";

export const VocabularyBuilder: React.FC = () => {
  const [savedWords, setSavedWords] = useState<VocabularyWord[]>([]);

  useEffect(() => {
    loadSavedWords();
  }, []);

  const loadSavedWords = async () => {
    const words: VocabularyWord[] = [];
    await localforage.iterate((value: VocabularyWord, key: string) => {
      if (key.startsWith("vocab_")) {
        words.push(value);
      }
    });
    setSavedWords(words.sort((a, b) => b.timestamp - a.timestamp));
  };

  const deleteWord = async (id: string) => {
    await localforage.removeItem(id);
    loadSavedWords();
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="text-indigo-600" size={24} />
        <h2 className="text-xl font-bold text-gray-800">Vocabulary Builder</h2>
      </div>

      {savedWords.length === 0 ? (
        <p className="text-gray-500 text-center py-10">
          Hali hech qanday so'z saqlanmagan. AI Teacher tavsiyalaridan so'zlarni saqlang.
        </p>
      ) : (
        <div className="space-y-4">
          {savedWords.map((word) => (
            <div key={word.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-indigo-700 text-lg">{word.word}</h3>
                <button onClick={() => deleteWord(word.id)} className="text-gray-400 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
              <p className="text-sm text-gray-700 mt-1 italic">{word.definition}</p>
              <p className="text-sm text-gray-600 mt-2 bg-white p-2 rounded-md border border-gray-100">
                <span className="font-semibold text-gray-500">Ex:</span> {word.example}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
