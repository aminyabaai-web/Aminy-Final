// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Viral Analytics & K-Factor Tracking
 *
 * Calculates viral coefficient (k-factor) and tracks referral performance.
 * k = invites_sent_per_user × conversion_rate
 *
 * A k > 1 means viral growth (each user brings more than 1 new user)
 * A k < 1 means the product needs paid acquisition to grow
 */

import { supabase } from '../utils/supabase/client';

export interface ViralMetrics {
  // Core K-Factor
  kFactor: number;

  // Components
  avgInvitesSent: number;
  conversionRate: number;

  // Funnel breakdown
  totalUsers: number;
  usersWhoInvited: number;
  totalInvitesSent: number;
  totalInvitesClicked: number;
  totalInvitesConverted: number;

  // Time-based metrics
  avgTimeToFirstInvite: number; // days
  avgTimeToConversion: number; // days

  // Trends
  kFactorTrend: 'up' | 'down' | 'stable';
  weekOverWeekGrowth: number;
}

export interface ReferralRecord {
  id: string;
  referrer_id: string;
  referral_code: string;
  invited_email?: string;
  status: 'pending' | 'clicked' | 'signed_up' | 'converted';
  created_at: string;
  clicked_at?: string;
  converted_at?: string;
  converted_user_id?: string;
}

/**
 * Generate a unique referral code for a user
 */
export function generateReferralCode(userId: string): string {
  const base = userId.slice(0, 8).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `AMINY-${base}-${random}`;
}

/**
 * Get or create a referral code for a user
 */
export async function getUserReferralCode(userId: string): Promise<string> {
  try {
    // Check if user already has a referral code
    const { data: existing } = await supabase
      .from('referral_codes')
      .select('code')
      .eq('user_id', userId)
      .single();

    if (existing?.code) {
      return existing.code;
    }

    // Create new referral code
    const newCode = generateReferralCode(userId);

    await supabase.from('referral_codes').insert({
      user_id: userId,
      code: newCode,
      created_at: new Date().toISOString()
    });

    return newCode;
  } catch (error) {
    console.error('[Viral] Error getting referral code:', error);
    // Return a generated code even if DB fails
    return generateReferralCode(userId);
  }
}

/**
 * Track when a referral link is shared
 */
export async function trackReferralShare(
  referrerId: string,
  channel: 'copy' | 'email' | 'sms' | 'social' | 'other',
  invitedEmail?: string
): Promise<{ success: boolean; referralId?: string }> {
  try {
    const referralCode = await getUserReferralCode(referrerId);

    const { data, error } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrerId,
        referral_code: referralCode,
        invited_email: invitedEmail,
        share_channel: channel,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) throw error;

    return { success: true, referralId: data?.id };
  } catch (error) {
    console.error('[Viral] Error tracking share:', error);
    return { success: false };
  }
}

/**
 * Track when a referral link is clicked
 */
export async function trackReferralClick(referralCode: string): Promise<void> {
  try {
    // Update most recent pending referral with this code
    await supabase
      .from('referrals')
      .update({
        status: 'clicked',
        clicked_at: new Date().toISOString()
      })
      .eq('referral_code', referralCode)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1);

    // Also increment click count on referral code
    await supabase.rpc('increment_referral_clicks', { code: referralCode });
  } catch (error) {
    console.error('[Viral] Error tracking click:', error);
  }
}

/**
 * Track when a referred user signs up
 */
export async function trackReferralConversion(
  referralCode: string,
  newUserId: string
): Promise<{ success: boolean; referrerId?: string }> {
  try {
    // Find the referrer
    const { data: codeData } = await supabase
      .from('referral_codes')
      .select('user_id')
      .eq('code', referralCode)
      .single();

    if (!codeData?.user_id) {
      return { success: false };
    }

    // Update referral record
    await supabase
      .from('referrals')
      .update({
        status: 'converted',
        converted_at: new Date().toISOString(),
        converted_user_id: newUserId
      })
      .eq('referral_code', referralCode)
      .in('status', ['pending', 'clicked'])
      .order('created_at', { ascending: false })
      .limit(1);

    // Give both users credit (could trigger rewards)
    await Promise.all([
      supabase.from('referral_credits').insert({
        user_id: codeData.user_id,
        credited_for: newUserId,
        credit_type: 'referrer',
        created_at: new Date().toISOString()
      }),
      supabase.from('referral_credits').insert({
        user_id: newUserId,
        credited_for: codeData.user_id,
        credit_type: 'referred',
        created_at: new Date().toISOString()
      })
    ]);

    return { success: true, referrerId: codeData.user_id };
  } catch (error) {
    console.error('[Viral] Error tracking conversion:', error);
    return { success: false };
  }
}

