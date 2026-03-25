import React from 'react';
import localforage from 'localforage';
import { UserProfile, CEFRLevel } from '../types';

interface ProfileSectionProps {
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  onClose: () => void;
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({ profile, setProfile, onClose }) => {
  const handleSave = async () => {
    await localforage.setItem('user_profile', profile);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl">
        <h2 className="text-2xl font-bold mb-6">Profil sozlamalari</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ismingiz</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Maqsadli CEFR darajasi</label>
            <select
              value={profile.targetCEFR}
              onChange={(e) => setProfile(prev => ({ ...prev, targetCEFR: e.target.value as CEFRLevel }))}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="A2">A2</option>
              <option value="B1">B1</option>
              <option value="B2">B2</option>
              <option value="C1">C1</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Til</label>
            <select
              value={profile.preferredLanguage}
              onChange={(e) => setProfile(prev => ({ ...prev, preferredLanguage: e.target.value as 'Uzbek' | 'English' }))}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="Uzbek">O'zbekcha</option>
              <option value="English">English</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="mt-8 w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors"
        >
          Saqlash
        </button>
      </div>
    </div>
  );
};
