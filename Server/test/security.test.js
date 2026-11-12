const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const bcrypt = require("bcryptjs");
const database = require("../Config/database");

process.env.NODE_ENV = "test";
process.env.CORS_ORIGINS = "https://brewhaus.example";
process.env.JWT_SECRET = "test-only-jwt-secret";
process.env.STAFF_USERNAME = "staff";
process.env.STAFF_PASSWORD_HASH = bcrypt.hashSync(
    "correct-test-password",
    4
);

const { app, getAllowedOrigins } = require("../server");
const server = app.listen(0);
const stored = new Map();
const products = new Map([
    ["menu:coffee-1", {
        id: "coffee-1",
        name: "Latte",
        price: 4.5,
        available: true
    }]
]);
let nextDatabaseError = null;
let capturedLogs = [];
const originalConsoleError = console.error;

database.get = async key => {
    if (nextDatabaseError) {
        const error = nextDatabaseError;
        nextDatabaseError = null;
        throw error;
    }

    if (products.has(key)) return products.get(key);
    return stored.has(key) ? stored.get(key) : null;
};
database.set = async (key, value) => {
    if (key.startsWith("menu:")) products.set(key, value);
    else stored.set(key, value);
    return value;
};
database.setMany = async entries => {
    for (const { key, value } of entries) stored.set(key, value);
    return entries.map(({ value }) => value);
};
database.transitionOrderStatus = async (
    orderId,
    allowedStatuses,
    status,
    timestamp
) => {
    const key = `orders:${orderId}`;
    const order = stored.get(key);

    if (!order) {
        return { found: false, updated: false, order: null };
    }

    if (!allowedStatuses.includes(order.status)) {
        return { found: true, updated: false, order };
    }

    const updatedOrder = {
        ...order,
        status,
        updatedAt: timestamp
    };

    if (status === "Collected") {
        updatedOrder.collectedAt = timestamp;
    }

    stored.set(key, updatedOrder);
    return { found: true, updated: true, order: updatedOrder };
};
database.remove = async key => products.delete(key) || stored.delete(key);
database.getAll = async prefix => {
    if (nextDatabaseError) {
        const error = nextDatabaseError;
        nextDatabaseError = null;
        throw error;
    }

    const source = prefix === "menu:" ? products : stored;
    return [...source.entries()]
        .filter(([key]) => key.startsWith(prefix))
        .map(([, value]) => value);
};
database.ping = async () => "PONG";

let baseUrl;
let staffToken;
let createdOrder;

