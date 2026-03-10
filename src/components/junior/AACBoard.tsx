import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Volume2,
  Trash2,
  Star,
  Plus,
  Settings,
  Grid3X3,
  Heart,
  X,
  Check,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AACSymbol {
  id: string;
  emoji: string;
  label: string;
  phrase: string;
  category: AACCategory;
  isFavorite: boolean;
  /** Optional custom image URL from parent-uploaded photo */
  customImage?: string;
}

export type AACCategory =
  | 'wants'
  | 'feelings'
  | 'people'
  | 'actions'
  | 'places'
  | 'food'
  | 'questions'
  | 'responses';

export type GridSize = 3 | 4 | 5 | 6;

interface AACBoardProps {
  childName: string;
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// Category metadata
// ---------------------------------------------------------------------------

const CATEGORY_META: Record<
  AACCategory,
  { label: string; color: string; bgClass: string; borderClass: string; emoji: string }
> = {
  wants: {
    label: 'Wants & Needs',
    color: '#E07A5F',
    bgClass: 'aac-bg-wants',
    borderClass: 'aac-border-wants',
    emoji: '🙏',
  },
  feelings: {
    label: 'Feelings',
    color: '#7B68EE',
    bgClass: 'aac-bg-feelings',
    borderClass: 'aac-border-feelings',
    emoji: '💛',
  },
  people: {
    label: 'People',
    color: '#43AA8B',
    bgClass: 'aac-bg-people',
    borderClass: 'aac-border-people',
    emoji: '👥',
  },
  actions: {
    label: 'Actions',
    color: '#4A90D9',
    bgClass: 'aac-bg-actions',
    borderClass: 'aac-border-actions',
    emoji: '🏃',
  },
  places: {
    label: 'Places',
    color: '#F4A261',
    bgClass: 'aac-bg-places',
    borderClass: 'aac-border-places',
    emoji: '📍',
  },
  food: {
    label: 'Food & Drink',
    color: '#E76F51',
    bgClass: 'aac-bg-food',
    borderClass: 'aac-border-food',
    emoji: '🍎',
  },
  questions: {
    label: 'Questions',
    color: '#2A9D8F',
    bgClass: 'aac-bg-questions',
    borderClass: 'aac-border-questions',
    emoji: '❓',
  },
  responses: {
    label: 'Responses',
    color: '#577590',
    bgClass: 'aac-bg-responses',
    borderClass: 'aac-border-responses',
    emoji: '💬',
  },
};

const CATEGORIES: AACCategory[] = [
  'wants',
  'feelings',
  'people',
  'actions',
  'places',
  'food',
  'questions',
  'responses',
];

// ---------------------------------------------------------------------------
// Core vocabulary — based on AAC research most-used symbols
// ---------------------------------------------------------------------------

const CORE_VOCABULARY: AACSymbol[] = [
  // Wants & Needs
  { id: 'w1', emoji: '👆', label: 'I want', phrase: 'I want', category: 'wants', isFavorite: false },
  { id: 'w2', emoji: '➕', label: 'More', phrase: 'More please', category: 'wants', isFavorite: false },
  { id: 'w3', emoji: '🛑', label: 'Stop', phrase: 'Stop', category: 'wants', isFavorite: false },
  { id: 'w4', emoji: '🆘', label: 'Help', phrase: 'I need help', category: 'wants', isFavorite: false },
  { id: 'w5', emoji: '✅', label: 'Yes', phrase: 'Yes', category: 'wants', isFavorite: false },
  { id: 'w6', emoji: '❌', label: 'No', phrase: 'No', category: 'wants', isFavorite: false },
  { id: 'w7', emoji: '🚽', label: 'Bathroom', phrase: 'I need to go to the bathroom', category: 'wants', isFavorite: false },
  { id: 'w8', emoji: '🏁', label: 'All done', phrase: 'All done', category: 'wants', isFavorite: false },
  { id: 'w9', emoji: '🔄', label: 'Again', phrase: 'Again please', category: 'wants', isFavorite: false },

  // Feelings
  { id: 'f1', emoji: '😊', label: 'Happy', phrase: 'I feel happy', category: 'feelings', isFavorite: false },
  { id: 'f2', emoji: '😢', label: 'Sad', phrase: 'I feel sad', category: 'feelings', isFavorite: false },
  { id: 'f3', emoji: '😠', label: 'Angry', phrase: 'I feel angry', category: 'feelings', isFavorite: false },
  { id: 'f4', emoji: '😰', label: 'Scared', phrase: 'I feel scared', category: 'feelings', isFavorite: false },
  { id: 'f5', emoji: '😴', label: 'Tired', phrase: 'I feel tired', category: 'feelings', isFavorite: false },
  { id: 'f6', emoji: '🤒', label: 'Sick', phrase: 'I don\'t feel well', category: 'feelings', isFavorite: false },
  { id: 'f7', emoji: '😤', label: 'Frustrated', phrase: 'I feel frustrated', category: 'feelings', isFavorite: false },
  { id: 'f8', emoji: '🥰', label: 'Love', phrase: 'I love you', category: 'feelings', isFavorite: false },

  // People
  { id: 'p1', emoji: '👩', label: 'Mom', phrase: 'Mom', category: 'people', isFavorite: false },
  { id: 'p2', emoji: '👨', label: 'Dad', phrase: 'Dad', category: 'people', isFavorite: false },
  { id: 'p3', emoji: '👩‍🏫', label: 'Teacher', phrase: 'Teacher', category: 'people', isFavorite: false },
  { id: 'p4', emoji: '👫', label: 'Friend', phrase: 'My friend', category: 'people', isFavorite: false },
  { id: 'p5', emoji: '👶', label: 'Baby', phrase: 'Baby', category: 'people', isFavorite: false },

  // Actions
  { id: 'a1', emoji: '🚶', label: 'Go', phrase: 'Go', category: 'actions', isFavorite: false },
  { id: 'a2', emoji: '👋', label: 'Come', phrase: 'Come here', category: 'actions', isFavorite: false },
  { id: 'a3', emoji: '📖', label: 'Read', phrase: 'Read to me', category: 'actions', isFavorite: false },
  { id: 'a4', emoji: '🎮', label: 'Play', phrase: 'I want to play', category: 'actions', isFavorite: false },
  { id: 'a5', emoji: '📂', label: 'Open', phrase: 'Open please', category: 'actions', isFavorite: false },
  { id: 'a6', emoji: '🔒', label: 'Close', phrase: 'Close please', category: 'actions', isFavorite: false },
  { id: 'a7', emoji: '👀', label: 'Look', phrase: 'Look', category: 'actions', isFavorite: false },

  // Places
  { id: 'pl1', emoji: '🏠', label: 'Home', phrase: 'Home', category: 'places', isFavorite: false },
  { id: 'pl2', emoji: '🏫', label: 'School', phrase: 'School', category: 'places', isFavorite: false },
  { id: 'pl3', emoji: '🛝', label: 'Park', phrase: 'The park', category: 'places', isFavorite: false },
  { id: 'pl4', emoji: '🏥', label: 'Doctor', phrase: 'The doctor', category: 'places', isFavorite: false },

  // Food & Drink
  { id: 'fd1', emoji: '🍽️', label: 'Eat', phrase: 'I want to eat', category: 'food', isFavorite: false },
  { id: 'fd2', emoji: '🥤', label: 'Drink', phrase: 'I want a drink', category: 'food', isFavorite: false },
  { id: 'fd3', emoji: '🍪', label: 'Snack', phrase: 'I want a snack', category: 'food', isFavorite: false },
  { id: 'fd4', emoji: '💧', label: 'Water', phrase: 'Water please', category: 'food', isFavorite: false },

  // Questions
  { id: 'q1', emoji: '❓', label: 'What', phrase: 'What is that?', category: 'questions', isFavorite: false },
  { id: 'q2', emoji: '📍', label: 'Where', phrase: 'Where is it?', category: 'questions', isFavorite: false },
  { id: 'q3', emoji: '🕐', label: 'When', phrase: 'When?', category: 'questions', isFavorite: false },
  { id: 'q4', emoji: '🤷', label: 'Why', phrase: 'Why?', category: 'questions', isFavorite: false },

  // Responses
  { id: 'r1', emoji: '🙏', label: 'Please', phrase: 'Please', category: 'responses', isFavorite: false },
  { id: 'r2', emoji: '💖', label: 'Thank you', phrase: 'Thank you', category: 'responses', isFavorite: false },
  { id: 'r3', emoji: '👋', label: 'Hi', phrase: 'Hi!', category: 'responses', isFavorite: false },
  { id: 'r4', emoji: '✌️', label: 'Bye', phrase: 'Bye bye', category: 'responses', isFavorite: false },
  { id: 'r5', emoji: '😊', label: 'Okay', phrase: 'Okay', category: 'responses', isFavorite: false },
  { id: 'r6', emoji: '🤗', label: 'Sorry', phrase: "I'm sorry", category: 'responses', isFavorite: false },
];

// ---------------------------------------------------------------------------
// TTS helper
// ---------------------------------------------------------------------------

function speak(text: string, rate = 0.9) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = rate;
  utter.pitch = 1.1;
  utter.volume = 1;
  // Prefer a child-friendly voice if available
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(
    (v) => v.lang.startsWith('en') && (v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Female'))
  );
  if (preferred) utter.voice = preferred;
  window.speechSynthesis.speak(utter);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AACBoard({ childName, onBack }: AACBoardProps) {
  // State
  const [symbols, setSymbols] = useState<AACSymbol[]>(() => {
    try {
      const stored = localStorage.getItem(`aac-symbols-${childName}`);
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return CORE_VOCABULARY;
  });
  const [activeCategory, setActiveCategory] = useState<AACCategory | 'favorites'>('wants');
  const [sentenceStrip, setSentenceStrip] = useState<AACSymbol[]>([]);
  const [gridSize, setGridSize] = useState<GridSize>(4);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddSymbol, setShowAddSymbol] = useState(false);
  const [longPressId, setLongPressId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Custom symbol form
  const [customEmoji, setCustomEmoji] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [customPhrase, setCustomPhrase] = useState('');
  const [customCategory, setCustomCategory] = useState<AACCategory>('wants');

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentenceStripRef = useRef<HTMLDivElement>(null);

  // Persist symbols to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`aac-symbols-${childName}`, JSON.stringify(symbols));
    } catch { /* ignore */ }
  }, [symbols, childName]);

