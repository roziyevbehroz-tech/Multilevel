import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { TrendingUp, Target, Award, BarChart2 } from "lucide-react";
import localforage from "localforage";
import { ProgressData } from "../types";

const scoreToLevel = (score: number): { label: string; color: string } => {
  if (score >= 8) return { label: "C1+", color: "text-purple-600" };
  if (score >= 6.5) return { label: "B2", color: "text-blue-600" };
  if (score >= 5) return { label: "B1", color: "text-green-600" };
  return { label: "A2", color: "text-orange-500" };
};

export const ProgressDashboard: React.FC = () => {
  const [progressData, setProgressData] = useState<ProgressData[]>([]);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    const data: ProgressData[] = [];
    await localforage.iterate((value: ProgressData, key: string) => {
      if (key.startsWith("progress_")) data.push(value);
    });
    setProgressData(data.sort((a, b) => a.timestamp - b.timestamp));
  };

  if (progressData.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
        <BarChart2 size={36} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 text-sm">Progressni ko'rish uchun kamida bitta tahlil kerak.</p>
        <p className="text-gray-400 text-xs mt-1">Mashq qilishni davom eting!</p>
      </div>
    );
  }

  const latest = progressData[progressData.length - 1];
  const avgScore = progressData.reduce((s, d) => s + d.score, 0) / progressData.length;
  const bestScore = Math.max(...progressData.map(d => d.score));
  const latestLevel = scoreToLevel(latest.score);

  // Transform data for recharts (array.length doesn't work as dataKey)
  const chartData = progressData.map((d, i) => ({
    session: `#${i + 1}`,
    ball: d.score,
    kuchlilar: d.grammarStrengths?.length ?? 0,
    zaiflar: d.grammarWeaknesses?.length ?? 0,
  }));

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
          <TrendingUp size={16} className="mx-auto text-indigo-500 mb-1" />
          <div className={`text-lg font-bold ${latestLevel.color}`}>{latestLevel.label}</div>
          <div className="text-[10px] text-gray-400">Oxirgi daraja</div>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
          <Award size={16} className="mx-auto text-yellow-500 mb-1" />
          <div className="text-lg font-bold text-gray-700">{bestScore.toFixed(1)}</div>
          <div className="text-[10px] text-gray-400">Eng yuqori</div>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
          <Target size={16} className="mx-auto text-green-500 mb-1" />
          <div className="text-lg font-bold text-gray-700">{avgScore.toFixed(1)}</div>
          <div className="text-[10px] text-gray-400">O'rtacha</div>
        </div>
      </div>

      {/* Score trend chart */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-600 mb-3">Ball dinamikasi</h3>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="session" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number) => [`${value}`, "Ball"]} />
              <Line type="monotone" dataKey="ball" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grammar bar chart */}
      {progressData.length >= 2 && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Grammatika: kuchli vs zaif</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.slice(-5)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="session" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="kuchlilar" name="Kuchli" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="zaiflar" name="Zaif" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Latest weaknesses */}
      {(latest.grammarWeaknesses?.length ?? 0) > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-red-50 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Ishlash kerak bo'lgan jihatlar</h3>
          <ul className="space-y-1">
            {latest.grammarWeaknesses.map((w, i) => (
              <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                <span className="text-red-400 mt-0.5 shrink-0">•</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
