/**
 * TokenRewardsBoard - 10/10 Apple/Calm Aesthetic
 *
 * This component fulfills Phase 4 of the MVP:
 * - Complete the token economy (Stars for rewards)
 * - Wire the communication bridge (Junior reports behaviors back to Parent AI)
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    ArrowLeft,
    Star,
    Gift,
    Sparkles,
    Gamepad2,
    Tv,
    Music,
    IceCream,
    CheckCircle2,
    Camera,
    Plus,
    Clock,
    X
} from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import connectorHub, { connectorActions } from '../lib/connector-hub';

const fontStack = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", "Helvetica Neue", Arial, "Noto Sans", sans-serif';

const fontSmoothing: React.CSSProperties = {
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
    textRendering: 'geometricPrecision',
    fontFamily: fontStack,
} as React.CSSProperties;

interface RewardItem {
    id: string;
    name: string;
    cost: number;
    icon: React.ReactNode;
    color: string;
    photoUrl?: string;       // parent-uploaded photo of the actual reward
    isCustom?: boolean;      // added by parent via camera
    needsApproval?: boolean; // custom rewards require parent sign-off
}

interface PendingRedemption {
    rewardId: string;
    rewardName: string;
    timestamp: number;
    approved: boolean;
}

interface TokenRewardsBoardProps {
    onBack: () => void;
    availableTokens: number;
    onSpendTokens: (amount: number) => void;
    childName?: string;
    isParentView?: boolean; // set true when parent is viewing to show approval controls
    /**
     * localStorage key used to persist the child's star balance when the parent
     * does not supply a positive `availableTokens` value. This keeps the rewards
     * economy functional (redeemable + decrementing) when the screen is mounted
     * standalone, while always deferring to a real `availableTokens` when one is
     * passed (e.g. from the Junior page). Defaults to 'aminy-star-balance'.
     */
    persistKey?: string;
}

/**
 * Starter balance for the self-persisted fallback. Only used the very first time
 * the standalone screen renders without a real `availableTokens` source, so the
 * reward economy is explorable instead of permanently stuck at 0.
 */
const FALLBACK_STARTER_BALANCE = 30;

