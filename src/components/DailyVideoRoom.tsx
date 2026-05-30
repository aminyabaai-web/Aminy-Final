// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

import React, { useEffect, useRef } from 'react';
import {
    DailyProvider,
    useDaily,
    useVideoTrack,
    useAudioTrack,
    useLocalSessionId,
    useParticipantIds,
    useMeetingState
} from '@daily-co/daily-react';
import { Users, Loader2 } from 'lucide-react';

// Renders a single participant's video/audio
const DailyParticipant = ({ sessionId, isLocal }: { sessionId: string, isLocal?: boolean }) => {
    const videoState = useVideoTrack(sessionId);
    const audioState = useAudioTrack(sessionId);
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Attach video track
    useEffect(() => {
        if (videoRef.current && videoState?.track) {
            videoRef.current.srcObject = new MediaStream([videoState.track]);
        }
    }, [videoState?.track]);

    // Attach audio track (only for remote participants)
    useEffect(() => {
        if (!isLocal && audioRef.current && audioState?.track && !audioState?.isOff) {
            audioRef.current.srcObject = new MediaStream([audioState.track]);
        }
    }, [audioState?.track, audioState?.isOff, isLocal]);

    if (!videoState?.track) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-slate-800 rounded-2xl">
                <Users className="w-12 h-12 text-slate-600" />
            </div>
        );
    }

    return (
        <div className="relative w-full h-full rounded-2xl overflow-hidden bg-black shadow-lg">
            <video
                ref={videoRef}
                autoPlay
                muted={isLocal}
                playsInline
                className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
            />
            {!isLocal && <audio ref={audioRef} autoPlay playsInline />}
        </div>
    );
};

const DailyGrid = ({ roomUrl }: { roomUrl: string }) => {
    const daily = useDaily();
    const localSessionId = useLocalSessionId();
    const remoteParticipantIds = useParticipantIds({ filter: 'remote' });
    const callState = useMeetingState();

    // Join/leave the room using the provider-owned call object. Leaving (not
    // destroying) keeps the instance valid across React StrictMode's
    // double-mount cycle, so we never re-join a destroyed object.
    useEffect(() => {
        if (!daily || !roomUrl) return;

        daily.join({ url: roomUrl });

        return () => {
            daily.leave();
        };
    }, [daily, roomUrl]);

    if (callState === 'joining-meeting') {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 border border-slate-800 rounded-2xl">
                <Loader2 className="w-8 h-8 text-teal-500 animate-spin mb-4" />
                <p className="text-slate-400 font-medium">Connecting to secure room...</p>
            </div>
        );
    }

    if (callState === 'error') {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 border border-rose-900/50 rounded-2xl">
                <p className="text-rose-400 font-medium">Failed to join room. Please check your network.</p>
            </div>
        );
    }

    // Display remote participant taking up the main view, with local user in PiP
    const mainRemoteId = remoteParticipantIds[0];

    return (
        <div className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden">
            {/* Main Remote Video Feed */}
            {mainRemoteId ? (
                <DailyParticipant sessionId={mainRemoteId} />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500">
                    <Users className="w-16 h-16 mb-4 opacity-50" />
                    <p className="font-medium">Waiting for others to join...</p>
                </div>
            )}

            {/* Local Picture-in-Picture */}
            {localSessionId && (
                <div className="absolute bottom-6 left-6 w-40 aspect-[3/4] z-10 transition-transform hover:scale-105 border-2 border-slate-700/50 rounded-xl overflow-hidden shadow-2xl">
                    <DailyParticipant sessionId={localSessionId} isLocal />
                </div>
            )}
        </div>
    );
};

export const DailyVideoRoom = ({ roomUrl }: { roomUrl: string }) => {
    // Let DailyProvider own the call-object lifecycle. It recreates the
    // instance if a previous one was destroyed and does not destroy on
    // cleanup, which avoids the StrictMode "call object destroyed" race.
    return (
        <DailyProvider
            dailyConfig={{
                useDevicePreferenceCookies: true,
            }}
        >
            <DailyGrid roomUrl={roomUrl} />
        </DailyProvider>
    );
};