  // Ensure voices are loaded for TTS
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  // ---- Filtered symbols ----
  const filteredSymbols =
    activeCategory === 'favorites'
      ? symbols.filter((s) => s.isFavorite)
      : symbols.filter((s) => s.category === activeCategory);

  // ---- Handlers ----

  const handleSymbolTap = useCallback(
    (symbol: AACSymbol) => {
      // Visual feedback
      setSpeakingId(symbol.id);
      setTimeout(() => setSpeakingId(null), 400);

      // Speak single symbol
      speak(symbol.phrase);

      // Add to sentence strip
      setSentenceStrip((prev) => [...prev, symbol]);
    },
    []
  );

  const handleSpeakSentence = useCallback(() => {
    if (sentenceStrip.length === 0) return;
    const sentence = sentenceStrip.map((s) => s.phrase).join(' ');
    speak(sentence, 0.85);
  }, [sentenceStrip]);

  const handleClearSentence = useCallback(() => {
    setSentenceStrip([]);
  }, []);

  const handleRemoveLastWord = useCallback(() => {
    setSentenceStrip((prev) => prev.slice(0, -1));
  }, []);

  const handleLongPressStart = useCallback((symbolId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setLongPressId(symbolId);
    }, 600);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const toggleFavorite = useCallback((symbolId: string) => {
    setSymbols((prev) =>
      prev.map((s) => (s.id === symbolId ? { ...s, isFavorite: !s.isFavorite } : s))
    );
    setLongPressId(null);
  }, []);

