/**
 * Daily.co Video Routes
 *
 * Backend handlers for real-time video calls
 * Requires DAILY_API_KEY in Supabase secrets
 */

const DAILY_API_KEY = Deno.env.get('DAILY_API_KEY') || '';
const DAILY_API_URL = 'https://api.daily.co/v1';

// Helper to make Daily API calls
async function dailyRequest(
  endpoint: string,
  method: string = 'GET',
  body?: Record<string, any>
) {
  const url = `${DAILY_API_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${DAILY_API_KEY}`,
    'Content-Type': 'application/json',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.info || 'Daily API error');
  }

  return data;
}

/**
 * Create a Daily.co room for a telehealth session
 */
export async function createRoom(req: Request): Promise<Response> {
  try {
    const {
      sessionId,
      privacy = 'private',
      expiryMinutes = 120,
      maxParticipants = 4,
      enableKnocking = true,
      enableScreenShare = true,
      enableChat = true,
      enableRecording = false,
    } = await req.json();

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Missing sessionId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!DAILY_API_KEY) {
      // Return mock room for development
      return new Response(JSON.stringify({
        id: `mock-${sessionId}`,
        name: `aminy-${sessionId}`,
        url: `https://aminy.daily.co/aminy-${sessionId}`,
        apiCreated: true,
        privacy: privacy,
        config: {},
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + expiryMinutes * 60000).toISOString(),
        mock: true,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Calculate expiry timestamp
    const expiryTime = Math.floor(Date.now() / 1000) + (expiryMinutes * 60);

    // Create room via Daily API
    const room = await dailyRequest('/rooms', 'POST', {
      name: `aminy-${sessionId}`,
      privacy,
      properties: {
        exp: expiryTime,
        max_participants: maxParticipants,
        enable_knocking: enableKnocking,
        enable_screenshare: enableScreenShare,
        enable_chat: enableChat,
        enable_recording: enableRecording ? 'cloud' : false,
        start_video_off: false,
        start_audio_off: false,
        lang: 'en',
        // HIPAA compliance settings
        enable_prejoin_ui: true,
        enable_network_ui: true,
        enable_people_ui: true,
        signaling_impl: 'ws',
      },
    });

    return new Response(JSON.stringify({
      id: room.id,
      name: room.name,
      url: room.url,
      apiCreated: room.api_created,
      privacy: room.privacy,
      config: room.config,
      createdAt: room.created_at,
      expiresAt: new Date(expiryTime * 1000).toISOString(),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Create room error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Get a meeting token for a participant
 */
export async function getMeetingToken(req: Request): Promise<Response> {
  try {
    const {
      roomName,
      userId,
      userName,
      isProvider = false,
    } = await req.json();

    if (!roomName || !userId || !userName) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!DAILY_API_KEY) {
      return new Response(JSON.stringify({
        token: 'mock-token-for-development',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        mock: true,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Token expires in 2 hours
    const expiryTime = Math.floor(Date.now() / 1000) + 7200;

    // Create meeting token via Daily API
    const tokenResponse = await dailyRequest('/meeting-tokens', 'POST', {
      properties: {
        room_name: roomName,
        user_id: userId,
        user_name: userName,
        exp: expiryTime,
        is_owner: isProvider, // Providers get owner privileges
        enable_screenshare: true,
        enable_recording: isProvider ? 'cloud' : false,
        start_video_off: false,
        start_audio_off: false,
      },
    });

    return new Response(JSON.stringify({
      token: tokenResponse.token,
      expiresAt: new Date(expiryTime * 1000).toISOString(),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get token error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Get room info by name
 */
export async function getRoom(roomName: string): Promise<Response> {
  try {
    if (!DAILY_API_KEY) {
      return new Response(JSON.stringify({
        id: `mock-${roomName}`,
        name: roomName,
        url: `https://aminy.daily.co/${roomName}`,
        apiCreated: true,
        privacy: 'private',
        config: {},
        createdAt: new Date().toISOString(),
        mock: true,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const room = await dailyRequest(`/rooms/${roomName}`);

    return new Response(JSON.stringify({
      id: room.id,
      name: room.name,
      url: room.url,
      apiCreated: room.api_created,
      privacy: room.privacy,
      config: room.config,
      createdAt: room.created_at,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get room error:', error);
    if (error.message?.includes('not found')) {
      return new Response(JSON.stringify({ error: 'Room not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Delete a room
 */
export async function deleteRoom(roomName: string): Promise<Response> {
  try {
    if (!DAILY_API_KEY) {
      return new Response(JSON.stringify({ success: true, mock: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await dailyRequest(`/rooms/${roomName}`, 'DELETE');

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Delete room error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Get room presence (who's in the room)
 */
export async function getRoomPresence(roomName: string): Promise<Response> {
  try {
    if (!DAILY_API_KEY) {
      return new Response(JSON.stringify({
        totalCount: 0,
        participants: [],
        mock: true,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const presence = await dailyRequest(`/rooms/${roomName}/presence`);

    return new Response(JSON.stringify({
      totalCount: presence.total_count || 0,
      participants: (presence.data || []).map((p: any) => ({
        sessionId: p.session_id,
        oderId: p.user_id,
        userName: p.user_name,
        joinTime: p.join_time,
        duration: p.duration,
      })),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get presence error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Start recording a session
 */
export async function startRecording(roomName: string): Promise<Response> {
  try {
    if (!DAILY_API_KEY) {
      return new Response(JSON.stringify({
        recordingId: 'mock-recording',
        status: 'started',
        mock: true,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const recording = await dailyRequest(`/rooms/${roomName}/recordings`, 'POST', {
      type: 'cloud',
    });

    return new Response(JSON.stringify({
      recordingId: recording.id,
      status: 'started',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Start recording error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Stop recording a session
 */
export async function stopRecording(roomName: string): Promise<Response> {
  try {
    if (!DAILY_API_KEY) {
      return new Response(JSON.stringify({
        status: 'stopped',
        mock: true,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get active recording
    const recordings = await dailyRequest(`/rooms/${roomName}/recordings`);
    const activeRecording = recordings.data?.find((r: any) => r.status === 'in-progress');

    if (activeRecording) {
      await dailyRequest(`/recordings/${activeRecording.id}`, 'DELETE');
    }

    return new Response(JSON.stringify({ status: 'stopped' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Stop recording error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export default {
  createRoom,
  getMeetingToken,
  getRoom,
  deleteRoom,
  getRoomPresence,
  startRecording,
  stopRecording,
};
