import Redis from 'ioredis';

const EVENTS_CHANNEL = 'muusic:realtime:events';

function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function createRealtimeClusterService({
  redisUrl = process.env.REDIS_URL || '',
  instanceId,
  maxMessages = 200
} = {}) {
  const localRooms = new Map();
  const nodeId = instanceId || `node-${Math.random().toString(36).slice(2, 10)}`;

  let io = null;
  let stateClient = null;
  let pubClient = null;
  let subClient = null;
  let redisEnabled = false;

  function getLocalRoom(roomId) {
    if (!localRooms.has(roomId)) {
      localRooms.set(roomId, {
        users: new Map(),
        messages: []
      });
    }
    return localRooms.get(roomId);
  }

  function toPresenceArray(usersMap) {
    return Array.from(usersMap.values()).map((user) => ({
      id: user.id,
      name: user.name,
      spotify: user.spotify,
      location: user.location || null,
      connectedAt: user.connectedAt
    }));
  }

  function usersKey(roomId) {
    return `muusic:room:${roomId}:users`;
  }

  function messagesKey(roomId) {
    return `muusic:room:${roomId}:messages`;
  }

  async function publish(event, roomId, payload) {
    if (!redisEnabled || !pubClient) return;
    await pubClient.publish(
      EVENTS_CHANNEL,
      JSON.stringify({
        origin: nodeId,
        event,
        roomId,
        payload
      })
    );
  }

  async function start(ioInstance) {
    io = ioInstance;
    if (!redisUrl) return;

    try {
      stateClient = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 2 });
      pubClient = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 2 });
      subClient = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 2 });

      await Promise.all([stateClient.connect(), pubClient.connect(), subClient.connect()]);
      redisEnabled = true;
      await subClient.subscribe(EVENTS_CHANNEL);

      subClient.on('message', (_channel, message) => {
        const event = safeJsonParse(message);
        if (!event || event.origin === nodeId || !io) return;
        if (!event.roomId || !event.event) return;
        io.to(String(event.roomId)).emit(event.event, event.payload);
      });

      console.log('Realtime cluster enabled with Redis pub/sub');
    } catch (error) {
      redisEnabled = false;
      console.error('Realtime cluster fallback to single-node memory:', error.message);
      try {
        await stateClient?.quit();
      } catch {
        // noop
      }
      try {
        await pubClient?.quit();
      } catch {
        // noop
      }
      try {
        await subClient?.quit();
      } catch {
        // noop
      }
      stateClient = null;
      pubClient = null;
      subClient = null;
    }
  }

  async function getPresence(roomId) {
    const room = String(roomId);
    if (!redisEnabled || !stateClient) {
      const local = localRooms.get(room);
      return local ? toPresenceArray(local.users) : [];
    }

    const all = await stateClient.hgetall(usersKey(room));
    return Object.values(all)
      .map((raw) => safeJsonParse(raw))
      .filter(Boolean)
      .map((user) => ({
        id: user.id,
        name: user.name,
        spotify: user.spotify,
        location: user.location || null,
        connectedAt: user.connectedAt
      }));
  }

  async function getMessages(roomId) {
    const room = String(roomId);
    if (!redisEnabled || !stateClient) {
      const local = localRooms.get(room);
      return local ? [...local.messages] : [];
    }
    const items = await stateClient.lrange(messagesKey(room), 0, maxMessages - 1);
    return items
      .map((raw) => safeJsonParse(raw))
      .filter(Boolean)
      .reverse();
  }

  async function upsertUser(roomId, user) {
    const room = String(roomId);
    if (!redisEnabled || !stateClient) {
      const local = getLocalRoom(room);
      local.users.set(user.id, user);
      return getPresence(room);
    }

    await stateClient.hset(usersKey(room), user.id, JSON.stringify(user));
    const presence = await getPresence(room);
    await publish('presence:update', room, presence);
    return presence;
  }

  async function updateLocation(roomId, userId, location) {
    const room = String(roomId);
    if (!redisEnabled || !stateClient) {
      const local = getLocalRoom(room);
      const user = local.users.get(userId);
      if (!user) return null;
      user.location = location;
      return getPresence(room);
    }

    const raw = await stateClient.hget(usersKey(room), userId);
    if (!raw) return null;
    const user = safeJsonParse(raw);
    if (!user) return null;
    user.location = location;
    await stateClient.hset(usersKey(room), userId, JSON.stringify(user));
    const presence = await getPresence(room);
    await publish('presence:update', room, presence);
    return presence;
  }

  async function removeUser(roomId, userId) {
    const room = String(roomId);
    if (!redisEnabled || !stateClient) {
      const local = localRooms.get(room);
      if (!local) return [];
      local.users.delete(userId);
      if (local.users.size === 0) localRooms.delete(room);
      return getPresence(room);
    }

    await stateClient.hdel(usersKey(room), userId);
    const usersCount = await stateClient.hlen(usersKey(room));
    if (usersCount === 0) {
      await stateClient.del(usersKey(room));
      await stateClient.del(messagesKey(room));
    }
    const presence = usersCount === 0 ? [] : await getPresence(room);
    await publish('presence:update', room, presence);
    return presence;
  }

  async function appendMessage(roomId, message) {
    const room = String(roomId);
    if (!redisEnabled || !stateClient) {
      const local = getLocalRoom(room);
      local.messages.push(message);
      if (local.messages.length > maxMessages) local.messages.shift();
      return message;
    }

    await stateClient.lpush(messagesKey(room), JSON.stringify(message));
    await stateClient.ltrim(messagesKey(room), 0, maxMessages - 1);
    await publish('chat:new', room, message);
    return message;
  }

  async function stop() {
    if (!redisEnabled) return;
    try {
      await subClient?.unsubscribe(EVENTS_CHANNEL);
    } catch {
      // noop
    }
    try {
      await Promise.all([stateClient?.quit(), pubClient?.quit(), subClient?.quit()]);
    } catch {
      // noop
    }
    redisEnabled = false;
  }

  return {
    start,
    stop,
    getPresence,
    getMessages,
    upsertUser,
    updateLocation,
    removeUser,
    appendMessage
  };
}
