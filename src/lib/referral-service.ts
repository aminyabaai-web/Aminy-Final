/**
 * Referral Service
 * Manages referral codes, tracking, and rewards for viral growth.
 */
import { supabase } from "../utils/supabase/client";
import { useState, useEffect, useCallback } from "react";

export interface ReferralCode {
  id: string;
  code: string;
  userId: string;
  uses: number;
  maxUses?: number;
  rewardType: "free_month" | "discount" | "credits" | "tier_upgrade";
  rewardValue: number;
  expiresAt?: string;
  createdAt: string;
  isActive: boolean;
}

export interface ReferralStats {
  totalReferrals: number;
  pendingReferrals: number;
  convertedReferrals: number;
  rewardsEarned: number;
  currentStreak: number;
  bestStreak: number;
}

export interface ReferralReward {
  id: string;
  userId: string;
  referralId: string;
  rewardType: ReferralCode["rewardType"];
  rewardValue: number;
  status: "pending" | "applied" | "expired";
  createdAt: string;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

async function generateUniqueCode(userId: string): Promise<string> {
  const userHash = hashCode(userId).toString(16).slice(0, 4).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AMINY${userHash}${randomPart}`;
}

export async function generateReferralCode(
  userId: string,
  options?: {
    customCode?: string;
    maxUses?: number;
    expiresIn?: number;
    rewardType?: ReferralCode["rewardType"];
    rewardValue?: number;
  }
): Promise<ReferralCode | null> {
  const { customCode, maxUses, expiresIn, rewardType = "free_month", rewardValue = 1 } = options || {};
  const code = customCode || await generateUniqueCode(userId);
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000).toISOString() : null;

  try {
    const { data, error } = await supabase.from("referral_codes").insert({
      code: code.toUpperCase(), user_id: userId, uses: 0, max_uses: maxUses,
      reward_type: rewardType, reward_value: rewardValue, expires_at: expiresAt, is_active: true,
    }).select().single();
    if (error) throw error;
    return { id: data.id, code: data.code, userId: data.user_id, uses: data.uses, maxUses: data.max_uses,
      rewardType: data.reward_type, rewardValue: data.reward_value, expiresAt: data.expires_at,
      createdAt: data.created_at, isActive: data.is_active };
  } catch (e) { console.error("[Referral] Failed:", e); return null; }
}

export async function getUserReferralCodes(userId: string): Promise<ReferralCode[]> {
  try {
    const { data, error } = await supabase.from("referral_codes").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(r => ({ id: r.id, code: r.code, userId: r.user_id, uses: r.uses, maxUses: r.max_uses,
      rewardType: r.reward_type, rewardValue: r.reward_value, expiresAt: r.expires_at, createdAt: r.created_at, isActive: r.is_active }));
  } catch (e) { return []; }
}

export async function getPrimaryReferralCode(userId: string): Promise<ReferralCode | null> {
  const codes = await getUserReferralCodes(userId);
  return codes.find(c => c.isActive) || generateReferralCode(userId);
}

export async function validateReferralCode(code: string): Promise<{ valid: boolean; referralCode?: ReferralCode; error?: string }> {
  try {
    const { data, error } = await supabase.from("referral_codes").select("*").eq("code", code.toUpperCase()).single();
    if (error || !data) return { valid: false, error: "Invalid referral code" };
    if (!data.is_active) return { valid: false, error: "Code is no longer active" };
    if (data.expires_at && new Date(data.expires_at) < new Date()) return { valid: false, error: "Code has expired" };
    if (data.max_uses && data.uses >= data.max_uses) return { valid: false, error: "Code reached its limit" };
    return { valid: true, referralCode: { id: data.id, code: data.code, userId: data.user_id, uses: data.uses, maxUses: data.max_uses,
      rewardType: data.reward_type, rewardValue: data.reward_value, expiresAt: data.expires_at, createdAt: data.created_at, isActive: data.is_active }};
  } catch (e) { return { valid: false, error: "Validation failed" }; }
}

export async function applyReferralCode(newUserId: string, referralCode: string): Promise<{ success: boolean; error?: string }> {
  const v = await validateReferralCode(referralCode);
  if (!v.valid || !v.referralCode) return { success: false, error: v.error };
  if (v.referralCode.userId === newUserId) return { success: false, error: "Cannot use own code" };
  try {
    const { data: existing } = await supabase.from("referrals").select("id").eq("referred_id", newUserId).single();
    if (existing) return { success: false, error: "Already used a referral" };
    await supabase.from("referrals").insert({ referrer_id: v.referralCode.userId, referred_id: newUserId, referral_code: v.referralCode.code, status: "pending" });
    await supabase.from("referral_codes").update({ uses: v.referralCode.uses + 1 }).eq("id", v.referralCode.id);
    return { success: true };
  } catch (e) { return { success: false, error: "Failed to apply" }; }
}

export async function getReferralStats(userId: string): Promise<ReferralStats> {
  try {
    const { data } = await supabase.rpc("get_referral_stats", { p_user_id: userId });
    return data || { totalReferrals: 0, pendingReferrals: 0, convertedReferrals: 0, rewardsEarned: 0, currentStreak: 0, bestStreak: 0 };
  } catch { return { totalReferrals: 0, pendingReferrals: 0, convertedReferrals: 0, rewardsEarned: 0, currentStreak: 0, bestStreak: 0 }; }
}

export async function getPendingRewards(userId: string): Promise<ReferralReward[]> {
  try {
    const { data } = await supabase.from("referral_rewards").select("*").eq("user_id", userId).eq("status", "pending");
    return (data || []).map(r => ({ id: r.id, userId: r.user_id, referralId: r.referral_id, rewardType: r.reward_type,
      rewardValue: r.reward_value, status: r.status, createdAt: r.created_at }));
  } catch { return []; }
}

export function generateShareUrl(code: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "https://app.aminy.ai";
  return `${base}/r/${code}`;
}

export function generateShareText(code: string) {
  const url = generateShareUrl(code);
  const text = "Try Aminy - AI support for families on their developmental journey!";
  return { title: "Join me on Aminy!", text, url, sms: `${text} Code: ${code} ${url}`,
    email: { subject: "Try Aminy", body: `${text}\n\nCode: ${code}\n${url}` },
    twitter: `${text} Code: ${code} ${url}` };
}

export async function trackShare(userId: string, code: string, platform: string): Promise<void> {
  try { await supabase.from("referral_shares").insert({ user_id: userId, referral_code: code, platform }); } catch {}
}

export function useReferral(userId: string | null) {
  const [code, setCode] = useState<ReferralCode | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [rewards, setRewards] = useState<ReferralReward[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    const [c, s, r] = await Promise.all([getPrimaryReferralCode(userId), getReferralStats(userId), getPendingRewards(userId)]);
    setCode(c); setStats(s); setRewards(r); setIsLoading(false);
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  const share = useCallback(async (platform: string) => {
    if (!code) return;
    await trackShare(userId || "anon", code.code, platform);
    const data = generateShareText(code.code);
    if (platform === "copy") navigator.clipboard.writeText(data.url);
  }, [code, userId]);

  return { code, stats, rewards, isLoading, refresh, share, shareUrl: code ? generateShareUrl(code.code) : null };
}

export default { generateReferralCode, getUserReferralCodes, getPrimaryReferralCode, validateReferralCode,
  applyReferralCode, getReferralStats, getPendingRewards, generateShareUrl, generateShareText, trackShare, useReferral };
