// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ProviderInviteShare
 *
 * Admin-portal card that lets operators copy or email a provider invite link.
 * Used inside AdminPortal's Overview tab.
 */

import React, { useState, useCallback } from 'react';
import { Copy, Mail, CheckCircle } from 'lucide-react';
import { generateProviderInviteUrl } from '../../lib/invite-handler';

export function ProviderInviteShare(): React.JSX.Element {
  const [copied, setCopied] = useState(false);

  const inviteUrl = generateProviderInviteUrl();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for browsers that block clipboard without interaction
      const textArea = document.createElement('textarea');
      textArea.value = inviteUrl;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [inviteUrl]);

  const handleEmail = useCallback(() => {
    const subject = encodeURIComponent('Join Aminy as a Provider');
    const body = encodeURIComponent(
      `Hi,\n\nI'd like to invite you to join Aminy — an AI-powered care coordination platform for autism and pediatric behavioral health.\n\nClick the link below to apply as a provider:\n\n${inviteUrl}\n\nIt takes less than 5 minutes to get started.\n\nLooking forward to working with you!\n`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  }, [inviteUrl]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#E8E4DF] dark:border-slate-700 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <Mail className="w-4 h-4 text-emerald-500" />
        </div>
        <h3 className="text-sm font-semibold text-[#132F43] dark:text-white">
          Invite Providers
        </h3>
      </div>
      <p className="text-sm text-[#5A6B7A] dark:text-[#8A9BA8] mb-4 ml-10">
        Share this link to onboard new providers directly into the Aminy platform.
      </p>

      {/* URL preview */}
      <div className="bg-[#F6FBFB] dark:bg-slate-800 rounded-lg px-3 py-2 mb-3 font-mono text-xs text-[#5A6B7A] dark:text-gray-300 truncate select-all">
        {inviteUrl}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 flex-1 justify-center bg-emerald-500 hover:bg-emerald-500/90 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          {copied ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Provider Invite Link
            </>
          )}
        </button>

        <button
          onClick={handleEmail}
          className="flex items-center gap-2 flex-1 justify-center bg-[#EDF4F7] dark:bg-slate-700 hover:bg-[#E8E4DF] dark:hover:bg-slate-600 text-[#3A4A57] dark:text-gray-200 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Mail className="w-4 h-4" />
          Share via Email
        </button>
      </div>
    </div>
  );
}