export function TokenRewardsBoard({ onBack, availableTokens, onSpendTokens, childName = "your child", isParentView = false, persistKey = 'aminy-star-balance' }: TokenRewardsBoardProps) {
    // When a real token source is supplied, it always wins. Otherwise fall back
    // to a locally-persisted balance so redemptions actually work and survive
    // reloads instead of being permanently disabled at 0.
    //
    // We latch ownership: once a positive `availableTokens` has ever been seen,
    // the parent is treated as the authoritative owner for the rest of this mount
    // — so a child spending down to exactly 0 (e.g. on the Junior page) keeps
    // showing the real 0 rather than snapping back to the local fallback.
    const ownedByParentRef = useRef(typeof availableTokens === 'number' && availableTokens > 0);
    if (typeof availableTokens === 'number' && availableTokens > 0) {
        ownedByParentRef.current = true;
    }
    const hasExternalBalance = ownedByParentRef.current;
    const [localBalance, setLocalBalance] = useState<number>(() => {
        try {
            const stored = localStorage.getItem(persistKey);
            if (stored !== null) {
                const parsed = parseInt(stored, 10);
                if (!Number.isNaN(parsed) && parsed >= 0) return parsed;
            }
        } catch { /* ignore storage errors */ }
        return FALLBACK_STARTER_BALANCE;
    });
    const effectiveTokens = hasExternalBalance ? availableTokens : localBalance;
    // Never show the literal "your child" placeholder as if it were a name.
    // Use the real kid's name when supplied, else drop the name entirely.
    const safeChildName =
        !childName || !childName.trim() || childName.trim().toLowerCase() === 'your child'
            ? ''
            : childName.trim();
    const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [redeemedReward, setRedeemedReward] = useState<RewardItem | null>(null);
    const [showAddReward, setShowAddReward] = useState(false);
    const [newRewardName, setNewRewardName] = useState('');
    const [newRewardCost, setNewRewardCost] = useState('10');
    const [newRewardPhoto, setNewRewardPhoto] = useState<string | null>(null);
    const [customRewards, setCustomRewards] = useState<RewardItem[]>(() => {
        try {
            return JSON.parse(localStorage.getItem('aminy-custom-rewards') || '[]');
        } catch { return []; }
    });
    const [pendingRedemptions, setPendingRedemptions] = useState<PendingRedemption[]>(() => {
        try {
            return JSON.parse(localStorage.getItem('aminy-pending-redemptions') || '[]');
        } catch { return []; }
    });
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const rewards: RewardItem[] = [
        { id: 'screen_time', name: '15 Min Extra Play', cost: 10, icon: <Gamepad2 size={32} />, color: 'from-blue-400 to-indigo-500' },
        { id: 'movie_pick', name: 'Choose Movie Night', cost: 25, icon: <Tv size={32} />, color: 'from-purple-400 to-pink-500' },
        { id: 'dance_party', name: 'Dance Party', cost: 5, icon: <Music size={32} />, color: 'from-emerald-400 to-teal-500' },
        { id: 'special_treat', name: 'Special Treat', cost: 15, icon: <IceCream size={32} />, color: 'from-pink-400 to-rose-500' },
    ];

    const handleCapurePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            setNewRewardPhoto(ev.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleAddCustomReward = () => {
        if (!newRewardName.trim()) { toast.error('Enter a reward name'); return; }
        const cost = parseInt(newRewardCost) || 10;
        const newReward: RewardItem = {
            id: `custom-${Date.now()}`,
            name: newRewardName.trim(),
            cost,
            icon: newRewardPhoto ? null : <Gift size={32} />,
            color: 'from-amber-400 to-orange-500',
            photoUrl: newRewardPhoto ?? undefined,
            isCustom: true,
            needsApproval: true,
        };
        const updated = [...customRewards, newReward];
        setCustomRewards(updated);
        localStorage.setItem('aminy-custom-rewards', JSON.stringify(updated.map(r => ({ ...r, icon: null }))));
        setNewRewardName('');
        setNewRewardCost('10');
        setNewRewardPhoto(null);
        setShowAddReward(false);
        toast.success(`Added "${newReward.name}" to rewards!`);
    };

    const handleRedeem = (reward: RewardItem) => {
        if (effectiveTokens < reward.cost) {
            // Gentle nudge, never a shame-y error — kids see this
            toast(`Almost there! ${reward.cost - effectiveTokens} more ⭐ for ${reward.name}.`);
            if (window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate([50, 50, 50]);
            }
            return;
        }

        setIsProcessing(true);

        setTimeout(() => {
            // Always notify the owner (e.g. the Junior page) so a real balance
            // updates. When no external balance is supplied, also decrement and
            // persist the local fallback so the spend actually sticks.
            onSpendTokens(reward.cost);
            if (!hasExternalBalance) {
                setLocalBalance((prev) => {
                    const next = Math.max(0, prev - reward.cost);
                    try { localStorage.setItem(persistKey, String(next)); } catch { /* ignore */ }
                    return next;
                });
            }

            if (reward.needsApproval) {
                // Custom reward — needs parent sign-off before delivery
                const pending: PendingRedemption = {
                    rewardId: reward.id,
                    rewardName: reward.name,
                    timestamp: Date.now(),
                    approved: false,
                };
                const updated = [...pendingRedemptions, pending];
                setPendingRedemptions(updated);
                localStorage.setItem('aminy-pending-redemptions', JSON.stringify(updated));
                connectorHub.publish('jr.milestone.reached', {
                    childId: childName.toLowerCase(),
                    type: 'reward_pending_approval',
                    rewardId: reward.id,
                    rewardName: reward.name,
                    value: reward.cost,
                    requiresParentApproval: true,
                }, 'rewards-board');
            } else {
                // Built-in reward — immediate
                connectorHub.publish('jr.milestone.reached', {
                    childId: childName.toLowerCase(),
                    type: 'reward_redeemed',
                    rewardId: reward.id,
                    value: reward.cost,
                }, 'rewards-board');
            }

            setRedeemedReward(reward);
            setIsProcessing(false);

            if (window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate([100, 50, 200]);
            }
        }, 800);
    };

    const handleParentApprove = (rewardId: string) => {
        const updated = pendingRedemptions.map(r =>
            r.rewardId === rewardId ? { ...r, approved: true } : r
        );
        setPendingRedemptions(updated);
        localStorage.setItem('aminy-pending-redemptions', JSON.stringify(updated));
        toast.success('Reward approved! Your child can enjoy it now.');
        if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate([100]);
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#F8F8F6', paddingBottom: '80px', ...fontSmoothing }}>

            {/* Header */}
            <div style={{
                position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'rgba(248, 248, 246, 0.85)',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(17, 24, 39, 0.04)'
            }}>
                <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            onClick={onBack}
                            aria-label="Go back"
                            style={{
                                width: '44px', height: '44px', borderRadius: '22px', border: 'none', backgroundColor: '#FFFFFF',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                            }}
                        >
                            <ArrowLeft size={18} color="rgba(17, 24, 39, 0.7)" />
                        </button>
                        <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'rgba(17, 24, 39, 0.9)', letterSpacing: '-0.01em' }}>
                            Rewards Shop
                        </h1>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 20px' }}>

                {/* Token Balance Card */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    style={{ backgroundColor: '#111827', borderRadius: '32px', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '40px', position: 'relative', overflow: 'hidden' }}
                >
                    <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.1 }}>
                        <Star size={180} fill="#FCD34D" color="#FCD34D" />
                    </div>
                    <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', zIndex: 1 }}>My Star Bank</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1 }}>
                        <Star size={40} fill="#FCD34D" color="#FCD34D" />
                        <span style={{ fontSize: '64px', fontWeight: 700, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' }}>
                            {effectiveTokens}
                        </span>
                    </div>
                    <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '8px', zIndex: 1, textAlign: 'center' }}>
                        {safeChildName ? `You're doing great, ${safeChildName}!` : "You're doing great!"} You can spend your stars on fun rewards.
                    </p>
                </motion.div>

                {/* Rewards Grid */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>Available Rewards</h3>
                    {isParentView && (
                        <button
                            onClick={() => setShowAddReward(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#0D1B2A', color: '#FFF', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
                        >
                            <Camera size={16} />
                            Add Reward
                        </button>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
                    {[...rewards, ...customRewards.map(r => ({ ...r, icon: r.icon || <Gift size={32} /> }))].map(reward => {
                        const canAfford = effectiveTokens >= reward.cost;
                        return (
                            <motion.button
                                key={reward.id}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setSelectedReward(reward)}
                                className="bg-white dark:bg-slate-800"
                                style={{
                                    borderRadius: '24px', padding: '20px',
                                    border: '2px solid ' + (selectedReward?.id === reward.id ? '#3B82F6' : 'transparent'),
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)', cursor: 'pointer',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                                    opacity: canAfford ? 1 : 0.6,
                                    transition: 'all 0.2s',
                                    position: 'relative'
                                }}
                            >
                                {/* Photo or icon */}
                                {reward.photoUrl ? (
                                    <div style={{ width: '72px', height: '72px', borderRadius: '20px', overflow: 'hidden', flexShrink: 0 }}>
                                        <img src={reward.photoUrl} alt={reward.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                ) : (
                                    <div style={{ width: '64px', height: '64px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }} className={'bg-gradient-to-br ' + reward.color}>
                                        {reward.icon}
                                    </div>
                                )}
                                <div style={{ textAlign: 'center' }}>
                                    <p className="text-[#111827] dark:text-slate-100" style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{reward.name}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: canAfford ? '#059669' : '#8A9BA8' }}>{reward.cost}</span>
                                        <Star size={12} fill={canAfford ? '#10B981' : '#C0CBD4'} color={canAfford ? '#10B981' : '#C0CBD4'} />
                                    </div>
                                    {reward.needsApproval && (
                                        <p style={{ fontSize: '10px', color: '#92400E', marginTop: '2px' }}>Parent approves</p>
                                    )}
                                </div>
                            </motion.button>
                        );
                    })}
                </div>

                {/* Parent approval queue */}
                {isParentView && pendingRedemptions.filter(r => !r.approved).length > 0 && (
                    <div style={{ marginTop: '32px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#92400E', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={16} />
                            Waiting for Your Approval
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {pendingRedemptions.filter(r => !r.approved).map(pending => (
                                <div key={`${pending.rewardId}-${pending.timestamp}`} style={{ backgroundColor: '#FEF3C7', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <p style={{ fontSize: '14px', fontWeight: 600, color: '#92400E' }}>{safeChildName || 'Your child'} wants: {pending.rewardName}</p>
                                        <p style={{ fontSize: '12px', color: '#B45309' }}>{new Date(pending.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                    <button
                                        onClick={() => handleParentApprove(pending.rewardId)}
                                        style={{ padding: '8px 16px', backgroundColor: '#059669', color: '#FFF', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                                    >
                                        Approve
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>

            {/* Hidden camera input */}
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleCapurePhoto}
            />

            {/* Add Custom Reward Modal */}
            <AnimatePresence>
                {showAddReward && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
                        onClick={() => setShowAddReward(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ backgroundColor: '#FFFFFF', borderRadius: '32px', padding: '28px', maxWidth: '360px', width: '100%' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>Add Custom Reward</h2>
                                <button onClick={() => setShowAddReward(false)} aria-label="Close" style={{ padding: '6px', borderRadius: '8px', border: 'none', backgroundColor: '#F3F4F6', cursor: 'pointer' }}>
                                    <X size={16} color="#6B7280" />
                                </button>
                            </div>

                            {/* Photo picker */}
                            <div
                                onClick={() => cameraInputRef.current?.click()}
                                style={{ width: '100%', height: '140px', borderRadius: '20px', border: '2px dashed #D1D5DB', backgroundColor: '#F9FAFB', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginBottom: '16px', overflow: 'hidden' }}
                            >
                                {newRewardPhoto ? (
                                    <img src={newRewardPhoto} alt="Reward preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <>
                                        <Camera size={28} color="#9CA3AF" />
                                        <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '8px' }}>Tap to take or upload photo</p>
                                    </>
                                )}
                            </div>

                            <input
                                type="text"
                                placeholder="Reward name (e.g. Ice cream trip)"
                                value={newRewardName}
                                onChange={(e) => setNewRewardName(e.target.value)}
                                style={{ width: '100%', padding: '12px 16px', borderRadius: '14px', border: '1.5px solid #E5E7EB', fontSize: '14px', marginBottom: '12px', outline: 'none', boxSizing: 'border-box' }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                                <label style={{ fontSize: '13px', color: '#6B7280', whiteSpace: 'nowrap' }}>Star cost:</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={newRewardCost}
                                    onChange={(e) => setNewRewardCost(e.target.value)}
                                    style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '14px', outline: 'none' }}
                                />
                                <Star size={16} fill="#FCD34D" color="#FCD34D" />
                            </div>

                            <Button
                                onClick={handleAddCustomReward}
                                style={{ width: '100%', borderRadius: '16px', backgroundColor: '#0D1B2A', padding: '14px 0', fontSize: '15px' }}
                            >
                                Add to Rewards Board
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Redemption Confirmation Modal */}
            <AnimatePresence>
                {selectedReward && !redeemedReward && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
                        onClick={() => setSelectedReward(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ backgroundColor: '#FFFFFF', borderRadius: '32px', padding: '32px', maxWidth: '360px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
                        >
                            {selectedReward.photoUrl ? (
                                <div style={{ width: '80px', height: '80px', borderRadius: '24px', overflow: 'hidden', marginBottom: '24px' }}>
                                    <img src={selectedReward.photoUrl} alt={selectedReward.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            ) : (
                                <div style={{ width: '80px', height: '80px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', marginBottom: '24px' }} className={'bg-gradient-to-br ' + selectedReward.color}>
                                    {selectedReward.icon}
                                </div>
                            )}
                            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Get {selectedReward.name}?</h2>
                            <p style={{ fontSize: '15px', color: '#6B7280', marginBottom: '24px' }}>
                                This will cost <strong style={{ color: '#111827' }}>{selectedReward.cost}</strong> stars. You have <strong style={{ color: '#059669' }}>{effectiveTokens}</strong> stars right now.
                            </p>

                            <div style={{ width: '100%', display: 'flex', gap: '12px' }}>
                                <Button variant="outline" onClick={() => setSelectedReward(null)} style={{ flex: 1, borderRadius: '16px' }} disabled={isProcessing}>
                                    Cancel
                                </Button>
                                <Button onClick={() => handleRedeem(selectedReward)} style={{ flex: 1, borderRadius: '16px', backgroundColor: '#3B82F6' }} disabled={isProcessing || effectiveTokens < selectedReward.cost}>
                                    {isProcessing ? 'Processing...' : 'Yes, Let\'s go!'}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* Success Modal with confetti burst */}
                {redeemedReward && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(16, 185, 129, 0.95)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', overflow: 'hidden' }}
                    >
                        {/* Confetti particles */}
                        {Array.from({ length: 24 }).map((_, i) => (
                            <motion.div
                                key={`confetti-${i}`}
                                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                                animate={{
                                    x: (Math.random() - 0.5) * 400,
                                    y: (Math.random() - 0.5) * 600,
                                    opacity: 0,
                                    scale: 0,
                                    rotate: Math.random() * 720,
                                }}
                                transition={{ duration: 1.2 + Math.random() * 0.8, ease: 'easeOut', delay: Math.random() * 0.3 }}
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    width: `${8 + Math.random() * 10}px`,
                                    height: `${8 + Math.random() * 10}px`,
                                    borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                                    backgroundColor: ['#FCD34D', '#F472B6', '#60A5FA', '#34D399', '#A78BFA', '#FB923C'][i % 6],
                                }}
                            />
                        ))}
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            transition={{ type: 'spring', damping: 15 }}
                            style={{ backgroundColor: '#FFFFFF', borderRadius: '32px', padding: '40px', maxWidth: '360px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
                        >
                            <div style={{ backgroundColor: '#ECFDF5', width: '80px', height: '80px', borderRadius: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                                <CheckCircle2 size={40} color="#059669" />
                            </div>
                            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginBottom: '12px' }}>Yay! 🎉</h2>
                            <p style={{ fontSize: '16px', color: '#4B5563', marginBottom: '32px' }}>
                                You successfully traded your stars for <strong style={{ color: '#111827' }}>{redeemedReward.name}</strong>!{' '}
                                {redeemedReward.needsApproval ? 'Waiting for a parent to approve — ask them to check Aminy!' : 'Your parent has been notified.'}
                            </p>

                            <Button onClick={() => { setRedeemedReward(null); setSelectedReward(null); }} style={{ width: '100%', borderRadius: '16px', backgroundColor: '#111827', padding: '16px 0', fontSize: '16px' }}>
                                Awesome!
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default TokenRewardsBoard;