/**
 * Calculate viral metrics (K-factor and related stats)
 */
export async function calculateViralMetrics(): Promise<ViralMetrics> {
  try {
    // Get all users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, created_at');

    if (profilesError) throw profilesError;

    const totalUsers = profiles?.length || 0;

    // Get all referrals
    const { data: referrals, error: referralsError } = await supabase
      .from('referrals')
      .select('*');

    // Handle case where referrals table doesn't exist yet
    if (referralsError) {
      console.warn('[Viral] Referrals table may not exist:', referralsError);
      return getEmptyMetrics(totalUsers);
    }

    const allReferrals = referrals || [];

    // Calculate metrics
    const usersWhoInvited = new Set(allReferrals.map(r => r.referrer_id)).size;
    const totalInvitesSent = allReferrals.length;
    const totalInvitesClicked = allReferrals.filter(r =>
      r.status === 'clicked' || r.status === 'converted'
    ).length;
    const totalInvitesConverted = allReferrals.filter(r =>
      r.status === 'converted'
    ).length;

    // K-Factor calculation
    // k = (invites per user) × (conversion rate)
    const avgInvitesSent = totalUsers > 0 ? totalInvitesSent / totalUsers : 0;
    const conversionRate = totalInvitesSent > 0
      ? totalInvitesConverted / totalInvitesSent
      : 0;
    const kFactor = avgInvitesSent * conversionRate;

    // Time metrics
    const timeToFirstInvites: number[] = [];
    const timeToConversions: number[] = [];

    allReferrals.forEach(ref => {
      // Find user's signup date
      const user = profiles?.find(p => p.id === ref.referrer_id);
      if (user) {
        const signupDate = new Date(user.created_at);
        const inviteDate = new Date(ref.created_at);
        const daysDiff = (inviteDate.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff >= 0) timeToFirstInvites.push(daysDiff);
      }

      // Time to conversion
      if (ref.converted_at && ref.created_at) {
        const inviteDate = new Date(ref.created_at);
        const convertDate = new Date(ref.converted_at);
        const daysDiff = (convertDate.getTime() - inviteDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff >= 0) timeToConversions.push(daysDiff);
      }
    });

    const avgTimeToFirstInvite = timeToFirstInvites.length > 0
      ? timeToFirstInvites.reduce((a, b) => a + b, 0) / timeToFirstInvites.length
      : 0;

    const avgTimeToConversion = timeToConversions.length > 0
      ? timeToConversions.reduce((a, b) => a + b, 0) / timeToConversions.length
      : 0;

    // Week-over-week comparison
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const thisWeekConversions = allReferrals.filter(r =>
      r.status === 'converted' &&
      new Date(r.converted_at) >= oneWeekAgo
    ).length;

    const lastWeekConversions = allReferrals.filter(r =>
      r.status === 'converted' &&
      new Date(r.converted_at) >= twoWeeksAgo &&
      new Date(r.converted_at) < oneWeekAgo
    ).length;

    const weekOverWeekGrowth = lastWeekConversions > 0
      ? ((thisWeekConversions - lastWeekConversions) / lastWeekConversions) * 100
      : thisWeekConversions > 0 ? 100 : 0;

    // Determine trend
    let kFactorTrend: 'up' | 'down' | 'stable' = 'stable';
    if (weekOverWeekGrowth > 10) kFactorTrend = 'up';
    else if (weekOverWeekGrowth < -10) kFactorTrend = 'down';

    return {
      kFactor: Math.round(kFactor * 100) / 100,
      avgInvitesSent: Math.round(avgInvitesSent * 100) / 100,
      conversionRate: Math.round(conversionRate * 1000) / 10, // percentage
      totalUsers,
      usersWhoInvited,
      totalInvitesSent,
      totalInvitesClicked,
      totalInvitesConverted,
      avgTimeToFirstInvite: Math.round(avgTimeToFirstInvite * 10) / 10,
      avgTimeToConversion: Math.round(avgTimeToConversion * 10) / 10,
      kFactorTrend,
      weekOverWeekGrowth: Math.round(weekOverWeekGrowth * 10) / 10
    };
  } catch (error) {
    console.error('[Viral] Error calculating metrics:', error);
    return getEmptyMetrics(0);
  }
}

