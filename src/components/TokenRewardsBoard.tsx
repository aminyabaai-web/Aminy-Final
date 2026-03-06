/**
 * TokenRewardsBoard - 10/10 Apple/Calm Aesthetic
 *
 * This component fulfills Phase 4 of the MVP:
 * - Complete the token economy (Stars for rewards)
 * - Wire the communication bridge (Junior reports behaviors back to Parent AI)
 */

import React, { useState } from 'react';
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
    CheckCircle2
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
}

interface TokenRewardsBoardProps {
    onBack: () => void;
    availableTokens: number;
    onSpendTokens: (amount: number) => void;
    childName?: string;
}

export function TokenRewardsBoard({ onBack, availableTokens, onSpendTokens, childName = "Emma" }: TokenRewardsBoardProps) {
    const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [redeemedReward, setRedeemedReward] = useState<RewardItem | null>(null);

    const rewards: RewardItem[] = [
        { id: 'screen_time', name: '15 Min Extra Play', cost: 10, icon: <Gamepad2 size={32} />, color: 'from-blue-400 to-indigo-500' },
        { id: 'movie_pick', name: 'Choose Movie Night', cost: 25, icon: <Tv size={32} />, color: 'from-purple-400 to-fuchsia-500' },
        { id: 'dance_party', name: 'Dance Party', cost: 5, icon: <Music size={32} />, color: 'from-emerald-400 to-teal-500' },
        { id: 'special_treat', name: 'Special Treat', cost: 15, icon: <IceCream size={32} />, color: 'from-pink-400 to-rose-500' },
    ];

    const handleRedeem = (reward: RewardItem) => {
        if (availableTokens < reward.cost) {
            toast.error("Not enough stars yet! Keep practicing.");
            if (window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate([50, 50, 50]);
            }
            return;
        }

        setIsProcessing(true);

        // Simulate transaction delay
        setTimeout(() => {
            onSpendTokens(reward.cost);
            setRedeemedReward(reward);
            setIsProcessing(false);

            // Phase 4 Communication Bridge: Log to Parent AI Context
            connectorHub.publish('jr.milestone.reached', {
                childId: childName.toLowerCase(),
                type: 'reward_redeemed',
                rewardId: reward.id,
                value: reward.cost,
            }, 'rewards-board');

            if (window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate([100, 50, 200]);
            }

        }, 800);
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
                            style={{
                                width: '36px', height: '36px', borderRadius: '18px', border: 'none', backgroundColor: '#FFFFFF',
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
                            {availableTokens}
                        </span>
                    </div>
                    <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '8px', zIndex: 1, textAlign: 'center' }}>
                        You're doing great, {childName}! You can spend your stars on fun rewards.
                    </p>
                </motion.div>

                {/* Rewards Grid */}
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>Available Rewards</h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
                    {rewards.map(reward => {
                        const canAfford = availableTokens >= reward.cost;
                        return (
                            <motion.button
                                key={reward.id}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setSelectedReward(reward)}
                                style={{
                                    backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '24px',
                                    border: '2px solid ' + (selectedReward?.id === reward.id ? '#3B82F6' : 'transparent'),
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)', cursor: 'pointer',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
                                    opacity: canAfford ? 1 : 0.6,
                                    transition: 'all 0.2s',
                                    position: 'relative'
                                }}
                            >
                                <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundImage: 'linear-gradient(to bottom right, var(--tw-gradient-stops))', background: 'var(--tw-gradient-from, #E5E7EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }} className={'bg-gradient-to-br ' + reward.color}>
                                    {reward.icon}
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>{reward.name}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: 600, color: canAfford ? '#059669' : '#DC2626' }}>{reward.cost}</span>
                                        <Star size={12} fill={canAfford ? '#10B981' : '#EF4444'} color={canAfford ? '#10B981' : '#EF4444'} />
                                    </div>
                                </div>
                            </motion.button>
                        );
                    })}
                </div>

            </div>

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
                            <div style={{ width: '80px', height: '80px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', marginBottom: '24px' }} className={'bg-gradient-to-br ' + selectedReward.color}>
                                {selectedReward.icon}
                            </div>
                            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Get {selectedReward.name}?</h2>
                            <p style={{ fontSize: '15px', color: '#6B7280', marginBottom: '24px' }}>
                                This will cost <strong style={{ color: '#111827' }}>{selectedReward.cost}</strong> stars. You have <strong style={{ color: '#059669' }}>{availableTokens}</strong> stars right now.
                            </p>

                            <div style={{ width: '100%', display: 'flex', gap: '12px' }}>
                                <Button variant="outline" onClick={() => setSelectedReward(null)} style={{ flex: 1, borderRadius: '16px' }} disabled={isProcessing}>
                                    Cancel
                                </Button>
                                <Button onClick={() => handleRedeem(selectedReward)} style={{ flex: 1, borderRadius: '16px', backgroundColor: '#3B82F6' }} disabled={isProcessing || availableTokens < selectedReward.cost}>
                                    {isProcessing ? 'Processing...' : 'Yes, Let\'s go!'}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* Success Modal */}
                {redeemedReward && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(16, 185, 129, 0.95)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
                    >
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
                                You successfully traded your stars for <strong style={{ color: '#111827' }}>{redeemedReward.name}</strong>! Your parent has been notified.
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
