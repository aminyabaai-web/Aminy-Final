// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Speech Progress Tracker Component
 *
 * Comprehensive tracking for Speech-Language Pathology goals
 * - Articulation sound tracking
 * - Language goal progress
 * - AAC usage monitoring
 * - Session data collection
 */

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Volume2,
  Languages,
  Utensils,
  ChevronRight,
  ChevronDown,
  Plus,
  Check,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Edit2,
  BookOpen,
} from 'lucide-react';
import {
  SLPDomain,
  ArticulationProfile,
  ArticulationSound,
  LanguageGoal,
  AACGoal,
  SLPSessionData,
  COMMON_SOUNDS,
  RECEPTIVE_LANGUAGE_SKILLS,
  EXPRESSIVE_LANGUAGE_SKILLS,
  CORE_VOCABULARY_STARTER,
  getArticulationProfile,
  saveArticulationProfile,
  getSLPSessions,
  saveSLPSession,
  calculateAccuracy,
  getPromptLevelDescription,
  generateDomainSummary,
  AccuracyLevel,
  PromptLevel,
} from '../lib/speech-goals';

interface SpeechProgressTrackerProps {
  childId: string;
  childName: string;
  childAge: number;
}

type TabType = 'overview' | 'articulation' | 'language' | 'aac' | 'sessions';

