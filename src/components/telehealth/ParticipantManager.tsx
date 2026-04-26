// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * ParticipantManager Component
 *
 * Multi-participant panel for telehealth video calls.
 * Shows all participants in a call with tile cards, supports
 * parent + child + provider (3 participants), pin/spotlight,
 * mute/unmute indicators, and invite-another-participant link sharing.
 *
 * Designed to integrate with the existing VideoCallRoom and Daily.co
 * call object architecture.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Pin,
  PinOff,
  UserPlus,
  Copy,
  Check,
  X,
  Crown,
  Users,
  Monitor,
  Shield,
  Star,
  Link2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '../ui/button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ParticipantRole = 'provider' | 'parent' | 'child' | 'interpreter' | 'observer';

export interface CallParticipant {
  sessionId: string;
  userId?: string;
  userName: string;
  role: ParticipantRole;
  isLocal: boolean;
  video: boolean;
  audio: boolean;
  screenShare: boolean;
  photoUrl?: string;
  joinedAt?: string;
}

interface ParticipantManagerProps {
  participants: CallParticipant[];
  sessionId: string;
  roomUrl?: string;
  isProvider?: boolean;
  pinnedParticipantId?: string;
  maxParticipants?: number;
  onPinParticipant?: (sessionId: string | null) => void;
  onMuteParticipant?: (sessionId: string) => void;
  onRemoveParticipant?: (sessionId: string) => void;
  onInvite?: (email: string) => void;
  onClose?: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLE_LABELS: Record<ParticipantRole, string> = {
  provider: 'Provider',
  parent: 'Parent',
  child: 'Child',
  interpreter: 'Interpreter',
  observer: 'Observer',
};

const ROLE_COLORS: Record<ParticipantRole, string> = {
  provider: 'bg-teal-100 text-teal-700',
  parent: 'bg-blue-100 text-blue-700',
  child: 'bg-purple-100 text-purple-700',
  interpreter: 'bg-amber-100 text-amber-700',
  observer: 'bg-slate-100 text-slate-600',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatJoinTime(isoString?: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// Participant Tile sub-component
// ---------------------------------------------------------------------------

interface ParticipantTileProps {
  participant: CallParticipant;
  isPinned: boolean;
  isProvider: boolean;
  onPin: () => void;
  onMute: () => void;
  onRemove: () => void;
}

function ParticipantTile({
  participant,
  isPinned,
  isProvider,
  onPin,
  onMute,
  onRemove,
}: ParticipantTileProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={`relative rounded-xl border p-3 transition-all ${
        isPinned
          ? 'border-teal-400 bg-teal-50 shadow-md'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {participant.photoUrl ? (
            <img
              src={participant.photoUrl}
              alt={participant.userName}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold ${
                participant.role === 'provider'
                  ? 'bg-teal-600 text-white'
                  : participant.role === 'child'
                  ? 'bg-purple-500 text-white'
                  : 'bg-blue-500 text-white'
              }`}
            >
              {getInitials(participant.userName)}
            </div>
          )}

          {/* Video status indicator */}
          <div
            className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white ${
              participant.video ? 'bg-green-500' : 'bg-slate-400'
            }`}
          >
            {participant.video ? (
              <Video className="w-3 h-3 text-white" />
            ) : (
              <VideoOff className="w-3 h-3 text-white" />
            )}
          </div>
        </div>

        {/* Name & role */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-slate-900 truncate text-sm">
              {participant.userName}
              {participant.isLocal && (
                <span className="text-slate-400 font-normal"> (You)</span>
              )}
            </p>
            {isPinned && <Pin className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />}
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full ${
                ROLE_COLORS[participant.role]
              }`}
            >
              {participant.role === 'provider' && (
                <Crown className="w-3 h-3 mr-0.5" />
              )}
              {ROLE_LABELS[participant.role]}
            </span>

            {participant.screenShare && (
              <span className="inline-flex items-center text-xs text-emerald-600">
                <Monitor className="w-3 h-3 mr-0.5" />
                Sharing
              </span>
            )}
          </div>

          {participant.joinedAt && (
            <p className="text-xs text-slate-400 mt-0.5">
              Joined {formatJoinTime(participant.joinedAt)}
            </p>
          )}
        </div>

