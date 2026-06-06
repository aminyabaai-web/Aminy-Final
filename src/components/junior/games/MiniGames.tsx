// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Mini-Games for Ease
 *
 * Unlike Tappy's pure-fun games, our games are designed to:
 * 1. Be genuinely fun and addictive
 * 2. Generate clinical data (reaction time, pattern recognition, memory)
 * 3. Map to developmental domains (cognitive, motor, social, executive function)
 * 4. Adapt difficulty based on child's performance
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Star, Trophy, Zap, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playTap, playSuccess, playComplete, haptic } from '../activities/sounds';

// ============================================================================
// Types
// ============================================================================

interface GameProps {
  onBack: () => void;
  onComplete?: (data: GameResult) => void;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface GameResult {
  game: string;
  score: number;
  accuracy: number; // 0-100
  avgReactionTimeMs: number;
  duration: number; // seconds
  difficulty: string;
  domain: string; // cognitive, motor, executive, etc.
}

interface GameCard {
  id: string;
  name: string;
  emoji: string;
  description: string;
  domain: string;
  gradient: string;
}

// ============================================================================
// Game Library Browser
// ============================================================================

const GAMES: GameCard[] = [
  { id: 'color-match', name: 'Color Match', emoji: '🎨', description: 'Tap the matching color!', domain: 'cognitive', gradient: 'from-pink-400 to-purple-500' },
  { id: 'pattern-memory', name: 'Memory Flash', emoji: '🧠', description: 'Remember the pattern', domain: 'cognitive', gradient: 'from-blue-400 to-indigo-500' },
  { id: 'speed-tap', name: 'Speed Tap', emoji: '⚡', description: 'Tap as fast as you can!', domain: 'motor', gradient: 'from-amber-400 to-orange-500' },
  { id: 'sequence-follow', name: 'Copy Cat', emoji: '🐱', description: 'Repeat the sequence', domain: 'executive', gradient: 'from-green-400 to-teal-500' },
  { id: 'emotion-match', name: 'Feelings Match', emoji: '😊', description: 'Match the emotions', domain: 'social', gradient: 'from-rose-400 to-pink-500' },
  { id: 'counting', name: 'Count Stars', emoji: '⭐', description: 'How many do you see?', domain: 'cognitive', gradient: 'from-yellow-400 to-amber-500' },
];

export function GameLibrary({ onSelectGame, onBack }: { onSelectGame: (id: string) => void; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-blue-900 p-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
          <ArrowLeft size={20} className="text-white" />
        </button>
        <h1 className="text-2xl font-bold text-white">Arcade</h1>
        <Trophy size={24} className="text-amber-400 ml-auto" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {GAMES.map((game, i) => (
          <motion.button
            key={game.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            onClick={() => { playTap(); haptic(25); onSelectGame(game.id); }}
            className={`bg-gradient-to-br ${game.gradient} rounded-2xl p-4 text-left shadow-lg`}
          >
            <div className="text-3xl mb-2">{game.emoji}</div>
            <div className="text-white font-bold text-sm">{game.name}</div>
            <div className="text-white/70 text-xs mt-0.5">{game.description}</div>
            <div className="mt-2 bg-white/20 rounded-full px-2 py-0.5 inline-block">
              <span className="text-white/80 text-xs">{game.domain}</span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Game 1: Color Match
// ============================================================================

const COLORS = [
  { name: 'Red', hex: '#EF4444', bg: 'bg-red-500' },
  { name: 'Blue', hex: '#3B82F6', bg: 'bg-blue-500' },
  { name: 'Green', hex: '#22C55E', bg: 'bg-green-500' },
  { name: 'Yellow', hex: '#EAB308', bg: 'bg-yellow-500' },
  { name: 'Purple', hex: '#A855F7', bg: 'bg-purple-500' },
  { name: 'Orange', hex: '#F97316', bg: 'bg-orange-500' },
];

export function ColorMatchGame({ onBack, onComplete, difficulty = 'easy' }: GameProps) {
  const [targetColor, setTargetColor] = useState(0);
  const [options, setOptions] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [roundStart, setRoundStart] = useState(Date.now());
  const [gameStart] = useState(Date.now());
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const maxRounds = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 15 : 20;
  const optionCount = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 6;

  const nextRound = useCallback(() => {
    const target = Math.floor(Math.random() * COLORS.length);
    const opts = [target];
    while (opts.length < optionCount) {
      const r = Math.floor(Math.random() * COLORS.length);
      if (!opts.includes(r)) opts.push(r);
    }
    // Shuffle
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    setTargetColor(target);
    setOptions(opts);
    setRoundStart(Date.now());
    setFeedback(null);
  }, [optionCount]);

  useEffect(() => { nextRound(); }, [nextRound]);

  const handleTap = (colorIdx: number) => {
    const rt = Date.now() - roundStart;
    setReactionTimes(prev => [...prev, rt]);
    haptic(25);

    if (colorIdx === targetColor) {
      playSuccess();
      setScore(s => s + Math.max(10, 100 - Math.floor(rt / 50)));
      setCorrect(c => c + 1);
      setFeedback('correct');
    } else {
      setFeedback('wrong');
    }

    setTimeout(() => {
      if (round + 1 >= maxRounds) {
        const avgRt = reactionTimes.length > 0 ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length) : 0;
        playComplete();
        haptic([60, 30, 60, 30, 120]);
        onComplete?.({
          game: 'color-match',
          score: score + (colorIdx === targetColor ? 100 : 0),
          accuracy: Math.round(((correct + (colorIdx === targetColor ? 1 : 0)) / maxRounds) * 100),
          avgReactionTimeMs: avgRt,
          duration: Math.round((Date.now() - gameStart) / 1000),
          difficulty,
          domain: 'cognitive',
        });
      } else {
        setRound(r => r + 1);
        nextRound();
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-100 flex flex-col">
      <div className="flex items-center justify-between p-4">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <div className="text-sm font-medium text-[#5A6B7A]">Round {round + 1}/{maxRounds}</div>
          <div className="flex items-center gap-1">
            <Star size={14} className="text-amber-500" />
            <span className="font-bold text-[#1B2733]">{score}</span>
          </div>
        </div>
        <div className="w-10" />
      </div>

      {/* Progress bar */}
      <div className="mx-4 h-2 bg-white/50 rounded-full overflow-hidden">
        <motion.div className="h-full bg-purple-500 rounded-full" animate={{ width: `${((round + 1) / maxRounds) * 100}%` }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <p className="text-lg font-medium text-[#3A4A57] mb-4">Tap the color:</p>
        <motion.div
          key={round}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-4xl font-bold mb-8"
          style={{ color: COLORS[targetColor]?.hex }}
        >
          {COLORS[targetColor]?.name}
        </motion.div>

        <div className={`grid gap-4 ${optionCount <= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {options.map((colorIdx, i) => (
            <motion.button
              key={`${round}-${i}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => handleTap(colorIdx)}
              className="w-20 h-20 rounded-2xl shadow-lg"
              style={{ backgroundColor: COLORS[colorIdx]?.hex, minHeight: 44, minWidth: 44 }}
            />
          ))}
        </div>

        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mt-6 text-2xl font-bold ${feedback === 'correct' ? 'text-green-500' : 'text-red-400'}`}
            >
              {feedback === 'correct' ? '✓ Great!' : '✗ Try again!'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================================================
// Game 2: Pattern Memory (Simon-style)
// ============================================================================

export function PatternMemoryGame({ onBack, onComplete, difficulty = 'easy' }: GameProps) {
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerInput, setPlayerInput] = useState<number[]>([]);
  const [isShowingPattern, setIsShowingPattern] = useState(false);
  const [activeButton, setActiveButton] = useState<number | null>(null);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStart] = useState(Date.now());
  const reactionTimes = useRef<number[]>([]);
  const inputStart = useRef(Date.now());

  const padColors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500'];
  const padFreqs = [262, 330, 392, 523]; // C4, E4, G4, C5

  const playPadSound = (idx: number) => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = padFreqs[idx];
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch { /* no audio */ }
  };

  const startNewRound = useCallback(() => {
    const newStep = Math.floor(Math.random() * 4);
    setSequence(prev => {
      const newSeq = [...prev, newStep];
      // Show the pattern
      setIsShowingPattern(true);
      setPlayerInput([]);
      let i = 0;
      const showNext = () => {
        if (i < newSeq.length) {
          setActiveButton(newSeq[i]);
          playPadSound(newSeq[i]);
          haptic(25);
          setTimeout(() => {
            setActiveButton(null);
            i++;
            setTimeout(showNext, 300);
          }, 500);
        } else {
          setIsShowingPattern(false);
          inputStart.current = Date.now();
        }
      };
      setTimeout(showNext, 500);
      return newSeq;
    });
  }, []);

  useEffect(() => { startNewRound(); }, []);

  const handlePadTap = (idx: number) => {
    if (isShowingPattern || gameOver) return;

    const rt = Date.now() - inputStart.current;
    reactionTimes.current.push(rt);
    inputStart.current = Date.now();

    playPadSound(idx);
    haptic(25);
    setActiveButton(idx);
    setTimeout(() => setActiveButton(null), 200);

    const newInput = [...playerInput, idx];
    setPlayerInput(newInput);

    const currentStep = newInput.length - 1;
    if (sequence[currentStep] !== idx) {
      // Wrong!
      setGameOver(true);
      haptic([100, 50, 100]);
      const avgRt = reactionTimes.current.length > 0
        ? Math.round(reactionTimes.current.reduce((a, b) => a + b, 0) / reactionTimes.current.length)
        : 0;
      onComplete?.({
        game: 'pattern-memory',
        score,
        accuracy: Math.round(((level - 1) / Math.max(level, 1)) * 100),
        avgReactionTimeMs: avgRt,
        duration: Math.round((Date.now() - gameStart) / 1000),
        difficulty,
        domain: 'cognitive',
      });
      return;
    }

    if (newInput.length === sequence.length) {
      // Completed the sequence!
      playSuccess();
      setScore(s => s + level * 10);
      setLevel(l => l + 1);
      setTimeout(() => startNewRound(), 1000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-indigo-900 flex flex-col">
      <div className="flex items-center justify-between p-4">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
          <ArrowLeft size={20} className="text-white" />
        </button>
        <div className="text-center text-white">
          <div className="text-sm">Level {level}</div>
          <div className="flex items-center gap-1">
            <Star size={14} className="text-amber-400" />
            <span className="font-bold">{score}</span>
          </div>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {isShowingPattern && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-white text-lg font-medium mb-8"
          >
            Watch the pattern...
          </motion.p>
        )}
        {!isShowingPattern && !gameOver && (
          <p className="text-white text-lg font-medium mb-8">Your turn!</p>
        )}

        <div className="grid grid-cols-2 gap-4">
          {padColors.map((color, i) => (
            <motion.button
              key={i}
              animate={{
                scale: activeButton === i ? 1.1 : 1,
                opacity: activeButton === i ? 1 : 0.6,
              }}
              onClick={() => handlePadTap(i)}
              className={`w-28 h-28 rounded-2xl ${color} shadow-lg`}
              style={{ minHeight: 44, minWidth: 44 }}
              disabled={isShowingPattern || gameOver}
            />
          ))}
        </div>

        {gameOver && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 text-center"
          >
            <p className="text-white text-xl font-bold mb-2">Game Over!</p>
            <p className="text-white/70 mb-4">You reached level {level} with {score} points</p>
            <button
              onClick={() => { setGameOver(false); setSequence([]); setLevel(1); setScore(0); startNewRound(); }}
              className="bg-white/20 text-white px-6 py-3 rounded-full font-medium flex items-center gap-2 mx-auto"
            >
              <RotateCcw size={18} /> Play Again
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Game 3: Speed Tap
// ============================================================================

export function SpeedTapGame({ onBack, onComplete, difficulty = 'easy' }: GameProps) {
  const [taps, setTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(difficulty === 'easy' ? 10 : difficulty === 'medium' ? 15 : 20);
  const [isRunning, setIsRunning] = useState(false);
  const [gameStart, setGameStart] = useState(0);
  const [bestTap, setBestTap] = useState(Infinity);
  const lastTap = useRef(0);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timer);
          setIsRunning(false);
          playComplete();
          haptic([60, 30, 60, 30, 120]);
          onComplete?.({
            game: 'speed-tap',
            score: taps,
            accuracy: 100,
            avgReactionTimeMs: taps > 0 ? Math.round(((Date.now() - gameStart) / taps)) : 0,
            duration: difficulty === 'easy' ? 10 : difficulty === 'medium' ? 15 : 20,
            difficulty,
            domain: 'motor',
          });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  const handleTap = () => {
    if (!isRunning) {
      setIsRunning(true);
      setGameStart(Date.now());
      lastTap.current = Date.now();
    }
    if (timeLeft <= 0) return;

    const now = Date.now();
    const interval = now - lastTap.current;
    if (interval > 0 && interval < bestTap) setBestTap(interval);
    lastTap.current = now;

    setTaps(t => t + 1);
    playTap();
    haptic(15);
  };

  const tapsPerSecond = isRunning && gameStart > 0
    ? (taps / Math.max(1, (Date.now() - gameStart) / 1000)).toFixed(1)
    : '0.0';

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-100 to-orange-100 flex flex-col">
      <div className="flex items-center justify-between p-4">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center">
          <ArrowLeft size={20} />
        </button>
        <div className="text-4xl font-bold text-orange-600">{timeLeft}s</div>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="text-6xl font-bold text-[#1B2733] mb-2">{taps}</div>
        <div className="text-sm text-[#5A6B7A] mb-8">{tapsPerSecond} taps/sec</div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleTap}
          className="w-40 h-40 rounded-full bg-gradient-to-br from-orange-400 to-red-500 shadow-2xl flex items-center justify-center"
          style={{ minHeight: 44, minWidth: 44 }}
        >
          <Zap size={48} className="text-white" />
        </motion.button>

        {!isRunning && taps === 0 && (
          <p className="text-[#5A6B7A] mt-6 text-sm">Tap to start!</p>
        )}

        {!isRunning && taps > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-center">
            <p className="text-2xl font-bold text-[#1B2733]">Final: {taps} taps!</p>
            <button
              onClick={() => { setTaps(0); setTimeLeft(difficulty === 'easy' ? 10 : 15); setBestTap(Infinity); }}
              className="mt-3 bg-orange-500 text-white px-6 py-2 rounded-full font-medium flex items-center gap-2 mx-auto"
            >
              <RotateCcw size={16} /> Again
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Game 4: Emotion Match (Feelings Memory)
// ============================================================================

const EMOTION_PAIRS = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😡', label: 'Angry' },
  { emoji: '😰', label: 'Worried' },
  { emoji: '😌', label: 'Calm' },
  { emoji: '🤩', label: 'Excited' },
];

export function EmotionMatchGame({ onBack, onComplete, difficulty = 'easy' }: GameProps) {
  const pairCount = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 6 : 8;
  const pairs = EMOTION_PAIRS.slice(0, Math.min(pairCount, EMOTION_PAIRS.length));

  const [cards, setCards] = useState<{ id: number; emoji: string; label: string; flipped: boolean; matched: boolean }[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [matches, setMatches] = useState(0);
  const [moves, setMoves] = useState(0);
  const [gameStart] = useState(Date.now());
  const reactionTimes = useRef<number[]>([]);
  const lastFlip = useRef(Date.now());

  useEffect(() => {
    // Create pairs and shuffle
    const deck = pairs.flatMap((p, i) => [
      { id: i * 2, emoji: p.emoji, label: p.label, flipped: false, matched: false },
      { id: i * 2 + 1, emoji: p.emoji, label: p.label, flipped: false, matched: false },
    ]);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    setCards(deck);
  }, []);

  const handleFlip = (id: number) => {
    if (flippedIds.length >= 2) return;
    const card = cards.find(c => c.id === id);
    if (!card || card.flipped || card.matched) return;

    const rt = Date.now() - lastFlip.current;
    reactionTimes.current.push(rt);
    lastFlip.current = Date.now();

    playTap();
    haptic(20);

    const newFlipped = [...flippedIds, id];
    setFlippedIds(newFlipped);
    setCards(prev => prev.map(c => c.id === id ? { ...c, flipped: true } : c));

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [first, second] = newFlipped;
      const c1 = cards.find(c => c.id === first)!;
      const c2 = cards.find(c => c.id === second)!;

      if (c1.emoji === (id === second ? card : c2).emoji && c1.id !== (id === second ? id : c2.id)) {
        // Match!
        setTimeout(() => {
          playSuccess();
          haptic(30);
          setCards(prev => prev.map(c =>
            c.emoji === c1.emoji ? { ...c, matched: true, flipped: true } : c
          ));
          setMatches(m => {
            const newMatches = m + 1;
            if (newMatches >= pairs.length) {
              playComplete();
              const avgRt = reactionTimes.current.length > 0
                ? Math.round(reactionTimes.current.reduce((a, b) => a + b, 0) / reactionTimes.current.length)
                : 0;
              onComplete?.({
                game: 'emotion-match',
                score: Math.max(0, 1000 - moves * 20),
                accuracy: Math.round((pairs.length / Math.max(moves + 1, 1)) * 100),
                avgReactionTimeMs: avgRt,
                duration: Math.round((Date.now() - gameStart) / 1000),
                difficulty,
                domain: 'social',
              });
            }
            return newMatches;
          });
          setFlippedIds([]);
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            newFlipped.includes(c.id) && !c.matched ? { ...c, flipped: false } : c
          ));
          setFlippedIds([]);
        }, 800);
      }
    }
  };

  const cols = cards.length <= 8 ? 2 : cards.length <= 12 ? 3 : 4;

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-100 to-pink-100 flex flex-col">
      <div className="flex items-center justify-between p-4">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <div className="text-sm text-[#5A6B7A]">Matches: {matches}/{pairs.length}</div>
          <div className="text-xs text-[#8A9BA8]">Moves: {moves}</div>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {cards.map(card => (
            <motion.button
              key={card.id}
              onClick={() => handleFlip(card.id)}
              animate={{ rotateY: card.flipped ? 0 : 180 }}
              transition={{ duration: 0.3 }}
              className={`w-16 h-20 rounded-xl flex items-center justify-center text-2xl shadow-md ${
                card.matched ? 'bg-green-100 border-2 border-green-300' :
                card.flipped ? 'bg-white' : 'bg-gradient-to-br from-pink-400 to-rose-500'
              }`}
              style={{ minHeight: 44, minWidth: 44 }}
              disabled={card.matched}
            >
              {(card.flipped || card.matched) ? card.emoji : '❓'}
            </motion.button>
          ))}
        </div>
      </div>

      {matches >= pairs.length && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 text-center"
        >
          <p className="text-2xl font-bold text-[#1B2733] mb-1">All Matched!</p>
          <p className="text-[#5A6B7A] text-sm">Completed in {moves} moves</p>
        </motion.div>
      )}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export { GAMES };
export type { GameProps, GameResult, GameCard };
