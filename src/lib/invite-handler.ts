/**
 * invite-handler.ts
 *
 * Reads URL params on app load and routes new users into the correct
 * onboarding flow. Supports:
 *   ?invite=provider          → provider onboarding
 *   ?invite=family&ref=CODE   → family referral flow
 *   ?screen=xxx               → deep-link to any screen
 *   ?i=CODE                   → short invite code
 *   ?ref=CODE                 → referral code
 */

export interface InviteContext {
  screen: string | null;
  inviteType: 'provider' | 'family' | 'referral' | null;
  referralCode: string | null;
  inviteCode: string | null;
}

/**
 * Parses the current URL's query parameters and returns the resolved
 * InviteContext. Safe to call on every app load — returns nulls when
 * no invite params are present.
 */
export function parseInviteUrl(): InviteContext {
  if (typeof window === 'undefined') {
    return { screen: null, inviteType: null, referralCode: null, inviteCode: null };
  }

  const params = new URLSearchParams(window.location.search);

  const inviteParam = params.get('invite');
  const screenParam = params.get('screen');
  const refCode = params.get('ref');
  const shortCode = params.get('i');

  let inviteType: InviteContext['inviteType'] = null;
  let screen: string | null = screenParam;

  if (inviteParam === 'provider') {
    inviteType = 'provider';
    // Only override screen if not explicitly set
    if (!screen) {
      screen = 'provider-landing';
    }
  } else if (inviteParam === 'family') {
    inviteType = 'family';
    if (!screen) {
      screen = 'join';
    }
  } else if (refCode) {
    // A ref code without an explicit invite type → family referral
    inviteType = 'referral';
    if (!screen) {
      screen = 'join';
    }
  }

  return {
    screen,
    inviteType,
    referralCode: refCode,
    inviteCode: shortCode,
  };
}

/**
 * Generates a shareable provider invite URL.
 * @param baseUrl  Defaults to window.location.origin (e.g. https://aminy.ai)
 */
export function generateProviderInviteUrl(baseUrl?: string): string {
  const origin =
    baseUrl ??
    (typeof window !== 'undefined' ? window.location.origin : 'https://aminy.ai');
  return `${origin}/?invite=provider`;
}

/**
 * Generates a shareable family referral URL.
 * @param referralCode  Optional referral/promo code appended as ?ref=CODE
 * @param baseUrl       Defaults to window.location.origin
 */
export function generateFamilyInviteUrl(referralCode?: string, baseUrl?: string): string {
  const origin =
    baseUrl ??
    (typeof window !== 'undefined' ? window.location.origin : 'https://aminy.ai');
  const url = `${origin}/?invite=family`;
  return referralCode ? `${url}&ref=${encodeURIComponent(referralCode)}` : url;
}