/**
 * Get empty metrics structure when data is unavailable
 */
function getEmptyMetrics(totalUsers: number): ViralMetrics {
  return {
    kFactor: 0,
    avgInvitesSent: 0,
    conversionRate: 0,
    totalUsers,
    usersWhoInvited: 0,
    totalInvitesSent: 0,
    totalInvitesClicked: 0,
    totalInvitesConverted: 0,
    avgTimeToFirstInvite: 0,
    avgTimeToConversion: 0,
    kFactorTrend: 'stable',
    weekOverWeekGrowth: 0
  };
}

/**
 * Get a user's referral stats
 */
export async function getUserReferralStats(userId: string): Promise<{
  code: string;
  totalInvites: number;
  converted: number;
  pending: number;
  credits: number;
}> {
  try {
    const code = await getUserReferralCode(userId);

    const { data: referrals } = await supabase
      .from('referrals')
      .select('status')
      .eq('referrer_id', userId);

    const { data: credits } = await supabase
      .from('referral_credits')
      .select('id')
      .eq('user_id', userId)
      .eq('credit_type', 'referrer');

    const allReferrals = referrals || [];

    return {
      code,
      totalInvites: allReferrals.length,
      converted: allReferrals.filter(r => r.status === 'converted').length,
      pending: allReferrals.filter(r => r.status !== 'converted').length,
      credits: credits?.length || 0
    };
  } catch (error) {
    console.error('[Viral] Error getting user stats:', error);
    return {
      code: generateReferralCode(userId),
      totalInvites: 0,
      converted: 0,
      pending: 0,
      credits: 0
    };
  }
}

/**
 * Interpret K-Factor for display
 */
export function interpretKFactor(k: number): {
  status: 'viral' | 'growing' | 'stable' | 'declining';
  color: string;
  message: string;
} {
  if (k >= 1) {
    return {
      status: 'viral',
      color: 'text-green-600',
      message: 'Viral growth! Each user brings more than 1 new user.'
    };
  } else if (k >= 0.5) {
    return {
      status: 'growing',
      color: 'text-blue-600',
      message: 'Strong organic growth. Near viral threshold.'
    };
  } else if (k >= 0.2) {
    return {
      status: 'stable',
      color: 'text-yellow-600',
      message: 'Moderate word-of-mouth. Room to improve referral flow.'
    };
  } else {
    return {
      status: 'declining',
      color: 'text-red-600',
      message: 'Low viral coefficient. Focus on referral incentives.'
    };
  }
}

/**
 * Generate shareable referral URL
 */
export function getReferralUrl(code: string): string {
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://aminy.ai';
  return `${baseUrl}/join?ref=${code}`;
}

/**
 * Generate share text for different channels
 */
export function getShareText(childName?: string): {
  subject: string;
  body: string;
  twitter: string;
} {
  const personalized = childName
    ? `has been helping ${childName} thrive`
    : 'has been a game-changer for our family';

  return {
    subject: 'I found an amazing autism support app',
    body: `Hey! I wanted to share Aminy with you. It's an AI companion that ${personalized}. It's like having a developmental pediatrician, BCBA, and supportive friend available 24/7. Try it free:`,
    twitter: `Aminy ${personalized}! 🧩 If you have a child with autism or developmental needs, check it out:`
  };
}

export default {
  calculateViralMetrics,
  getUserReferralCode,
  getUserReferralStats,
  trackReferralShare,
  trackReferralClick,
  trackReferralConversion,
  interpretKFactor,
  getReferralUrl,
  getShareText
};
