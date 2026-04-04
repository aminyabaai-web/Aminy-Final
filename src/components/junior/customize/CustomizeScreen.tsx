import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Lock, Check, Volume2, VolumeX, Music, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AminyBuddy } from '../buddy';
import { playTap, playSuccess, haptic } from '../activities/sounds';

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

export interface CustomizeScreenProps {
  onBack: () => void;
  totalStars: number;
}

interface CustomizePrefs {
  themeColor: string;
  buddyOutfit: string[];
  backgroundTheme: string;
  soundEffects: boolean;
  music: boolean;
}

const STORAGE_KEY = 'aminy-ease-customize';

const THEME_COLORS = [
  { name: 'Teal', value: '#43AA8B' },
  { name: 'Blue', value: '#577590' },
  { name: 'Purple', value: '#7B68EE' },
  { name: 'Pink', value: '#E87DA0' },
  { name: 'Orange', value: '#E07A5F' },
  { name: 'Yellow', value: '#FFD166' },
  { name: 'Green', value: '#06D6A0' },
  { name: 'Red', value: '#E74C3C' },
] as const;

const BUDDY_OUTFITS: {
  id: string;
  label: string;
  emoji: string;
  starCost: number;
}[] = [
  { id: 'none', label: 'None', emoji: '✨', starCost: 0 },
  { id: 'star-crown', label: 'Star Crown', emoji: '👑', starCost: 0 },
  { id: 'tiny-cape', label: 'Tiny Cape', emoji: '🦸', starCost: 0 },
  { id: 'glasses', label: 'Glasses', emoji: '👓', starCost: 25 },
  { id: 'wizard-hat', label: 'Wizard Hat', emoji: '🧙', starCost: 50 },
  { id: 'superhero-mask', label: 'Hero Mask', emoji: '🦹', starCost: 100 },
  { id: 'rainbow-wings', label: 'Rainbow Wings', emoji: '🌈', starCost: 200 },
];

const BACKGROUNDS: {
  id: string;
  label: string;
  emoji: string;
  gradient: string;
}[] = [
  { id: 'day-sky', label: 'Day Sky', emoji: '☀️', gradient: 'linear-gradient(180deg, #87CEEB 0%, #E0F2FE 100%)' },
  { id: 'night-sky', label: 'Night Sky', emoji: '🌙', gradient: 'linear-gradient(180deg, #0D1B2A 0%, #1a3a5c 100%)' },
  { id: 'sunset', label: 'Sunset', emoji: '🌅', gradient: 'linear-gradient(180deg, #E07A5F 0%, #FFD166 100%)' },
  { id: 'ocean', label: 'Ocean', emoji: '🌊', gradient: 'linear-gradient(180deg, #2EC4B6 0%, #43AA8B 100%)' },
];

const DEFAULT_PREFS: CustomizePrefs = {
  themeColor: '#43AA8B',
  buddyOutfit: [],
  backgroundTheme: 'night-sky',
  soundEffects: true,
  music: true,
};

function loadPrefs(): CustomizePrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_PREFS };
}

