/**
 * RewardsBoard — Photo-first rewards experience for Aminy Junior
 *
 * ENHANCED FEATURES:
 * 1. Parent uploads child's REAL photos as reward goals (base64 in localStorage)
 * 2. Progress bar fills TOWARD the child's photo
 * 3. Coin-drop sound (Web Audio procedural) on star earning
 * 4. "Photo unlock" animation when reward reached: photo zoom + confetti + celebration sound
 * 5. Star denominations: 1 / 3 / 5 stars
 * 6. History tab: "You earned X stars this month!"
 * 7. Session log integration
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Camera, Flame, Gift, ArrowLeft, Trophy, Sparkles, History, Plus, Minus, Check } from 'lucide-react';
import { playComplete, playTap, playSuccess, haptic } from '../activities/sounds';
import { useRewards } from './useRewards';
import { DailyMission } from './DailyMission';
import type { Mission } from './DailyMission';

// ============================================
// WEB AUDIO: COIN DROP + CELEBRATION
// ============================================

function playCoinDrop(stars: number = 1) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    for (let i = 0; i < Math.min(stars, 5); i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const baseFreq = 1200 + i * 80;
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime + i * 0.12);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, ctx.currentTime + i * 0.12 + 0.18);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.25);
    }
  } catch { /* no audio */ }
}

function playUnlockFanfare() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const melody = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
    melody.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.15;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.2, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.7);
    });
  } catch { /* */ }
}

// ============================================
// TYPES
// ============================================

interface PhotoReward {
  id: string;
  label: string;
  starCost: number;
  photoUrl: string | null;
  redeemed: boolean;
  starValueOverride?: number; // 1, 3, or 5 per earning action
}

interface RewardsBoardProps {
  onBack: () => void;
  onNavigateToActivity?: (category: string) => void;
  dailyMissionSteps?: number;
}

// ============================================
// CONFETTI
// ============================================

function launchConfetti(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  const colors = ['#F59E0B', '#EF4444', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#F97316'];
  const particles: {
    x: number; y: number; vx: number; vy: number;
    color: string; size: number; life: number; rotation: number; rotSpeed: number;
  }[] = [];

  for (let i = 0; i < 120; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 120,
      y: canvas.height * 0.35,
      vx: (Math.random() - 0.5) * 16,
      vy: -Math.random() * 14 - 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 10 + 4,
      life: 1,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
    });
  }

  let animId: number;
  function animate() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of particles) {
      if (p.life <= 0) continue;
      alive = true;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3;
      p.vx *= 0.98;
      p.life -= 0.008;
      p.rotation += p.rotSpeed;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    if (alive) animId = requestAnimationFrame(animate);
  }
  animId = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(animId);
}

// ============================================
// STORAGE
// ============================================

const REWARDS_STORAGE_KEY = 'aminy-jr-photo-rewards-v2';

