// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Recording Playback Component
 *
 * Provides a video player for session recordings stored in Supabase Storage.
 * Integrates with recording-storage.ts for metadata, consent checks, and
 * signed URL generation.
 *
 * Features:
 * - Video player with play/pause, seek bar, speed control (1x/1.5x/2x)
 * - Timestamp bookmarks for key moments
 * - Download button (with consent verification)
 * - Recording metadata: date, duration, participants, provider notes
 * - List view of all recordings for a given child/session
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Download,
  Bookmark,
  BookmarkCheck,
  Clock,
  Shield,
  Users,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Video,
  X,
  FileText,
  Gauge,
} from 'lucide-react';
import {
  getRecordingPlaybackUrl,
  hasAllConsents,
  type RecordingMetadata,
} from '../../lib/recording-storage';
import { supabase } from '../../utils/supabase/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecordingBookmark {
  id: string;
  timestamp: number; // seconds into the recording
  label: string;
  createdAt: string;
}

interface RecordingPlaybackProps {
  /** Single recording to play immediately */
  recording?: RecordingMetadata;
  /** Or provide a session/child to list multiple recordings */
  sessionId?: string;
  childId?: string;
  userId: string;
  /** Provider notes associated with the session */
  providerNotes?: string;
  onClose?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PLAYBACK_SPEEDS = [1, 1.5, 2] as const;
type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const BOOKMARKS_KEY = 'aminy_recording_bookmarks';

function getLocalBookmarks(recordingId: string): RecordingBookmark[] {
  try {
    const all = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '{}');
    return all[recordingId] || [];
  } catch {
    return [];
  }
}

