
const { createClient } = require("redis");

let client;
const memoryStore = new Map();

async function connectDatabase() {
    if (!process.env.REDIS_URL) {
        console.warn("Redis URL missing. Using temporary memory storage.");
        return;
    }

    client = createClient({
        url: process.env.REDIS_URL
    });

    client.on("error", (error) => {
        console.error("Redis error:", error.message);
    });

    await client.connect();
    console.log("Redis connected successfully");
}

async function get(key) {
    if (!client) return memoryStore.get(key) ?? null;

    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
}

async function set(key, value) {
    if (!client) {
        memoryStore.set(key, value);
        return;
    }

    await client.set(key, JSON.stringify(value));
}

async function remove(key) {
    if (!client) {
        memoryStore.delete(key);
        return;
    }

    await client.del(key);
}

async function getAll(prefix) {
    if (!client) {
        return [...memoryStore.entries()]
            .filter(([key]) => key.startsWith(prefix))
            .map(([, value]) => value);
    }

    const keys = await client.keys(`${prefix}*`);
    if (!keys.length) return [];

    const values = await client.mGet(keys);
    return values
        .filter(Boolean)
        .map(value => JSON.parse(value));
}

module.exports = { connectDatabase, get, set, remove, getAll };
