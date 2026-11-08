
const { createClient } = require("redis");

let client;
let connectionAttempt;

function waitForReady(redis) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error("Timed out waiting for Redis to reconnect."));
        }, 10000);

        function cleanup() {
            clearTimeout(timeout);
            redis.off("ready", onReady);
        }

        function onReady() {
            cleanup();
            resolve();
        }

        redis.once("ready", onReady);
    });
}

async function connectDatabase() {
    if (!process.env.REDIS_URL) {
        throw new Error(
            "REDIS_URL is missing from the server environment."
        );
    }

    if (client?.isReady) {
        return;
    }

    if (connectionAttempt) {
        await connectionAttempt;
        return;
    }

    if (!client) {
        client = createClient({
            url: process.env.REDIS_URL
        });

        client.on("error", error => {
            console.error("Redis error:", error.message);
        });
    }

    connectionAttempt = client.isOpen
        ? waitForReady(client)
        : client.connect();

    try {
        await connectionAttempt;
        console.log("Connected to Redis successfully.");
    } finally {
        connectionAttempt = null;
    }
}

async function getClient() {
    if (!client?.isReady) {
        await connectDatabase();
    }

    return client;
}

async function get(key) {
    const redis = await getClient();
    const value = await redis.get(key);

    return value === null ? null : JSON.parse(value);
}

async function set(key, value) {
    const redis = await getClient();

    await redis.set(key, JSON.stringify(value));

    return value;
}

async function setMany(entries) {
    const redis = await getClient();
    const transaction = redis.multi();

    for (const { key, value } of entries) {
        transaction.set(key, JSON.stringify(value));
    }

    await transaction.exec();

    return entries.map(({ value }) => value);
}

async function remove(key) {
    const redis = await getClient();

    return redis.del(key);
}

async function getAll(prefix) {
    const redis = await getClient();
    const keys = await redis.keys(`${prefix}*`);

    if (keys.length === 0) {
        return [];
    }

    const values = await redis.mGet(keys);

    return values
        .filter(value => value !== null)
        .map(value => JSON.parse(value));
}

async function ping() {
    const redis = await getClient();

    return redis.ping();
}

module.exports = {
    connectDatabase,
    get,
    set,
    setMany,
    remove,
    getAll,
    ping
};
