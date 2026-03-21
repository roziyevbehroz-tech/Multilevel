import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import localforage from "localforage";
import { ProgressData } from "../types";

export const ProgressDashboard: React.FC = () => {
  const [progressData, setProgressData] = useState<ProgressData[]>([]);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    const data: ProgressData[] = [];
    await localforage.iterate((value: ProgressData, key: string) => {
      if (key.startsWith("progress_")) {
        data.push(value);
      }
    });
    setProgressData(data.sort((a, b) => a.timestamp - b.timestamp));
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Progress Dashboard</h2>

      {progressData.length < 2 ? (
        <p className="text-gray-500 text-center py-10">
          Progressni ko'rish uchun kamida ikkita tahlil kerak. Mashq qilishni davom eting!
        </p>
      ) : (
        <div className="space-y-8">
          <div className="h-64">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Speaking Score Trend</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" tickFormatter={(ts) => new Date(ts).toLocaleDateString()} />
                <YAxis domain={[0, 10]} />
                <Tooltip labelFormatter={(ts) => new Date(ts).toLocaleString()} />
                <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="h-64">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Grammar Strengths vs Weaknesses</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressData.slice(-5)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" tickFormatter={(ts) => new Date(ts).toLocaleDateString()} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="grammarStrengths.length" name="Strengths" fill="#10b981" />
                <Bar dataKey="grammarWeaknesses.length" name="Weaknesses" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
