import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Share2, Copy, CheckCircle, Gift } from 'lucide-react';
import { Button } from './ui/button';
import { getReferralShareMessage } from '../lib/referral-program';

interface ReferralShareCardProps {
    referralCode: string;
    userName?: string;
}

export function ReferralShareCard({ referralCode, userName = 'A friend' }: ReferralShareCardProps) {
    const [copied, setCopied] = useState(false);
    const shareMessage = getReferralShareMessage(referralCode, userName);

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: shareMessage.title,
                    text: shareMessage.body,
                    url: shareMessage.url,
                });
                console.log('Successfully shared');
            } catch (error) {
                if ((error as Error).name !== 'AbortError') {
                    console.error('Error sharing:', error);
                    handleCopy(); // Fallback to copy if native share fails unexpectedly
                }
            }
        } else {
            // Fallback for browsers that do not support Web Share API
            handleCopy();
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(`${shareMessage.body} ${shareMessage.url}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy to clipboard', err);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-6 sm:p-8 max-w-md w-full"
        >
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-6 mx-auto">
                <Gift className="w-8 h-8" />
            </div>

            <div className="text-center space-y-2 mb-8">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Sign up a friend, get a free month</h3>
                <p className="text-slate-600 dark:text-slate-400">
                    Share Aminy with a family who could benefit. When they join, they get $25 off and you get your next month free!
                </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 flex items-center justify-between mb-8">
                <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Your Code</p>
                    <p className="text-xl font-mono font-bold text-slate-900 dark:text-white tracking-widest">{referralCode}</p>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopy}
                    className={copied ? 'text-green-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}
                >
                    {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </Button>
            </div>

            <Button
                onClick={handleShare}
                className="w-full h-14 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-2"
            >
                <Share2 className="w-5 h-5" />
                Share via...
            </Button>
        </motion.div>
    );
}