        {/* Audio indicator */}
        <div className="flex items-center gap-1.5">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              participant.audio
                ? 'bg-green-100 text-green-600'
                : 'bg-red-100 text-red-500'
            }`}
          >
            {participant.audio ? (
              <Mic className="w-4 h-4" />
            ) : (
              <MicOff className="w-4 h-4" />
            )}
          </div>

          {/* Actions toggle (provider only, not for self) */}
          {isProvider && !participant.isLocal && (
            <button
              onClick={() => setShowActions(!showActions)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
              aria-label="Toggle participant actions"
            >
              {showActions ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Provider actions dropdown */}
      {showActions && isProvider && !participant.isLocal && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
          <button
            onClick={onPin}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isPinned
                ? 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {isPinned ? (
              <>
                <PinOff className="w-3.5 h-3.5" /> Unpin
              </>
            ) : (
              <>
                <Pin className="w-3.5 h-3.5" /> Pin
              </>
            )}
          </button>

          {participant.audio && (
            <button
              onClick={onMute}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
            >
              <MicOff className="w-3.5 h-3.5" /> Mute
            </button>
          )}

          <button
            onClick={onRemove}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Remove
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invite Modal sub-component
// ---------------------------------------------------------------------------

interface InviteModalProps {
  roomUrl: string;
  sessionId: string;
  onInvite?: (email: string) => void;
  onClose: () => void;
}

function InviteModal({ roomUrl, sessionId, onInvite, onClose }: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  const inviteLink = roomUrl || `${window.location.origin}/join/${sessionId}`;

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [inviteLink]);

  const handleSendInvite = useCallback(() => {
    if (!email.trim() || !email.includes('@')) return;
    onInvite?.(email.trim());
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setEmail('');
    }, 2000);
  }, [email, onInvite]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-teal-600" />
            <h3 className="font-semibold text-slate-900">Invite Participant</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Copy link section */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Share join link
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <Link2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-600 truncate">{inviteLink}</span>
              </div>
              <button
                onClick={handleCopyLink}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  copied
                    ? 'bg-green-100 text-green-700'
                    : 'bg-teal-600 text-white hover:bg-teal-700'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Email invite section */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Or invite by email
            </label>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendInvite();
                }}
                placeholder="participant@email.com"
                className="flex-1 px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <button
                onClick={handleSendInvite}
                disabled={!email.trim() || !email.includes('@')}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  sent
                    ? 'bg-green-100 text-green-700'
                    : 'bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {sent ? 'Sent!' : 'Send'}
              </button>
            </div>
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
            <Shield className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              Only invited participants with valid links can join this HIPAA-compliant
              session. Links expire when the session ends.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main ParticipantManager component
// ---------------------------------------------------------------------------

export function ParticipantManager({
  participants,
  sessionId,
  roomUrl,
  isProvider = false,
  pinnedParticipantId,
  maxParticipants = 4,
  onPinParticipant,
  onMuteParticipant,
  onRemoveParticipant,
  onInvite,
  onClose,
}: ParticipantManagerProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Sort participants: local first, then provider, then by join time
  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => {
      if (a.isLocal && !b.isLocal) return -1;
      if (!a.isLocal && b.isLocal) return 1;
      if (a.role === 'provider' && b.role !== 'provider') return -1;
      if (a.role !== 'provider' && b.role === 'provider') return 1;
      return 0;
    });
  }, [participants]);

  const canInviteMore = participants.length < maxParticipants;

  // Participant stats
  const audioOnCount = participants.filter((p) => p.audio).length;
  const videoOnCount = participants.filter((p) => p.video).length;

  const handlePin = useCallback(
    (participantSessionId: string) => {
      if (pinnedParticipantId === participantSessionId) {
        onPinParticipant?.(null);
      } else {
        onPinParticipant?.(participantSessionId);
      }
    },
    [pinnedParticipantId, onPinParticipant],
  );

  return (
    <>
      <div className="flex flex-col h-full bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            <h3 className="font-semibold text-slate-900 text-sm">
              Participants ({participants.length})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick stats */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Mic className="w-3.5 h-3.5" />
              <span>{audioOnCount}</span>
              <Video className="w-3.5 h-3.5 ml-1" />
              <span>{videoOnCount}</span>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Participant list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sortedParticipants.map((participant) => (
            <ParticipantTile
              key={participant.sessionId}
              participant={participant}
              isPinned={pinnedParticipantId === participant.sessionId}
              isProvider={isProvider}
              onPin={() => handlePin(participant.sessionId)}
              onMute={() => onMuteParticipant?.(participant.sessionId)}
              onRemove={() => onRemoveParticipant?.(participant.sessionId)}
            />
          ))}

          {participants.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No participants yet</p>
            </div>
          )}
        </div>

        {/* Footer: Invite button */}
        {isProvider && (
          <div className="p-3 border-t border-slate-100">
            <Button
              onClick={() => setShowInviteModal(true)}
              disabled={!canInviteMore}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              {canInviteMore
                ? `Invite Participant (${participants.length}/${maxParticipants})`
                : `Session Full (${maxParticipants} max)`}
            </Button>
          </div>
        )}
      </div>

      {/* Invite modal */}
      {showInviteModal && (
        <InviteModal
          roomUrl={roomUrl || ''}
          sessionId={sessionId}
          onInvite={onInvite}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </>
  );
}

export default ParticipantManager;
