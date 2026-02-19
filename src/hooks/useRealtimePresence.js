import { useEffect, useRef, useState } from 'react';
import { API_URL, ENABLE_REALTIME } from '../config/appConfig';

export function useRealtimePresence(authUser) {
  const [roomId, setRoomId] = useState(localStorage.getItem('room_id') || 'duo-room');
  const [userId, setUserId] = useState(localStorage.getItem('user_id') || `user-${Math.floor(Math.random() * 9999)}`);
  const [username, setUsername] = useState(localStorage.getItem('username') || 'Convidado');
  const [users, setUsers] = useState([]);
  const [joined, setJoined] = useState(false);
  const socketRef = useRef(null);
  const authToken = authUser?.token || '';
  const authSessionId = authUser?.sessionId || '';
  const authId = authUser?.id || '';
  const authName = authUser?.name || '';
  const authSpotify = authUser?.spotify || null;

  useEffect(() => {
    localStorage.setItem('room_id', roomId);
  }, [roomId]);

  useEffect(() => {
    localStorage.setItem('user_id', userId);
  }, [userId]);

  useEffect(() => {
    localStorage.setItem('username', username);
  }, [username]);

  useEffect(() => {
    if (!ENABLE_REALTIME) return undefined;
    if (!authToken) return undefined;

    let cancelled = false;
    let socket = null;

    const bootstrapSocket = async () => {
      const socketIoModule = await import('socket.io-client');
      if (cancelled) return;
      const { io } = socketIoModule;

      socket = io(API_URL, {
        transports: ['websocket']
      });

      socketRef.current = socket;

      const applyPresencePatch = (patch) => {
        if (!patch || typeof patch !== 'object') return;
        const type = String(patch.type || '');
        if (type === 'remove') {
          const removeId = String(patch.userId || '');
          if (!removeId) return;
          setUsers((prev) => prev.filter((user) => String(user?.id || '') !== removeId));
          return;
        }
        if (type === 'upsert') {
          const nextUser = patch.user;
          const nextId = String(nextUser?.id || '');
          if (!nextId) return;
          setUsers((prev) => {
            const list = Array.isArray(prev) ? [...prev] : [];
            const idx = list.findIndex((user) => String(user?.id || '') === nextId);
            if (idx >= 0) {
              list[idx] = {
                ...list[idx],
                ...nextUser
              };
            } else {
              list.push(nextUser);
            }
            return list;
          });
        }
      };

      socket.on('presence:update', (presence) => {
        setUsers(Array.isArray(presence) ? presence : []);
      });

      socket.on('presence:patch', (patch) => {
        applyPresencePatch(patch);
      });

      socket.on('presence:batch', (payload) => {
        const patches = Array.isArray(payload?.patches) ? payload.patches : [];
        if (!patches.length) return;
        patches.forEach((patch) => applyPresencePatch(patch));
      });

      socket.on('connect', () => {
        const isGuest = authToken === 'guest-local';
        socket.emit(
          'room:join',
          {
            roomId,
            userId: authId || userId,
            name: authName || username,
            spotify: authSpotify,
            token: isGuest ? undefined : authToken,
            sessionId: isGuest ? '' : authSessionId
          },
          (result) => {
            if (result?.ok) {
              setJoined(true);
              setRoomId(result.roomId);
              setUserId(result.userId);
            }
          }
        );
      });
    };

    bootstrapSocket().catch(() => {
      if (!cancelled) {
        setJoined(false);
      }
    });

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [roomId, userId, username, authToken, authSessionId, authId, authName, authSpotify]);

  return {
    roomId,
    setRoomId,
    userId,
    setUserId,
    username,
    setUsername,
    users,
    joined,
    socketRef
  };
}
