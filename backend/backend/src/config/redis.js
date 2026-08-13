const { createClient } = require("redis");

let redisClient = null;

const connectRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });

    redisClient.on("error", (err) => {
      console.log("Redis Error:", err.message);
    });

    await redisClient.connect();

    console.log("Redis connected");

    return redisClient;
  } catch (error) {
    console.log("Redis not connected:", error.message);
    return null;
  }
};

const getRedis = () => redisClient;

module.exports = {
  connectRedis,
  getRedis,
};