before(async () => {
    await new Promise(resolve => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api`;
    console.error = (...args) => capturedLogs.push(args.join(" "));
});

after(() => {
    console.error = originalConsoleError;
    server.close();
});

test("backend security and API regression coverage", async t => {
    await t.test("CORS supports allowed origins and preflight, rejects other origins", async () => {
        const preflight = await fetch(`${baseUrl}/orders`, {
            method: "OPTIONS",
            headers: {
                Origin: "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type"
            }
        });
        assert.equal(preflight.status, 204);
        assert.equal(
            preflight.headers.get("access-control-allow-origin"),
            "http://localhost:5173"
        );

        const productionOrigins = getAllowedOrigins({
            nodeEnv: "production",
            corsOrigins: "https://brewhaus.example, https://staff.example"
        });
        assert.equal(productionOrigins.has("https://brewhaus.example"), true);
        assert.equal(productionOrigins.has("http://localhost:5173"), false);

        const rejectedOrigin = await fetch(`${baseUrl}/menu`, {
            headers: { Origin: "https://untrusted.example" }
        });
        assert.equal(rejectedOrigin.status, 200);
        assert.equal(
            rejectedOrigin.headers.get("access-control-allow-origin"),
            null
        );
    });

    await t.test("customer menu remains public", async () => {
        const response = await fetch(`${baseUrl}/menu`);
        assert.equal(response.status, 200);
        assert.equal((await response.json())[0].name, "Latte");
    });

    await t.test("staff login issues a JWT and validates malformed credentials", async () => {
        const badInput = await fetch(`${baseUrl}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: 4, password: [] })
        });
        assert.equal(badInput.status, 400);

        const response = await fetch(`${baseUrl}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: " staff ",
                password: "correct-test-password"
            })
        });
        assert.equal(response.status, 200);
        staffToken = (await response.json()).token;
        assert.equal(typeof staffToken, "string");
    });

    await t.test("customer order validation rejects malformed inputs safely", async () => {
        const invalidOrders = [
            { customerName: 123, items: [{ productId: "coffee-1", quantity: 1 }] },
            { customerName: "   ", items: [{ productId: "coffee-1", quantity: 1 }] },
            { customerName: "N".repeat(81), items: [{ productId: "coffee-1", quantity: 1 }] },
            { customerName: "Customer", items: null },
            { customerName: "Customer", items: [null] },
            { customerName: "Customer", items: [{ productId: "menu:*", quantity: 1 }] },
            { customerName: "Customer", items: [{ productId: "coffee-1", quantity: 1.5 }] },
            { customerName: "Customer", items: [{ productId: "coffee-1", quantity: 51 }] },
            {
                customerName: "Customer",
                items: Array.from({ length: 21 }, () => ({
                    productId: "coffee-1",
                    quantity: 1
                }))
            }
        ];

        for (const order of invalidOrders) {
            const response = await fetch(`${baseUrl}/orders`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(order)
            });
            assert.equal(response.status, 400);
            assert.equal(typeof (await response.json()).message, "string");
        }
    });

    await t.test("customer checkout calculates from Redis product price and tracking stays safe", async () => {
        const response = await fetch(`${baseUrl}/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                customerName: "  Customer Name  ",
                items: [{
                    productId: "coffee-1",
                    quantity: 2,
                    price: 0.01,
                    name: "Client-supplied product"
                }]
            })
        });
        assert.equal(response.status, 201);
        createdOrder = await response.json();
        assert.equal(createdOrder.order.customerName, "Customer Name");
        assert.equal(createdOrder.order.total, 9);
        assert.equal(createdOrder.order.items[0].price, 4.5);
        assert.equal(createdOrder.order.items[0].name, "Latte");
        assert.match(createdOrder.trackingCode, /^[A-Za-z0-9_-]{43}$/);

        const trackingResponse = await fetch(`${baseUrl}/orders/track`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trackingCode: createdOrder.trackingCode })
        });
        assert.equal(trackingResponse.status, 200);
        const trackedOrder = await trackingResponse.json();
        assert.equal(trackedOrder.order.status, "Pending");
        assert.equal("customerName" in trackedOrder.order, false);
        assert.equal("id" in trackedOrder.order, false);

        const prematureConfirmation = await fetch(
            `${baseUrl}/orders/confirm-collection`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    trackingCode: createdOrder.trackingCode
                })
            }
        );
        assert.equal(prematureConfirmation.status, 409);

        const invalidConfirmation = await fetch(
            `${baseUrl}/orders/confirm-collection`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ trackingCode: "invalid" })
            }
        );
        assert.equal(invalidConfirmation.status, 400);

        const unknownConfirmation = await fetch(
            `${baseUrl}/orders/confirm-collection`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ trackingCode: "A".repeat(43) })
            }
        );
        assert.equal(unknownConfirmation.status, 404);
    });

    await t.test("staff authorization and product/order management still work", async () => {
        const unauthorized = await fetch(`${baseUrl}/orders`);
        assert.equal(unauthorized.status, 401);

        const productResponse = await fetch(`${baseUrl}/menu`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${staffToken}`
            },
            body: JSON.stringify({
                name: "Tea",
                description: "Test tea",
                price: 3,
                category: "Tea"
            })
        });
        assert.equal(productResponse.status, 201);
        const product = (await productResponse.json()).product;

        const statusResponse = await fetch(
            `${baseUrl}/orders/${createdOrder.order.id}/status`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${staffToken}`
                },
                body: JSON.stringify({ status: "Preparing" })
            }
        );
        assert.equal(statusResponse.status, 200);
        assert.equal((await statusResponse.json()).order.status, "Preparing");

        for (const status of ["Pending", "Preparing", "Ready"]) {
            const response = await fetch(
                `${baseUrl}/orders/${createdOrder.order.id}/status`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${staffToken}`
                    },
                    body: JSON.stringify({ status })
                }
            );
            assert.equal(response.status, 200);
            assert.equal((await response.json()).order.status, status);
        }

        const staffCollectionAttempt = await fetch(
            `${baseUrl}/orders/${createdOrder.order.id}/status`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${staffToken}`
                },
                body: JSON.stringify({ status: "Collected" })
            }
        );
        assert.equal(staffCollectionAttempt.status, 400);

        const collectionRequests = await Promise.all([
            fetch(`${baseUrl}/orders/confirm-collection`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    trackingCode: createdOrder.trackingCode
                })
            }),
            fetch(`${baseUrl}/orders/confirm-collection`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    trackingCode: createdOrder.trackingCode
                })
            })
        ]);
        assert.deepEqual(
            collectionRequests.map(response => response.status).sort(),
            [200, 200]
        );
        const collectionResults = await Promise.all(
            collectionRequests.map(response => response.json())
        );
        const collectionResult = collectionResults[0];
        assert.equal(collectionResult.order.status, "Collected");
        assert.equal(typeof collectionResult.order.collectedAt, "string");
        assert.equal(
            collectionResults[1].order.collectedAt,
            collectionResult.order.collectedAt
        );
        assert.equal("customerName" in collectionResult.order, false);
        assert.equal("id" in collectionResult.order, false);

        const revertAttempt = await fetch(
            `${baseUrl}/orders/${createdOrder.order.id}/status`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${staffToken}`
                },
                body: JSON.stringify({ status: "Preparing" })
            }
        );
        assert.equal(revertAttempt.status, 409);

        const staffOrders = await fetch(`${baseUrl}/orders`, {
            headers: { Authorization: `Bearer ${staffToken}` }
        });
        const storedOrders = await staffOrders.json();
        assert.equal(storedOrders[0].status, "Collected");

        const analyticsResponse = await fetch(`${baseUrl}/orders/analytics`, {
            headers: { Authorization: `Bearer ${staffToken}` }
        });
        assert.equal(analyticsResponse.status, 200);
        const analytics = await analyticsResponse.json();
        assert.equal(analytics.statusCounts.Collected, 1);
        assert.equal(analytics.totalRevenue, 9);
        assert.equal(analytics.topProducts[0].quantity, 2);
        assert.deepEqual(
            analytics.weeklyRevenue.map(day => day.weekday),
            ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        );
        assert.equal(analytics.weeklyRevenue.length, 7);
        assert.equal(analytics.weeklyTotalRevenue, 9);
        assert.equal(analytics.monthlyRevenue, 9);
        assert.equal(analytics.monthlyProducts[0].name, "Latte");
        assert.equal(analytics.monthlyProducts[0].revenue, 9);
        assert.equal(analytics.monthlyProducts[0].percentage, 100);
        const localDateParts = Object.fromEntries(
            new Intl.DateTimeFormat("en", {
                timeZone: "Africa/Maseru",
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }).formatToParts(new Date(collectionResult.order.collectedAt))
                .filter(part => part.type !== "literal")
                .map(part => [part.type, part.value])
        );
        const collectedLocalDate =
            `${localDateParts.year}-${localDateParts.month}-${localDateParts.day}`;
        assert.equal(
            analytics.dailyRevenue.find(day =>
                day.date === collectedLocalDate
            ).revenue,
            9
        );
        assert.equal(
            analytics.weeklyRevenue.find(day => day.date === collectedLocalDate)
                .revenue,
            9
        );
        assert.equal(
            analytics.weeklyRevenue.filter(day => day.revenue === 0).length,
            6
        );

        stored.set("orders:historical-collected", {
            id: "historical-collected",
            status: "Collected",
            total: 2,
            createdAt: "2018-01-01T00:00:00.000Z",
            updatedAt: `${analytics.weeklyRevenue[0].date}T22:30:00.000Z`,
            items: [{
                productId: "coffee-1",
                name: "Latte",
                price: 2,
                quantity: 1
            }]
        });

        const fallbackAnalyticsResponse = await fetch(
            `${baseUrl}/orders/analytics`,
            { headers: { Authorization: `Bearer ${staffToken}` } }
        );
        const fallbackAnalytics = await fallbackAnalyticsResponse.json();
        assert.equal(fallbackAnalytics.totalRevenue, 11);
        assert.equal(
            fallbackAnalytics.weeklyRevenue[1].revenue,
            analytics.weeklyRevenue[1].revenue + 2
        );

        const deleteResponse = await fetch(`${baseUrl}/menu/${product.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${staffToken}` }
        });
        assert.equal(deleteResponse.status, 200);
    });

    await t.test("internal failures return generic messages and sanitize server logs", async () => {
        nextDatabaseError = new Error(
            "password=supersecret rediss://user:secret@redis.example"
        );
        const menuResponse = await fetch(`${baseUrl}/menu`);
        assert.equal(menuResponse.status, 500);
        const body = await menuResponse.json();
        assert.deepEqual(body, { message: "Unable to retrieve menu." });
        assert.equal(JSON.stringify(body).includes("supersecret"), false);
        assert.equal(capturedLogs.some(line =>
            line.includes("supersecret") || line.includes("user:secret")
        ), false);
        assert.equal(capturedLogs.length > 0, true);

        const malformedJson = await fetch(`${baseUrl}/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{"
        });
        assert.equal(malformedJson.status, 400);
        assert.equal(
            (await malformedJson.json()).message,
            "The request body is invalid or too large."
        );
    });

    await t.test("staff login and order creation are rate limited", async () => {
        for (let attempt = 0; attempt < 3; attempt += 1) {
            const response = await fetch(`${baseUrl}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: "staff",
                    password: "wrong-password"
                })
            });
            assert.equal(response.status, 401);
        }
        const limitedLogin = await fetch(`${baseUrl}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: "staff", password: "wrong" })
        });
        assert.equal(limitedLogin.status, 429);
        assert.equal(
            (await limitedLogin.json()).message,
            "Too many sign-in attempts. Please try again later."
        );

        const limitedOrder = await fetch(`${baseUrl}/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ customerName: "", items: [] })
        });
        assert.equal(limitedOrder.status, 429);
        assert.equal(
            (await limitedOrder.json()).message,
            "Too many orders placed. Please try again later."
        );
    });
});