function loadPhotoRewards(): PhotoReward[] {
  try {
    const raw = localStorage.getItem(REWARDS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [
    { id: 'reward-1', label: 'Special Treat', starCost: 20, photoUrl: null, redeemed: false },
    { id: 'reward-2', label: 'Toy Time', starCost: 35, photoUrl: null, redeemed: false },
    { id: 'reward-3', label: 'Big Outing', starCost: 60, photoUrl: null, redeemed: false },
    { id: 'reward-4', label: 'Dream Prize', starCost: 100, photoUrl: null, redeemed: false },
  ];
}

function savePhotoRewards(rewards: PhotoReward[]) {
  try {
    localStorage.setItem(REWARDS_STORAGE_KEY, JSON.stringify(rewards));
  } catch { /* storage full */ }
}

// ============================================
// PROGRESS RING SVG
// ============================================

function ProgressRing({ progress, size = 96, stroke = 5, color = '#3B82F6' }: {
  progress: number; size?: number; stroke?: number; color?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - Math.min(1, Math.max(0, progress)) * circumference;
  return (
    <svg width={size} height={size} className="absolute inset-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </svg>
  );
}

// ============================================
// STREAK FLAME
// ============================================

function StreakFlame({ streak }: { streak: number }) {
  if (streak <= 0) return null;
  const flameSize = Math.min(72, 32 + streak * 4);
  const intensity = Math.min(1, streak / 14);
  const milestone = streak % 7 === 0 && streak > 0;
  return (
    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center">
      <motion.div
        animate={{ scale: milestone ? [1, 1.3, 1, 1.3, 1] : [1, 1.1, 1], y: [0, -2, 0] }}
        transition={{ duration: milestone ? 0.6 : 0.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{ fontSize: flameSize }}
        className="leading-none"
      >
        🔥
      </motion.div>
      <div className="flex items-center gap-1 mt-1">
        <span className="font-black text-lg"
          style={{ color: intensity > 0.7 ? '#EF4444' : intensity > 0.4 ? '#F97316' : '#F59E0B' }}>
          {streak}
        </span>
        <span className="text-sm font-semibold text-[#5A6B7A]">day streak</span>
      </div>
      {milestone && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-xs font-bold text-amber-600 bg-amber-100 rounded-full px-2 py-0.5 mt-1"
        >
          🎉 {streak}-day milestone!
        </motion.div>
      )}
    </motion.div>
  );
}

// ============================================
// STAR DENOMINATIONS
// ============================================

const STAR_VALUES = [1, 3, 5] as const;
type StarValue = 1 | 3 | 5;

function StarEarner({ onEarn }: { onEarn: (stars: StarValue) => void }) {
  const [flashing, setFlashing] = useState<StarValue | null>(null);
  const handleEarn = (stars: StarValue) => {
    setFlashing(stars);
    playCoinDrop(stars);
    haptic([30, 20, 50]);
    onEarn(stars);
    setTimeout(() => setFlashing(null), 600);
  };
  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4">
      <p className="text-xs font-bold text-[#5A6B7A] mb-3 text-center uppercase tracking-wide">Earn Stars</p>
      <div className="grid grid-cols-3 gap-2">
        {STAR_VALUES.map(val => (
          <motion.button
            key={val}
            whileTap={{ scale: 0.88 }}
            animate={flashing === val ? { scale: [1, 1.2, 1], backgroundColor: ['#FBBF24', '#FDE68A', '#FBBF24'] } : {}}
            onClick={() => handleEarn(val)}
            className="flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all"
            style={{ borderColor: '#FCD34D', background: flashing === val ? '#FDE68A' : 'white' }}
          >
            <div className="flex">
              {Array.from({ length: val }).map((_, i) => (
                <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <span className="text-sm font-bold text-amber-700">
              {val === 1 ? 'Small task' : val === 3 ? 'Hard task' : 'Exceptional!'}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ============================================
// WEEKLY STAR CHART
// ============================================

function WeeklyStarChart({ weeklyData }: { weeklyData: { date: string; stars: number }[] }) {
  const maxStars = Math.max(5, ...weeklyData.map(d => d.stars));
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const today = new Date().getDay();
  const todayIdx = today === 0 ? 6 : today - 1;

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4">
      <h3 className="text-sm font-bold text-[#3A4A57] mb-3 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-500" />
        This Week
      </h3>
      <div className="flex items-end justify-between gap-1.5" style={{ height: 80 }}>
        {weeklyData.map((day, i) => {
          const height = maxStars > 0 ? (day.stars / maxStars) * 60 + 4 : 4;
          const isToday = i === todayIdx;
          return (
            <div key={i} className="flex flex-col items-center flex-1 gap-1">
              {day.stars > 0 && <span className="text-sm font-bold text-[#5A6B7A]">{day.stars}</span>}
              <motion.div
                initial={{ height: 4 }}
                animate={{ height }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="w-full rounded-md"
                style={{
                  background: isToday
                    ? 'linear-gradient(180deg, #F59E0B, #D97706)'
                    : day.stars > 0
                    ? 'linear-gradient(180deg, #93C5FD, #3B82F6)'
                    : '#E5E7EB',
                  minHeight: 4,
                }}
              />
              <span className={`text-sm font-semibold ${isToday ? 'text-amber-600' : 'text-[#8A9BA8]'}`}>
                {dayLabels[i]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// HISTORY TAB
// ============================================

function HistoryTab({ weeklyData, totalStars }: { weeklyData: { date: string; stars: number }[]; totalStars: number }) {
  // Monthly total (use weeklyData as proxy for demo)
  const monthTotal = totalStars;
  const dailyAvg = weeklyData.length > 0
    ? Math.round(weeklyData.reduce((s, d) => s + d.stars, 0) / 7)
    : 0;

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 text-center border border-amber-100">
        <p className="text-xs text-[#5A6B7A] uppercase tracking-wide mb-1">All-time stars</p>
        <div className="flex items-center justify-center gap-2">
          <Star className="w-7 h-7 text-amber-500 fill-amber-500" />
          <span className="text-4xl font-black text-amber-700">{monthTotal}</span>
        </div>
        <p className="text-sm text-amber-600 mt-1">Amazing work! Keep it up!</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/70 rounded-2xl p-3 text-center">
          <p className="text-sm text-[#5A6B7A] mb-1">Daily avg</p>
          <div className="flex items-center justify-center gap-1">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-xl font-bold text-[#3A4A57]">{dailyAvg}</span>
          </div>
        </div>
        <div className="bg-white/70 rounded-2xl p-3 text-center">
          <p className="text-sm text-[#5A6B7A] mb-1">This week</p>
          <div className="flex items-center justify-center gap-1">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-xl font-bold text-[#3A4A57]">
              {weeklyData.reduce((s, d) => s + d.stars, 0)}
            </span>
          </div>
        </div>
      </div>

      <WeeklyStarChart weeklyData={weeklyData} />

      <p className="text-center text-sm text-[#8A9BA8]">Stars are earned by completing activities and missions</p>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function RewardsBoard({ onBack, onNavigateToActivity, dailyMissionSteps = 0 }: RewardsBoardProps) {
  const rewards = useRewards();
  const [photoRewards, setPhotoRewards] = useState<PhotoReward[]>(loadPhotoRewards);
  const [celebrating, setCelebrating] = useState<string | null>(null);
  const [editingReward, setEditingReward] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'rewards' | 'history'>('rewards');
  const [screenFlash, setScreenFlash] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const weeklyData = rewards.getWeeklyStars();

  useEffect(() => { savePhotoRewards(photoRewards); }, [photoRewards]);

  const handlePhotoUpload = useCallback((rewardId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoRewards(prev =>
        prev.map(r => r.id === rewardId ? { ...r, photoUrl: reader.result as string } : r)
      );
    };
    reader.readAsDataURL(file);
    setEditingReward(null);
  }, []);

  const handleEarnStars = useCallback((stars: number) => {
    rewards.earnStars(stars, 'manual-earn');
    setScreenFlash(true);
    setTimeout(() => setScreenFlash(false), 300);
  }, [rewards]);

  const handleRedeem = useCallback((rewardId: string) => {
    const reward = photoRewards.find(r => r.id === rewardId);
    // Guard: can't redeem a missing/already-redeemed reward, or one the child can't afford.
    if (!reward || reward.redeemed || rewards.totalStars < reward.starCost) return;

    // Spend the stars: deduct the reward's cost (does NOT advance the daily streak — redeeming isn't an earning activity).
    rewards.spendStars(reward.starCost, `redeem:${rewardId}`);

    playUnlockFanfare();
    haptic([60, 30, 60, 30, 120]);
    setCelebrating(rewardId);

    if (canvasRef.current) launchConfetti(canvasRef.current);

    setPhotoRewards(prev =>
      prev.map(r => r.id === rewardId ? { ...r, redeemed: true } : r)
    );

    setTimeout(() => setCelebrating(null), 4000);
  }, [photoRewards, rewards]);

  const handleLabelChange = useCallback((rewardId: string, label: string) => {
    setPhotoRewards(prev => prev.map(r => r.id === rewardId ? { ...r, label } : r));
  }, []);

  const handleCostChange = useCallback((rewardId: string, delta: number) => {
    setPhotoRewards(prev =>
      prev.map(r => r.id === rewardId ? { ...r, starCost: Math.max(5, r.starCost + delta) } : r)
    );
  }, []);

  const handleMissionStart = useCallback((mission: Mission) => {
    if (onNavigateToActivity) onNavigateToActivity(mission.category);
  }, [onNavigateToActivity]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
      {/* Confetti canvas overlay */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-40"
        style={{ width: '100%', height: '100%' }} />

      {/* Screen flash on star earn */}
      <AnimatePresence>
        {screenFlash && (
          <motion.div
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 pointer-events-none z-30"
            style={{ background: 'rgba(251,191,36,0.35)' }}
          />
        )}
      </AnimatePresence>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && editingReward) handlePhotoUpload(editingReward, file);
          e.target.value = '';
        }}
      />

      {/* Header */}
      <div className="relative z-10 px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            aria-label="Back"
            className="w-10 h-10 bg-white/70 backdrop-blur-sm rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-amber-700" />
          </motion.button>
          <div>
            <h1 className="text-lg font-bold text-amber-800">Rewards</h1>
            <p className="text-sm text-amber-600">Earn stars, unlock prizes!</p>
          </div>
        </div>

        {/* Star count */}
        <motion.div
          animate={screenFlash ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-1.5 bg-amber-100 rounded-full px-3 py-1.5 border border-amber-200"
        >
          <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          <span className="font-black text-amber-700 text-lg">{rewards.totalStars}</span>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="relative z-10 px-4 mb-3">
        <div className="flex rounded-2xl overflow-hidden bg-white/50 p-1">
          <button
            onClick={() => setActiveTab('rewards')}
            className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: activeTab === 'rewards' ? 'white' : 'transparent',
              color: activeTab === 'rewards' ? '#92400E' : '#9CA3AF',
              boxShadow: activeTab === 'rewards' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}
          >
            <Gift className="w-3.5 h-3.5 inline mr-1" />
            Rewards
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: activeTab === 'history' ? 'white' : 'transparent',
              color: activeTab === 'history' ? '#92400E' : '#9CA3AF',
              boxShadow: activeTab === 'history' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}
          >
            <History className="w-3.5 h-3.5 inline mr-1" />
            History
          </button>
        </div>
      </div>

      <div className="relative z-10 px-4 pb-8 space-y-4">
        <AnimatePresence mode="wait">
          {activeTab === 'rewards' ? (
            <motion.div key="rewards" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
              {/* Streak Flame */}
              {rewards.streak > 0 && (
                <div className="flex justify-center py-2">
                  <StreakFlame streak={rewards.streak} />
                </div>
              )}

              {/* Quick star earn */}
              <StarEarner onEarn={handleEarnStars} />

              {/* Daily Mission Card */}
              <DailyMission completedSteps={dailyMissionSteps} onStartMission={handleMissionStart} />

              {/* Photo Rewards Grid */}
              <div>
                <h2 className="text-sm font-bold text-[#3A4A57] mb-2 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-purple-500" />
                  My Goals
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {photoRewards.map(reward => {
                    const progress = Math.min(1, rewards.totalStars / reward.starCost);
                    const canRedeem = rewards.totalStars >= reward.starCost && !reward.redeemed;
                    const isCelebrating = celebrating === reward.id;

                    return (
                      <motion.div
                        key={reward.id}
                        layout
                        className="relative rounded-3xl overflow-hidden border-2 shadow-md"
                        style={{
                          borderColor: reward.redeemed ? '#6EE7B7' : canRedeem ? '#FCD34D' : '#E5E7EB',
                          background: reward.redeemed ? '#ECFDF5' : '#FFFFFF',
                        }}
                      >
                        {/* Photo/unlock area */}
                        <div
                          className="relative aspect-square flex items-center justify-center bg-[#F6FBFB] cursor-pointer"
                          onClick={() => {
                            if (!reward.photoUrl && !reward.redeemed) {
                              setEditingReward(reward.id);
                              fileInputRef.current?.click();
                            }
                          }}
                        >
                          {reward.photoUrl ? (
                            <>
                              <img
                                src={reward.photoUrl}
                                alt={reward.label}
                                className="w-full h-full object-cover"
                                style={{
                                  opacity: reward.redeemed ? 1 : Math.max(0.4, progress),
                                  filter: reward.redeemed ? 'none' : `blur(${Math.round((1 - progress) * 2)}px)`,
                                  transition: 'opacity 0.5s, filter 0.5s',
                                }}
                              />
                              {/* Progress overlay text */}
                              {!reward.redeemed && (
                                <div className="absolute inset-0 flex items-end justify-center pb-2">
                                  <div className="rounded-full px-2 py-0.5" style={{ background: 'rgba(0,0,0,0.4)' }}>
                                    <span className="text-white text-sm font-bold">
                                      {Math.round(progress * 100)}%
                                    </span>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-[#8A9BA8]">
                              <Camera className="w-8 h-8" />
                              <span className="text-sm font-medium text-center px-2">Tap to add reward photo</span>
                            </div>
                          )}

                          {/* Progress ring overlay */}
                          {!reward.redeemed && reward.photoUrl && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <ProgressRing
                                progress={progress}
                                size={80}
                                stroke={5}
                                color={canRedeem ? '#F59E0B' : '#3B82F6'}
                              />
                            </div>
                          )}

                          {/* Redeemed */}
                          {reward.redeemed && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg"
                            >
                              <Check className="w-4 h-4 text-white" />
                            </motion.div>
                          )}

                          {/* Photo unlock zoom animation */}
                          <AnimatePresence>
                            {isCelebrating && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1.05 }}
                                exit={{ opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                                className="absolute inset-0 flex items-center justify-center"
                                style={{ background: 'rgba(0,0,0,0.2)' }}
                              >
                                <motion.span
                                  animate={{ scale: [1, 1.4, 1], rotate: [0, 10, -10, 0] }}
                                  transition={{ duration: 0.6, repeat: 3 }}
                                  className="text-5xl"
                                >
                                  🎉
                                </motion.span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Reward info */}
                        <div className="p-2.5">
                          <p className="text-sm font-bold text-[#3A4A57] truncate">{reward.label}</p>

                          {/* Progress bar toward photo */}
                          {!reward.redeemed && (
                            <div className="mt-1.5 mb-1.5 h-2 bg-[#EDF4F7] rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress * 100}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className="h-full rounded-full"
                                style={{
                                  background: canRedeem
                                    ? 'linear-gradient(90deg, #F59E0B, #D97706)'
                                    : 'linear-gradient(90deg, #93C5FD, #3B82F6)',
                                }}
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                              <span className="text-sm font-bold text-amber-700">{rewards.totalStars}/{reward.starCost}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {/* Star cost adjustment */}
                              {!reward.redeemed && !canRedeem && (
                                <div className="flex items-center gap-1">
                                  <button onClick={() => handleCostChange(reward.id, -5)}
                                    aria-label="Lower star goal"
                                    className="w-5 h-5 rounded-full bg-[#EDF4F7] flex items-center justify-center">
                                    <Minus className="w-2.5 h-2.5 text-[#5A6B7A]" />
                                  </button>
                                  <button onClick={() => handleCostChange(reward.id, 5)}
                                    aria-label="Raise star goal"
                                    className="w-5 h-5 rounded-full bg-[#EDF4F7] flex items-center justify-center">
                                    <Plus className="w-2.5 h-2.5 text-[#5A6B7A]" />
                                  </button>
                                </div>
                              )}
                              {canRedeem && (
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => handleRedeem(reward.id)}
                                  className="text-xs font-bold text-white px-2 py-0.5 rounded-full shadow-sm"
                                  style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}
                                >
                                  Unlock!
                                </motion.button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Edit photo button */}
                        {reward.photoUrl && !reward.redeemed && (
                          <button
                            onClick={() => { setEditingReward(reward.id); fileInputRef.current?.click(); }}
                            aria-label="Change reward photo"
                            className="absolute top-1.5 right-1.5 w-6 h-6 bg-white/80 rounded-full flex items-center justify-center shadow-sm"
                          >
                            <Camera className="w-3 h-3 text-[#5A6B7A]" />
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <HistoryTab weeklyData={weeklyData} totalStars={rewards.totalStars} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default RewardsBoard;
