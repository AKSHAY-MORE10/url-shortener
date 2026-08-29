export const TOKEN_BUCKET_SCRIPT = `
local bucket_key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_per_sec = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local bucket = redis.call('HMGET', bucket_key, 'tokens', 'timestamp')
local tokens = tonumber(bucket[1])
local timestamp = tonumber(bucket[2])

if tokens == nil then
  tokens = capacity
  timestamp = now
end

local elapsed_sec = math.max(0, (now - timestamp) / 1000)
tokens = math.min(capacity, tokens + elapsed_sec * refill_per_sec)

local allowed = 0
if tokens >= requested then
  tokens = tokens - requested
  allowed = 1
end

redis.call('HMSET', bucket_key, 'tokens', tokens, 'timestamp', now)
redis.call('EXPIRE', bucket_key, 3600)

return { allowed, tokens }
`;