function savePrefs(prefs: CustomizePrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CustomizeScreen({ onBack, totalStars }: CustomizeScreenProps) {
  const [prefs, setPrefs] = useState<CustomizePrefs>(loadPrefs);
  const [selectedSection, setSelectedSection] = useState<'theme' | 'outfit' | 'background' | 'sound'>('theme');

  useEffect(() => {
    savePrefs(prefs);
  }, [prefs]);

  const update = useCallback((patch: Partial<CustomizePrefs>) => {
    setPrefs((p) => ({ ...p, ...patch }));
    playTap();
    haptic(30);
  }, []);

  const toggleOutfit = useCallback(
    (id: string) => {
      if (id === 'none') {
        update({ buddyOutfit: [] });
        return;
      }
      const outfit = BUDDY_OUTFITS.find((o) => o.id === id);
      if (outfit && outfit.starCost > totalStars) return; // locked
      setPrefs((p) => {
        const has = p.buddyOutfit.includes(id);
        const next = has ? p.buddyOutfit.filter((o) => o !== id) : [...p.buddyOutfit, id];
        const updated = { ...p, buddyOutfit: next };
        savePrefs(updated);
        return updated;
      });
      playSuccess();
      haptic(50);
    },
    [totalStars, update],
  );

  const bg = BACKGROUNDS.find((b) => b.id === prefs.backgroundTheme) ?? BACKGROUNDS[1];

  const sections = [
    { key: 'theme' as const, label: 'Color', emoji: '🎨' },
    { key: 'outfit' as const, label: 'Outfit', emoji: '👑' },
    { key: 'background' as const, label: 'Scene', emoji: '🏞️' },
    { key: 'sound' as const, label: 'Sound', emoji: '🔊' },
  ];

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: bg.gradient }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button
          onClick={() => { playTap(); haptic(30); onBack(); }}
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
        >
          <ArrowLeft size={20} color="white" />
        </button>
        <h1 className="text-xl font-bold text-white flex-1">Customize</h1>
        <div className="flex items-center gap-1 px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
          <span style={{ fontSize: 14 }}>⭐</span>
          <span className="text-sm font-bold text-white">{totalStars}</span>
        </div>
      </div>

      {/* Preview */}
      <div className="flex justify-center py-4">
        <AminyBuddy
          mood="happy"
          size="lg"
          accessories={prefs.buddyOutfit}
          showEnergy={false}
        />
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 px-4 pb-3">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => { playTap(); setSelectedSection(s.key); }}
            className="flex-1 py-2 rounded-xl text-center text-sm font-semibold transition-all"
            style={{
              backgroundColor: selectedSection === s.key ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.2)',
              color: selectedSection === s.key ? '#333' : 'rgba(255,255,255,0.9)',
            }}
          >
            <span style={{ fontSize: 16 }}>{s.emoji}</span>
            <br />
            {s.label}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div
        className="flex-1 rounded-t-3xl px-4 pt-5 pb-8 overflow-y-auto"
        style={{ backgroundColor: 'rgba(255,255,255,0.95)' }}
      >
        <AnimatePresence mode="wait">
          {selectedSection === 'theme' && (
            <motion.div
              key="theme"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-lg font-bold mb-3" style={{ color: '#333' }}>
                <Palette size={18} className="inline mr-2" />
                Theme Color
              </h2>
              <p className="text-sm mb-4" style={{ color: '#666' }}>Pick a color that makes you smile!</p>
              <div className="grid grid-cols-4 gap-4 justify-items-center">
                {THEME_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => update({ themeColor: c.value })}
                    className="flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center transition-transform"
                      style={{
                        backgroundColor: c.value,
                        transform: prefs.themeColor === c.value ? 'scale(1.15)' : 'scale(1)',
                        boxShadow: prefs.themeColor === c.value
                          ? `0 0 0 3px white, 0 0 0 5px ${c.value}`
                          : '0 2px 4px rgba(0,0,0,0.1)',
                      }}
                    >
                      {prefs.themeColor === c.value && <Check size={20} color="white" />}
                    </div>
                    <span className="text-xs font-medium" style={{ color: '#555' }}>{c.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {selectedSection === 'outfit' && (
            <motion.div
              key="outfit"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-lg font-bold mb-3" style={{ color: '#333' }}>
                👑 Buddy Outfits
              </h2>
              <p className="text-sm mb-4" style={{ color: '#666' }}>Dress up your buddy! Earn stars to unlock more.</p>
              <div className="grid grid-cols-2 gap-3">
                {BUDDY_OUTFITS.map((outfit) => {
                  const locked = outfit.starCost > totalStars && outfit.id !== 'none';
                  const equipped = outfit.id === 'none'
                    ? prefs.buddyOutfit.length === 0
                    : prefs.buddyOutfit.includes(outfit.id);
                  return (
                    <button
                      key={outfit.id}
                      onClick={() => !locked && toggleOutfit(outfit.id)}
                      className="flex items-center gap-3 p-3 rounded-2xl text-left transition-all"
                      style={{
                        backgroundColor: equipped ? '#E8F5E9' : locked ? '#F5F5F5' : 'white',
                        border: equipped ? '2px solid #43AA8B' : '2px solid #E0E0E0',
                        opacity: locked ? 0.6 : 1,
                      }}
                    >
                      <span style={{ fontSize: 28 }}>{outfit.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: locked ? '#999' : '#333' }}>
                          {outfit.label}
                        </p>
                        {outfit.starCost > 0 && (
                          <p className="text-xs" style={{ color: locked ? '#999' : '#43AA8B' }}>
                            {locked ? <><Lock size={10} className="inline" /> {outfit.starCost} ⭐</> : 'Unlocked!'}
                          </p>
                        )}
                        {outfit.starCost === 0 && outfit.id !== 'none' && (
                          <p className="text-xs" style={{ color: '#43AA8B' }}>Free!</p>
                        )}
                      </div>
                      {equipped && <Check size={18} color="#43AA8B" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {selectedSection === 'background' && (
            <motion.div
              key="background"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-lg font-bold mb-3" style={{ color: '#333' }}>
                🏞️ Background Scene
              </h2>
              <p className="text-sm mb-4" style={{ color: '#666' }}>Choose where your buddy hangs out!</p>
              <div className="grid grid-cols-2 gap-3">
                {BACKGROUNDS.map((b) => {
                  const selected = prefs.backgroundTheme === b.id;
                  return (
                    <button
                      key={b.id}
                      onClick={() => update({ backgroundTheme: b.id })}
                      className="rounded-2xl overflow-hidden transition-all"
                      style={{
                        border: selected ? '3px solid #43AA8B' : '3px solid transparent',
                        boxShadow: selected ? '0 4px 12px rgba(67,170,139,0.3)' : '0 2px 6px rgba(0,0,0,0.08)',
                      }}
                    >
                      <div
                        className="h-24 flex items-center justify-center"
                        style={{ background: b.gradient }}
                      >
                        <span style={{ fontSize: 32 }}>{b.emoji}</span>
                      </div>
                      <div className="py-2 px-3" style={{ backgroundColor: 'white' }}>
                        <p className="text-sm font-semibold text-center" style={{ color: '#333' }}>{b.label}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {selectedSection === 'sound' && (
            <motion.div
              key="sound"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-lg font-bold mb-3" style={{ color: '#333' }}>
                🔊 Sound Settings
              </h2>
              <p className="text-sm mb-4" style={{ color: '#666' }}>Control what you hear.</p>
              <div className="space-y-4">
                {/* Sound Effects */}
                <button
                  onClick={() => update({ soundEffects: !prefs.soundEffects })}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl"
                  style={{ backgroundColor: 'white', border: '2px solid #E0E0E0' }}
                >
                  {prefs.soundEffects ? <Volume2 size={24} color="#43AA8B" /> : <VolumeX size={24} color="#999" />}
                  <div className="flex-1 text-left">
                    <p className="text-base font-semibold" style={{ color: '#333' }}>Sound Effects</p>
                    <p className="text-sm" style={{ color: '#666' }}>Taps, success sounds, and more</p>
                  </div>
                  <div
                    className="w-12 h-7 rounded-full flex items-center transition-all px-0.5"
                    style={{
                      backgroundColor: prefs.soundEffects ? '#43AA8B' : '#ccc',
                      justifyContent: prefs.soundEffects ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div className="w-6 h-6 rounded-full bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                </button>

                {/* Music */}
                <button
                  onClick={() => update({ music: !prefs.music })}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl"
                  style={{ backgroundColor: 'white', border: '2px solid #E0E0E0' }}
                >
                  <Music size={24} color={prefs.music ? '#43AA8B' : '#999'} />
                  <div className="flex-1 text-left">
                    <p className="text-base font-semibold" style={{ color: '#333' }}>Music</p>
                    <p className="text-sm" style={{ color: '#666' }}>Background music during activities</p>
                  </div>
                  <div
                    className="w-12 h-7 rounded-full flex items-center transition-all px-0.5"
                    style={{
                      backgroundColor: prefs.music ? '#43AA8B' : '#ccc',
                      justifyContent: prefs.music ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div className="w-6 h-6 rounded-full bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
