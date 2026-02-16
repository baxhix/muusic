import Redis from 'ioredis';

const USE_REDIS = Boolean(process.env.REDIS_URL);

let client = null;
let redisReady = false;

if (USE_REDIS) {
  client = new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    enableReadyCheck: true
  });

  client
    .connect()
    .then(() => {
      redisReady = true;
      console.log('Redis connected');
    })
    .catch((error) => {
      redisReady = false;
      console.error('Redis connection failed, running without Redis:', error.message);
    });

  client.on('error', (error) => {
    redisReady = false;
    console.error('Redis error:', error.message);
  });

  client.on('ready', () => {
    redisReady = true;
  });
}

class RedisService {
  get enabled() {
    return USE_REDIS && redisReady && Boolean(client);
  }

  async get(key) {
    if (!this.enabled) return null;
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key, value, ttl = 300) {
    if (!this.enabled) return;
    await client.set(key, JSON.stringify(value), 'EX', ttl);
  }

  async delete(key) {
    if (!this.enabled) return;
    await client.del(key);
  }

  async exists(key) {
    if (!this.enabled) return false;
    return (await client.exists(key)) === 1;
  }

  async keys(pattern) {
    if (!this.enabled) return [];
    return client.keys(pattern);
  }

  async deleteMany(keys) {
    if (!this.enabled || !Array.isArray(keys) || keys.length === 0) return;
    await client.del(...keys);
  }

  async disconnect() {
    if (!client) return;
    try {
      await client.quit();
    } catch {
      // noop
    }
  }
}

const redisService = new RedisService();
export default redisService;