function saveLocalBookmarks(recordingId: string, bookmarks: RecordingBookmark[]): void {
  try {
    const all = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '{}');
    all[recordingId] = bookmarks;
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(all));
  } catch {
    // storage full
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecordingPlayback({
  recording: initialRecording,
  sessionId,
  childId,
  userId,
  providerNotes,
  onClose,
}: RecordingPlaybackProps) {
  // Recordings list
  const [recordings, setRecordings] = useState<RecordingMetadata[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<RecordingMetadata | null>(
    initialRecording || null,
  );
  const [loadingList, setLoadingList] = useState(false);

  // Player state
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [consentVerified, setConsentVerified] = useState(false);
  const [consentChecking, setConsentChecking] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [error, setError] = useState<string | null>(null);

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<RecordingBookmark[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarkLabel, setBookmarkLabel] = useState('');

  // Metadata panel
  const [showMetadata, setShowMetadata] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const seekRef = useRef<HTMLInputElement>(null);

  // -----------------------------------------------------------------------
  // Load recordings list (if sessionId or childId provided)
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (initialRecording) {
      setRecordings([initialRecording]);
      return;
    }

    if (!sessionId && !childId) return;

    async function loadRecordings() {
      setLoadingList(true);
      try {
        let query = supabase
          .from('telehealth_recordings')
          .select('*')
          .eq('status', 'ready')
          .order('created_at', { ascending: false });

        if (sessionId) {
          query = query.eq('session_id', sessionId);
        }
        if (childId) {
          // Filter by patient_id when childId is used
          query = query.eq('patient_id', childId);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          console.warn('[RecordingPlayback] Fetch error:', fetchError.message);
          setError('Could not load recordings.');
          return;
        }

        const mapped: RecordingMetadata[] = (data || []).map((row: Record<string, unknown>) => ({
          id: row.id as string,
          sessionId: row.session_id as string,
          appointmentId: row.appointment_id as string | undefined,
          providerId: row.provider_id as string,
          patientId: row.patient_id as string,
          dailyRecordingId: row.daily_recording_id as string | undefined,
          storagePath: row.storage_path as string | undefined,
          status: row.status as RecordingMetadata['status'],
          durationSeconds: row.duration_seconds as number | undefined,
          fileSizeBytes: row.file_size_bytes as number | undefined,
          consents: [],
          createdAt: row.created_at as string,
          updatedAt: row.updated_at as string,
        }));

        setRecordings(mapped);
        if (mapped.length > 0 && !selectedRecording) {
          setSelectedRecording(mapped[0]);
        }
      } catch {
        setError('Failed to load recordings.');
      } finally {
        setLoadingList(false);
      }
    }

    loadRecordings();
  }, [sessionId, childId, initialRecording, selectedRecording]);

  // -----------------------------------------------------------------------
  // Consent check + signed URL for selected recording
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!selectedRecording) return;

    // Load bookmarks
    setBookmarks(getLocalBookmarks(selectedRecording.id));

    // Reset player
    setPlaybackUrl(null);
    setConsentVerified(false);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);

    async function prepare() {
      // 1. Check consent
      setConsentChecking(true);
      const consented = await hasAllConsents(selectedRecording!.sessionId);
      setConsentVerified(consented);
      setConsentChecking(false);

      if (!consented) {
        setError('Recording consent has not been verified for all participants. Playback is restricted.');
        return;
      }

      // 2. Get signed URL
      if (!selectedRecording!.storagePath) {
        setError('Recording file not available.');
        return;
      }

      setLoadingUrl(true);
      const url = await getRecordingPlaybackUrl(selectedRecording!.storagePath);
      if (url) {
        setPlaybackUrl(url);
      } else {
        setError('Could not generate playback URL. The recording may have expired.');
      }
      setLoadingUrl(false);
    }

    prepare();
  }, [selectedRecording]);

  // -----------------------------------------------------------------------
  // Video event handlers
  // -----------------------------------------------------------------------
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setPlaying(false);
  }, []);

  // -----------------------------------------------------------------------
  // Controls
  // -----------------------------------------------------------------------
  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
  }, [playing]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const skipForward = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 15, duration);
    }
  }, [duration]);

  const skipBack = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 15, 0);
    }
  }, []);

  const cycleSpeed = useCallback(() => {
    setSpeed(prev => {
      const idx = PLAYBACK_SPEEDS.indexOf(prev);
      const next = PLAYBACK_SPEEDS[(idx + 1) % PLAYBACK_SPEEDS.length];
      if (videoRef.current) {
        videoRef.current.playbackRate = next;
      }
      return next;
    });
  }, []);

  const seekToTimestamp = useCallback((timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
      setCurrentTime(timestamp);
      if (!playing) {
        videoRef.current.play();
        setPlaying(true);
      }
    }
  }, [playing]);

  // -----------------------------------------------------------------------
  // Bookmarks
  // -----------------------------------------------------------------------
  const addBookmark = useCallback(() => {
    if (!selectedRecording) return;
    const label = bookmarkLabel.trim() || `Bookmark at ${formatDuration(currentTime)}`;
    const bm: RecordingBookmark = {
      id: `bm-${Date.now()}`,
      timestamp: currentTime,
      label,
      createdAt: new Date().toISOString(),
    };
    const updated = [...bookmarks, bm].sort((a, b) => a.timestamp - b.timestamp);
    setBookmarks(updated);
    saveLocalBookmarks(selectedRecording.id, updated);
    setBookmarkLabel('');
  }, [selectedRecording, bookmarks, currentTime, bookmarkLabel]);

  const removeBookmark = useCallback(
    (bmId: string) => {
      if (!selectedRecording) return;
      const updated = bookmarks.filter(b => b.id !== bmId);
      setBookmarks(updated);
      saveLocalBookmarks(selectedRecording.id, updated);
    },
    [selectedRecording, bookmarks],
  );

  // -----------------------------------------------------------------------
  // Download (with consent re-check)
  // -----------------------------------------------------------------------
  const handleDownload = useCallback(async () => {
    if (!selectedRecording || !playbackUrl) return;

    // Re-verify consent before download
    const consented = await hasAllConsents(selectedRecording.sessionId);
    if (!consented) {
      setError('Cannot download: consent verification failed.');
      return;
    }

    // Trigger download
    const a = document.createElement('a');
    a.href = playbackUrl;
    a.download = `session-${selectedRecording.sessionId.slice(0, 8)}-${new Date(selectedRecording.createdAt).toISOString().slice(0, 10)}.webm`;
    a.click();
  }, [selectedRecording, playbackUrl]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="fixed inset-0 bg-gray-900/70 flex items-start justify-center z-50 overflow-y-auto p-4 pt-6 pb-6">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-50 rounded-full flex items-center justify-center flex-shrink-0">
              <Video className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Session Recordings</h2>
              <p className="text-xs text-gray-500">{recordings.length} recording{recordings.length !== 1 ? 's' : ''} available</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Recording list (if multiple) */}
        {recordings.length > 1 && (
          <div className="px-4 py-3 border-b border-gray-100 flex gap-2 overflow-x-auto">
            {recordings.map(rec => (
              <button
                key={rec.id}
                onClick={() => setSelectedRecording(rec)}
                className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  selectedRecording?.id === rec.id
                    ? 'bg-teal-50 text-teal-700 border border-teal-200'
                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Calendar size={11} />
                  {formatDate(rec.createdAt)}
                </span>
                {rec.durationSeconds && (
                  <span className="block text-[10px] text-gray-400 mt-0.5">
                    {formatDuration(rec.durationSeconds)}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {(loadingList || loadingUrl || consentChecking) && (
          <div className="p-12 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
            <p className="text-sm text-gray-500">
              {consentChecking ? 'Verifying consent...' : loadingUrl ? 'Loading recording...' : 'Loading recordings...'}
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loadingList && !loadingUrl && !consentChecking && (
          <div className="p-6">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Playback Restricted</p>
                <p className="text-xs text-amber-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Video player */}
        {playbackUrl && selectedRecording && !error && (
          <div className="p-4 space-y-3">
            {/* Video element */}
            <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
              <video
                ref={videoRef}
                src={playbackUrl}
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
                playsInline
              />
              {/* HIPAA overlay */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 rounded-full px-2.5 py-1 text-[10px] text-white/70">
                <Shield size={10} />
                HIPAA Protected
              </div>
            </div>

            {/* Seek bar */}
            <div className="space-y-1">
              <input
                ref={seekRef}
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-teal-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>{formatDuration(currentTime)}</span>
                <span>{formatDuration(duration)}</span>
              </div>
            </div>

            {/* Controls row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Skip back 15s */}
                <button
                  onClick={skipBack}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Skip back 15 seconds"
                >
                  <SkipBack size={18} />
                </button>

                {/* Play/Pause */}
                <button
                  onClick={togglePlayPause}
                  className="p-3 bg-teal-600 hover:bg-teal-700 text-white rounded-full transition-colors"
                  aria-label={playing ? 'Pause' : 'Play'}
                >
                  {playing ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                </button>

                {/* Skip forward 15s */}
                <button
                  onClick={skipForward}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Skip forward 15 seconds"
                >
                  <SkipForward size={18} />
                </button>

                {/* Speed control */}
                <button
                  onClick={cycleSpeed}
                  className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors flex items-center gap-1"
                  aria-label={`Playback speed: ${speed}x`}
                >
                  <Gauge size={12} />
                  {speed}x
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Bookmark */}
                <button
                  onClick={() => setShowBookmarks(!showBookmarks)}
                  className={`p-2 rounded-full transition-colors ${
                    showBookmarks ? 'text-teal-600 bg-teal-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  aria-label="Bookmarks"
                >
                  <Bookmark size={16} />
                </button>

                {/* Metadata */}
                <button
                  onClick={() => setShowMetadata(!showMetadata)}
                  className={`p-2 rounded-full transition-colors ${
                    showMetadata ? 'text-teal-600 bg-teal-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  aria-label="Recording details"
                >
                  <FileText size={16} />
                </button>

                {/* Download */}
                <button
                  onClick={handleDownload}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Download recording"
                >
                  <Download size={16} />
                </button>
              </div>
            </div>

            {/* Bookmarks panel */}
            {showBookmarks && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <BookmarkCheck size={13} />
                  Bookmarks ({bookmarks.length})
                </h4>

                {/* Add new bookmark */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={bookmarkLabel}
                    onChange={e => setBookmarkLabel(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addBookmark()}
                    placeholder={`Bookmark at ${formatDuration(currentTime)}...`}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
                  />
                  <button
                    onClick={addBookmark}
                    className="px-3 py-1.5 text-xs font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    Add
                  </button>
                </div>

                {/* Bookmark list */}
                {bookmarks.length > 0 ? (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {bookmarks.map(bm => (
                      <div
                        key={bm.id}
                        className="flex items-center gap-2 group"
                      >
                        <button
                          onClick={() => seekToTimestamp(bm.timestamp)}
                          className="flex-1 flex items-center gap-2 px-2 py-1.5 text-xs text-left rounded-lg hover:bg-white transition-colors"
                        >
                          <span className="text-teal-600 font-mono font-medium w-12">
                            {formatDuration(bm.timestamp)}
                          </span>
                          <span className="text-gray-700 truncate">{bm.label}</span>
                        </button>
                        <button
                          onClick={() => removeBookmark(bm.id)}
                          className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          aria-label="Remove bookmark"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-400 text-center py-2">
                    No bookmarks yet. Add one to mark a key moment.
                  </p>
                )}
              </div>
            )}

            {/* Metadata panel */}
            {showMetadata && selectedRecording && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                <h4 className="text-xs font-semibold text-gray-700">Recording Details</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <span className="text-gray-400">Date</span>
                    <p className="text-gray-700 font-medium">{formatDate(selectedRecording.createdAt)}</p>
                  </div>
                  {selectedRecording.durationSeconds && (
                    <div>
                      <span className="text-gray-400">Duration</span>
                      <p className="text-gray-700 font-medium">{formatDuration(selectedRecording.durationSeconds)}</p>
                    </div>
                  )}
                  {selectedRecording.fileSizeBytes && (
                    <div>
                      <span className="text-gray-400">File Size</span>
                      <p className="text-gray-700 font-medium">{formatFileSize(selectedRecording.fileSizeBytes)}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-400">Session ID</span>
                    <p className="text-gray-700 font-mono text-[10px]">{selectedRecording.sessionId.slice(0, 12)}...</p>
                  </div>
                </div>
                {providerNotes && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <span className="text-gray-400 text-xs">Provider Notes</span>
                    <p className="text-gray-700 text-xs mt-1 leading-relaxed">{providerNotes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* No recordings */}
        {!loadingList && recordings.length === 0 && !error && (
          <div className="p-12 text-center">
            <Video className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No recordings available.</p>
            <p className="text-xs text-gray-400 mt-1">
              Recordings appear here after a session with recording consent enabled.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default RecordingPlayback;