  const handleAddCustomSymbol = useCallback(() => {
    if (!customLabel.trim()) return;
    const newSymbol: AACSymbol = {
      id: `custom-${Date.now()}`,
      emoji: customEmoji || '🔵',
      label: customLabel.trim(),
      phrase: customPhrase.trim() || customLabel.trim(),
      category: customCategory,
      isFavorite: false,
    };
    setSymbols((prev) => [...prev, newSymbol]);
    setCustomEmoji('');
    setCustomLabel('');
    setCustomPhrase('');
    setShowAddSymbol(false);
  }, [customEmoji, customLabel, customPhrase, customCategory]);

  // Auto-scroll sentence strip when new symbol added
  useEffect(() => {
    if (sentenceStripRef.current) {
      sentenceStripRef.current.scrollLeft = sentenceStripRef.current.scrollWidth;
    }
  }, [sentenceStrip]);

  // Grid template
  const gridCols = {
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  }[gridSize];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* ---- Header ---- */}
      <div className="bg-white shadow-sm px-4 py-3 flex items-center justify-between flex-shrink-0">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-lg font-semibold text-gray-800">
          {childName}&apos;s Words
        </h2>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* ---- Sentence Strip ---- */}
      <div className="bg-white border-b-2 border-gray-200 px-3 py-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div
            ref={sentenceStripRef}
            className="flex-1 flex items-center gap-2 overflow-x-auto py-1 min-h-[56px] aac-sentence-strip"
          >
            {sentenceStrip.length === 0 ? (
              <p className="text-gray-400 text-sm italic pl-2">
                Tap symbols to build a sentence
              </p>
            ) : (
              sentenceStrip.map((s, i) => (
                <div
                  key={`${s.id}-${i}`}
                  className={`flex-shrink-0 flex flex-col items-center justify-center px-2 py-1 rounded-lg ${CATEGORY_META[s.category].bgClass} min-w-[48px]`}
                >
                  <span className="text-xl leading-none">{s.emoji}</span>
                  <span className="text-[10px] font-medium text-white mt-0.5 truncate max-w-[56px]">
                    {s.label}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Sentence controls */}
          <div className="flex-shrink-0 flex items-center gap-1">
            {sentenceStrip.length > 0 && (
              <>
                <button
                  onClick={handleRemoveLastWord}
                  className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center"
                  aria-label="Remove last word"
                >
                  <ArrowLeft className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={handleClearSentence}
                  className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center"
                  aria-label="Clear sentence"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </>
            )}
            <button
              onClick={handleSpeakSentence}
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                sentenceStrip.length > 0
                  ? 'bg-blue-500 aac-speak-btn-active'
                  : 'bg-gray-200'
              }`}
              aria-label="Speak sentence"
              disabled={sentenceStrip.length === 0}
            >
              <Volume2
                className={`w-5 h-5 ${
                  sentenceStrip.length > 0 ? 'text-white' : 'text-gray-400'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ---- Category Tabs ---- */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex overflow-x-auto px-2 py-2 gap-1 aac-category-tabs">
          {/* Favorites tab */}
          <button
            onClick={() => setActiveCategory('favorites')}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
              activeCategory === 'favorites'
                ? 'bg-yellow-400 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            <Star className="w-4 h-4" />
            <span>My Words</span>
          </button>
          {CATEGORIES.map((cat) => {
            const meta = CATEGORY_META[cat];
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? `${meta.bgClass} text-white`
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <span>{meta.emoji}</span>
                <span className="whitespace-nowrap">{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- Settings Panel (collapsible) ---- */}
      {showSettings && (
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Grid3X3 className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">Grid Size</span>
              <div className="flex gap-1">
                {([3, 4, 5, 6] as GridSize[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => setGridSize(size)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium ${
                      gridSize === size
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setShowAddSymbol(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-full text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Symbol
            </button>
          </div>
        </div>
      )}

      {/* ---- Symbol Grid ---- */}
      <div className="flex-1 overflow-y-auto p-3">
        {filteredSymbols.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            {activeCategory === 'favorites' ? (
              <>
                <Heart className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">
                  No favorite words yet.
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Long-press any symbol to add it to My Words
                </p>
              </>
            ) : (
              <>
                <p className="text-gray-500 text-sm">No symbols in this category.</p>
                <button
                  onClick={() => {
                    setShowSettings(true);
                    setShowAddSymbol(true);
                    setCustomCategory(activeCategory as AACCategory);
                  }}
                  className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-full text-sm"
                >
                  Add a Symbol
                </button>
              </>
            )}
          </div>
        ) : (
          <div className={`grid ${gridCols} gap-2`}>
            {filteredSymbols.map((symbol) => {
              const meta = CATEGORY_META[symbol.category];
              const isSpeaking = speakingId === symbol.id;
              return (
                <button
                  key={symbol.id}
                  onClick={() => handleSymbolTap(symbol)}
                  onPointerDown={() => handleLongPressStart(symbol.id)}
                  onPointerUp={handleLongPressEnd}
                  onPointerLeave={handleLongPressEnd}
                  className={`
                    relative flex flex-col items-center justify-center
                    rounded-2xl border-3 p-2
                    min-h-[72px] min-w-0
                    transition-transform duration-150
                    ${meta.borderClass}
                    ${isSpeaking ? 'aac-symbol-speaking scale-95' : 'active:scale-95'}
                    bg-white shadow-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-400
                  `}
                  aria-label={`${symbol.label}. ${symbol.phrase}`}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  {symbol.isFavorite && (
                    <Star className="absolute top-1 right-1 w-3 h-3 text-yellow-400 fill-yellow-400" />
                  )}
                  {symbol.customImage ? (
                    <img
                      src={symbol.customImage}
                      alt={symbol.label}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="text-3xl leading-none" role="img" aria-hidden>
                      {symbol.emoji}
                    </span>
                  )}
                  <span className="text-xs font-semibold text-gray-800 mt-1 leading-tight text-center truncate w-full">
                    {symbol.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ---- Long-press Favorite Modal ---- */}
      {longPressId && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6"
          onClick={() => setLongPressId(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const sym = symbols.find((s) => s.id === longPressId);
              if (!sym) return null;
              return (
                <>
                  <div className="flex flex-col items-center mb-4">
                    <span className="text-5xl mb-2">{sym.emoji}</span>
                    <h3 className="text-lg font-semibold">{sym.label}</h3>
                    <p className="text-sm text-gray-500">{sym.phrase}</p>
                  </div>
                  <button
                    onClick={() => toggleFavorite(sym.id)}
                    className={`w-full py-3 rounded-xl text-white font-medium mb-2 ${
                      sym.isFavorite ? 'bg-gray-400' : 'bg-yellow-500'
                    }`}
                  >
                    {sym.isFavorite ? 'Remove from My Words' : 'Add to My Words ⭐'}
                  </button>
                  <button
                    onClick={() => {
                      speak(sym.phrase);
                      setLongPressId(null);
                    }}
                    className="w-full py-3 rounded-xl bg-blue-500 text-white font-medium mb-2"
                  >
                    Speak: &quot;{sym.phrase}&quot;
                  </button>
                  <button
                    onClick={() => setLongPressId(null)}
                    className="w-full py-2 text-gray-500 text-sm"
                  >
                    Cancel
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ---- Add Custom Symbol Modal ---- */}
      {showAddSymbol && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddSymbol(false)}
        >
          <div
            className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Custom Symbol</h3>
              <button
                onClick={() => setShowAddSymbol(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Emoji / Icon
                </label>
                <input
                  type="text"
                  value={customEmoji}
                  onChange={(e) => setCustomEmoji(e.target.value)}
                  placeholder="Paste an emoji (e.g. 🎈)"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-center text-2xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                  maxLength={4}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Label (shown on card)
                </label>
                <input
                  type="text"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="e.g. Grandma"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                  maxLength={20}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Speak Phrase
                </label>
                <input
                  type="text"
                  value={customPhrase}
                  onChange={(e) => setCustomPhrase(e.target.value)}
                  placeholder="e.g. I want to see Grandma"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                  maxLength={80}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Category
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {CATEGORIES.map((cat) => {
                    const meta = CATEGORY_META[cat];
                    return (
                      <button
                        key={cat}
                        onClick={() => setCustomCategory(cat)}
                        className={`px-2 py-1.5 rounded-lg text-xs font-medium ${
                          customCategory === cat
                            ? `${meta.bgClass} text-white`
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {meta.emoji} {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              onClick={handleAddCustomSymbol}
              disabled={!customLabel.trim()}
              className={`w-full mt-4 py-3 rounded-xl text-white font-medium ${
                customLabel.trim()
                  ? 'bg-green-500 active:bg-green-600'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4 inline mr-1" />
              Add Symbol
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AACBoard;