export const SpeechProgressTracker: React.FC<SpeechProgressTrackerProps> = ({
  childId,
  childName,
  childAge,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [articulationProfile, setArticulationProfile] = useState<ArticulationProfile | null>(null);
  const [sessions, setSessions] = useState<SLPSessionData[]>([]);
  const [expandedSounds, setExpandedSounds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load data
    const profile = getArticulationProfile(childId);
    setArticulationProfile(profile);

    const sessionData = getSLPSessions(childId);
    setSessions(sessionData);
  }, [childId]);

  // Initialize profile if doesn't exist
  const initializeProfile = () => {
    const newProfile: ArticulationProfile = {
      childId,
      sounds: [],
      primaryFocus: [],
      secondaryFocus: [],
      stimulability: {},
      lastUpdated: new Date().toISOString(),
    };
    saveArticulationProfile(newProfile);
    setArticulationProfile(newProfile);
  };

  const addSoundToTrack = (sound: string) => {
    if (!articulationProfile) return;

    const newSound: ArticulationSound = {
      sound,
      position: 'initial',
      currentAccuracy: 0,
      targetAccuracy: 80,
      level: 'word',
      promptLevel: 'verbal-cue',
    };

    const updated: ArticulationProfile = {
      ...articulationProfile,
      sounds: [...articulationProfile.sounds, newSound],
      lastUpdated: new Date().toISOString(),
    };

    saveArticulationProfile(updated);
    setArticulationProfile(updated);
  };

  const updateSoundProgress = (
    sound: string,
    position: ArticulationSound['position'],
    accuracy: AccuracyLevel
  ) => {
    if (!articulationProfile) return;

    const updated: ArticulationProfile = {
      ...articulationProfile,
      sounds: articulationProfile.sounds.map((s) =>
        s.sound === sound && s.position === position
          ? { ...s, currentAccuracy: accuracy, lastPracticed: new Date().toISOString() }
          : s
      ),
      lastUpdated: new Date().toISOString(),
    };

    saveArticulationProfile(updated);
    setArticulationProfile(updated);
  };

  const toggleSoundExpanded = (sound: string) => {
    const next = new Set(expandedSounds);
    if (next.has(sound)) {
      next.delete(sound);
    } else {
      next.add(sound);
    }
    setExpandedSounds(next);
  };

  // Calculate domain summaries
  const articulationSummary = generateDomainSummary('articulation', sessions);
  const expressiveSummary = generateDomainSummary('expressive-language', sessions);
  const receptiveSummary = generateDomainSummary('receptive-language', sessions);

  const renderTrendIcon = (trend: 'improving' | 'stable' | 'declining') => {
    if (trend === 'improving') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === 'declining') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-[#8A9BA8]" />;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6" />
          <div>
            <h2 className="text-lg font-semibold">Speech & Language</h2>
            <p className="text-sm text-green-100">{childName}'s communication progress</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b flex overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: Target },
          { id: 'articulation', label: 'Sounds', icon: Volume2 },
          { id: 'language', label: 'Language', icon: Languages },
          { id: 'aac', label: 'AAC', icon: MessageSquare },
          { id: 'sessions', label: 'Sessions', icon: BookOpen },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as TabType)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === id
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-[#5A6B7A] hover:text-[#3A4A57]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 md:p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-3 sm:space-y-4 sm:space-y-6">
            {/* Domain Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div className="p-4 bg-purple-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-700">Articulation</span>
                  {renderTrendIcon(articulationSummary.trend)}
                </div>
                <div className="text-xl sm:text-2xl font-bold text-purple-900">
                  {articulationSummary.averageAccuracy}%
                </div>
                <div className="text-xs text-purple-600 mt-1">
                  {articulationSummary.sessionCount} sessions tracked
                </div>
              </div>

              <div className="p-4 bg-[#EEF4F8] rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-700">Expressive</span>
                  {renderTrendIcon(expressiveSummary.trend)}
                </div>
                <div className="text-xl sm:text-2xl font-bold text-blue-900">
                  {expressiveSummary.averageAccuracy}%
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  {expressiveSummary.sessionCount} sessions tracked
                </div>
              </div>

              <div className="p-4 bg-[#6B9080]/10 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[#6B9080]">Receptive</span>
                  {renderTrendIcon(receptiveSummary.trend)}
                </div>
                <div className="text-xl sm:text-2xl font-bold text-[#6B9080]">
                  {receptiveSummary.averageAccuracy}%
                </div>
                <div className="text-xs text-[#6B9080] mt-1">
                  {receptiveSummary.sessionCount} sessions tracked
                </div>
              </div>
            </div>

            {/* Current Focus */}
            {articulationProfile && articulationProfile.primaryFocus.length > 0 && (
              <div className="p-4 border rounded-xl">
                <h3 className="font-medium text-[#3A4A57] mb-3">Current Focus</h3>
                <div className="flex flex-wrap gap-2">
                  {articulationProfile.primaryFocus.map((sound) => (
                    <span
                      key={sound}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium"
                    >
                      /{sound}/
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Sessions */}
            <div>
              <h3 className="font-medium text-[#3A4A57] mb-3">Recent Sessions</h3>
              {sessions.length === 0 ? (
                <p className="text-[#5A6B7A] text-sm">No sessions recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {sessions.slice(0, 3).map((session) => (
                    <div
                      key={session.id}
                      className="p-3 border rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-sm">
                          {new Date(session.sessionDate).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-[#5A6B7A]">
                          {session.duration} min - {session.domains.join(', ')}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#8A9BA8]" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Articulation Tab */}
        {activeTab === 'articulation' && (
          <div className="space-y-3 sm:space-y-4 sm:space-y-6">
            {!articulationProfile ? (
              <div className="text-center py-8">
                <Volume2 className="w-12 h-12 mx-auto mb-3 text-[#8A9BA8]" />
                <p className="text-[#5A6B7A] mb-4">No articulation profile set up yet.</p>
                <button
                  onClick={initializeProfile}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Set Up Articulation Tracking
                </button>
              </div>
            ) : (
              <>
                {/* Age-appropriate sounds */}
                <div>
                  <h3 className="font-medium text-[#3A4A57] mb-3">Sounds for Age {childAge}</h3>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_SOUNDS.filter(
                      (s) =>
                        childAge >= s.ageOfMastery - 1 &&
                        !articulationProfile.sounds.some((as) => as.sound === s.sound)
                    ).map((sound) => (
                      <button
                        key={sound.sound}
                        onClick={() => addSoundToTrack(sound.sound)}
                        className="px-3 py-1.5 border border-dashed border-[#E8E4DF] rounded-full text-sm hover:border-green-500 hover:text-green-600 transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />/{sound.sound}/
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tracked sounds */}
                <div>
                  <h3 className="font-medium text-[#3A4A57] mb-3">Tracked Sounds</h3>
                  {articulationProfile.sounds.length === 0 ? (
                    <p className="text-[#5A6B7A] text-sm">No sounds being tracked. Add some above.</p>
                  ) : (
                    <div className="space-y-2">
                      {articulationProfile.sounds.map((sound) => (
                        <div key={`${sound.sound}-${sound.position}`} className="border rounded-xl">
                          <button
                            onClick={() => toggleSoundExpanded(sound.sound)}
                            className="w-full p-4 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold text-green-600">
                                /{sound.sound}/
                              </span>
                              <span className="text-sm text-[#5A6B7A] capitalize">
                                {sound.position}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-sm font-medium">
                                  {sound.currentAccuracy}%
                                </div>
                                <div className="text-xs text-[#5A6B7A]">
                                  Target: {sound.targetAccuracy}%
                                </div>
                              </div>
                              {expandedSounds.has(sound.sound) ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </div>
                          </button>

                          {expandedSounds.has(sound.sound) && (
                            <div className="px-4 pb-4 pt-0 border-t">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3">
                                <div>
                                  <label className="text-xs text-[#5A6B7A]">Level</label>
                                  <div className="font-medium capitalize">{sound.level}</div>
                                </div>
                                <div>
                                  <label className="text-xs text-[#5A6B7A]">Prompt</label>
                                  <div className="font-medium capitalize">
                                    {sound.promptLevel.replace('-', ' ')}
                                  </div>
                                </div>
                              </div>

                              {/* Quick accuracy update */}
                              <div className="mt-4">
                                <label className="text-xs text-[#5A6B7A] block mb-2">
                                  Update Accuracy
                                </label>
                                <div className="flex gap-1">
                                  {[0, 20, 40, 60, 80, 100].map((acc) => (
                                    <button
                                      key={acc}
                                      onClick={() =>
                                        updateSoundProgress(
                                          sound.sound,
                                          sound.position,
                                          acc as AccuracyLevel
                                        )
                                      }
                                      className={`flex-1 py-2 text-xs rounded transition-colors ${
                                        sound.currentAccuracy === acc
                                          ? 'bg-green-600 text-white'
                                          : 'bg-[#F0EDE8] hover:bg-[#E8E4DF]'
                                      }`}
                                    >
                                      {acc}%
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Language Tab */}
        {activeTab === 'language' && (
          <div className="space-y-3 sm:space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 sm:gap-6">
              {/* Receptive */}
              <div>
                <h3 className="font-medium text-[#3A4A57] mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full" />
                  Receptive Language
                </h3>
                <p className="text-sm text-[#5A6B7A] mb-3">Understanding what others say</p>
                <div className="space-y-2">
                  {RECEPTIVE_LANGUAGE_SKILLS.slice(0, 6).map((skill) => (
                    <div
                      key={skill.id}
                      className="p-3 border rounded-lg hover:border-[#6B9080]/30 cursor-pointer transition-colors"
                    >
                      <div className="font-medium text-sm">{skill.name}</div>
                      <div className="text-xs text-[#5A6B7A]">{skill.ageRange}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expressive */}
              <div>
                <h3 className="font-medium text-[#3A4A57] mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full" />
                  Expressive Language
                </h3>
                <p className="text-sm text-[#5A6B7A] mb-3">Expressing thoughts and needs</p>
                <div className="space-y-2">
                  {EXPRESSIVE_LANGUAGE_SKILLS.slice(0, 6).map((skill) => (
                    <div
                      key={skill.id}
                      className="p-3 border rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
                    >
                      <div className="font-medium text-sm">{skill.name}</div>
                      <div className="text-xs text-[#5A6B7A]">{skill.ageRange}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AAC Tab */}
        {activeTab === 'aac' && (
          <div className="space-y-3 sm:space-y-4 sm:space-y-6">
            <div className="bg-[#EEF4F8] border border-[#C8DDE8] rounded-xl p-4">
              <h3 className="font-medium text-[#4A6478] mb-2">
                Augmentative & Alternative Communication
              </h3>
              <p className="text-sm text-blue-700">
                Track AAC device usage, core vocabulary, and communication functions.
              </p>
            </div>

            {/* Core Vocabulary */}
            <div>
              <h3 className="font-medium text-[#3A4A57] mb-3">Core Vocabulary Targets</h3>
              <p className="text-sm text-[#5A6B7A] mb-3">
                High-frequency words that work across contexts
              </p>
              <div className="flex flex-wrap gap-2">
                {CORE_VOCABULARY_STARTER.slice(0, 20).map((word) => (
                  <span
                    key={word}
                    className="px-3 py-1 bg-[#F0EDE8] text-[#3A4A57] rounded-full text-sm"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>

            {/* Communicative Functions */}
            <div>
              <h3 className="font-medium text-[#3A4A57] mb-3">Communication Functions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { id: 'requesting', label: 'Requesting', emoji: '🙏' },
                  { id: 'commenting', label: 'Commenting', emoji: '💬' },
                  { id: 'protesting', label: 'Protesting', emoji: '🚫' },
                  { id: 'greeting', label: 'Greeting', emoji: '👋' },
                  { id: 'answering', label: 'Answering', emoji: '✅' },
                  { id: 'asking', label: 'Asking', emoji: '❓' },
                  { id: 'directing', label: 'Directing', emoji: '👉' },
                  { id: 'sharing', label: 'Sharing', emoji: '🤝' },
                ].map((func) => (
                  <div key={func.id} className="p-3 border rounded-lg text-center">
                    <div className="text-2xl mb-1">{func.emoji}</div>
                    <div className="text-sm font-medium">{func.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="space-y-3 sm:space-y-4 sm:space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-[#3A4A57]">Session History</h3>
              <button className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors">
                <Plus className="w-4 h-4" />
                Log Session
              </button>
            </div>

            {sessions.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-[#8A9BA8]" />
                <p className="text-[#5A6B7A]">No sessions recorded yet.</p>
                <p className="text-sm text-[#8A9BA8] mt-1">
                  Start tracking therapy sessions to see progress over time.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div key={session.id} className="p-4 border rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium">
                          {new Date(session.sessionDate).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="text-sm text-[#5A6B7A]">
                          {session.duration} minutes
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {session.domains.map((domain) => (
                          <span
                            key={domain}
                            className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs"
                          >
                            {domain}
                          </span>
                        ))}
                      </div>
                    </div>
                    {session.sessionNotes && (
                      <p className="text-sm text-[#5A6B7A] mt-2">{session.sessionNotes}</p>
                    )}
                    {session.parentCarryover.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <div className="text-xs text-[#5A6B7A] mb-1">Home practice:</div>
                        <ul className="text-sm text-[#5A6B7A]">
                          {session.parentCarryover.map((item, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-green-500">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SpeechProgressTracker;
