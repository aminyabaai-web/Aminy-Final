// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * DailyVideoFrame — Production Daily.co prebuilt video iframe
 *
 * Wraps Daily's createFrame() for a complete video call experience:
 * - Video tiles, camera/mic toggles, screenshare, chat — all built-in
 * - Themed to Aminy's color palette
 * - Exposes leave() via forwardRef so parent component controls session flow
 * - Loading spinner while SDK loads + joining
 * - Graceful error handling with user-friendly messages
 */

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { loadDailySDK } from '../lib/daily-video';
import { handleDailyError } from '../lib/daily-config';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

/** Minimal shape of the Daily prebuilt iframe returned by DailyIframe.createFrame() */
interface DailyPrebuiltFrame {
  join: (options: { url: string; token: string; userName?: string }) => Promise<void>;
  leave: () => Promise<void>;
  destroy: () => void;
  on: (event: string, handler: (event?: DailyErrorEvent) => void) => void;
}

/** The error event payload emitted by the Daily prebuilt frame */
interface DailyErrorEvent {
  errorMsg?: string;
  error?: string;
}

/** Shape of the global DailyIframe factory loaded from the CDN script */
interface DailyIframeFactory {
  createFrame: (container: HTMLDivElement, options: Record<string, unknown>) => DailyPrebuiltFrame;
}

export interface DailyVideoFrameRef {
  /** Programmatically leave the call */
  leave: () => Promise<void>;
}

interface DailyVideoFrameProps {
  /** Full Daily.co room URL (https://domain.daily.co/room-name) */
  roomUrl: string;
  /** Meeting token from getMeetingToken() */
  token: string;
  /** Display name shown to other participants */
  userName?: string;
  /** Called when participant leaves (via our button OR Daily's built-in leave) */
  onLeave?: () => void;
  /** Called on any video call error */
  onError?: (error: string) => void;
  /** Called when another participant joins */
  onParticipantJoined?: () => void;
}

export const DailyVideoFrame = forwardRef<DailyVideoFrameRef, DailyVideoFrameProps>(
  function DailyVideoFrame(
    { roomUrl, token, userName, onLeave, onError, onParticipantJoined },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const frameRef = useRef<DailyPrebuiltFrame | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const mountedRef = useRef(true);

    // Expose leave() to parent via ref
    useImperativeHandle(ref, () => ({
      leave: async () => {
        if (frameRef.current) {
          try {
            await frameRef.current.leave();
          } catch {
            // Already left or destroyed — that's fine
          }
        }
      },
    }));

    // Initialize the Daily.co prebuilt iframe
    useEffect(() => {
      mountedRef.current = true;
      let frame: DailyPrebuiltFrame | null = null;

      async function initFrame() {
        try {
          // Load the Daily.co SDK from CDN
          await loadDailySDK();
          if (!mountedRef.current || !containerRef.current) return;

          const DailyIframe = (window as unknown as Record<string, unknown>).DailyIframe as DailyIframeFactory | undefined;
          if (!DailyIframe) {
            throw new Error('Daily.co SDK failed to load');
          }

          // Create the prebuilt iframe inside our container
          frame = DailyIframe.createFrame(containerRef.current, {
            iframeStyle: {
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: '0',
            },
            showLeaveButton: true,
            showFullscreenButton: true,
            showLocalVideo: true,
            showParticipantsBar: false, // Cleaner for 1:1 sessions
            theme: {
              colors: {
                accent: '#43AA8B',
                accentText: '#FFFFFF',
                background: '#111827',
                backgroundAccent: '#1f2937',
                baseText: '#f3f4f6',
                border: '#374151',
                mainAreaBg: '#0f172a',
                mainAreaBgAccent: '#1e293b',
                mainAreaText: '#f8fafc',
                supportiveText: '#9ca3af',
              },
            },
          });

          frameRef.current = frame;

          // ─── Event handlers ───────────────────────────
          frame.on('joined-meeting', () => {
            if (mountedRef.current) setIsLoading(false);
          });

          frame.on('left-meeting', () => {
            if (mountedRef.current) onLeave?.();
          });

          frame.on('participant-joined', () => {
            if (mountedRef.current) onParticipantJoined?.();
          });

          frame.on('error', (event?: DailyErrorEvent) => {
            if (!mountedRef.current) return;
            const msg = handleDailyError(event);
            setError(msg);
            setIsLoading(false);
            onError?.(msg);
          });

          // Join the room with our token
          await frame.join({ url: roomUrl, token, userName });
        } catch (err: unknown) {
          if (!mountedRef.current) return;
          const msg = err instanceof Error ? err.message : 'Failed to start video call';
          setError(msg);
          setIsLoading(false);
          onError?.(msg);
        }
      }

      initFrame();

      // Cleanup on unmount
      return () => {
        mountedRef.current = false;
        if (frame) {
          try {
            frame.destroy();
          } catch {
            // Already destroyed
          }
        }
        frameRef.current = null;
      };
    }, [roomUrl, token]); // Only re-init if room/token changes

    // Retry after error
    const handleRetry = useCallback(() => {
      setError(null);
      setIsLoading(true);
      // Trigger re-init by remounting (parent should handle)
      onError?.('retry');
    }, [onError]);

    return (
      <div ref={containerRef} className="relative w-full h-full bg-gray-900">
        {/* Loading overlay */}
        {isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white/80 text-sm">Setting up your secure video...</p>
              <p className="text-white/50 text-xs mt-2">
                Allow camera &amp; microphone access when prompted
              </p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10 p-6">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Video Connection Issue</h3>
              <p className="text-white/70 text-sm mb-4">{error}</p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onLeave?.()}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Go Back
                </Button>
                <Button
                  size="sm"
                  onClick={handleRetry}
                  className="bg-accent hover:bg-accent/90"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

export default DailyVideoFrame;
