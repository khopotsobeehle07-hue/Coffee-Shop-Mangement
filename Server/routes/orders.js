
const express = require("express");
const { randomUUID } = require("crypto");
const staffAuth = require("../middleware/auth");
const database = require("../Config/database");
const {
    createTrackingToken,
    publicOrderView
} = require("../../utils/orderTracking");

const router = express.Router();

const trackingCodePattern = /^[A-Za-z0-9_-]{43}$/;
const validStatuses = [
    "Pending",
    "Preparing",
    "Ready",
    "Collected"
];

// Staff: calculate sales analytics from existing order records
router.get("/analytics", staffAuth, async (req, res) => {
    try {
        const orders = await database.getAll("orders:");
        const collectedOrders = orders.filter(
            order => order.status === "Collected"
        );
        const statusCounts = Object.fromEntries(
            validStatuses.map(status => [status, 0])
        );
        const productSales = new Map();
        const dailyRevenue = new Map();
        const today = new Date();
        const todayUtc = Date.UTC(
            today.getUTCFullYear(),
            today.getUTCMonth(),
            today.getUTCDate()
        );

        for (const order of orders) {
            if (validStatuses.includes(order.status)) {
                statusCounts[order.status] += 1;
            }
        }

        let totalRevenue = 0;

        for (const order of collectedOrders) {
            const total = Number(order.total);

            if (Number.isFinite(total)) {
                totalRevenue += total;
            }

            for (const item of Array.isArray(order.items) ? order.items : []) {
                const quantity = Number(item.quantity);

                if (!item.name || !Number.isInteger(quantity) || quantity <= 0) {
                    continue;
                }

                const key = item.productId || item.name;
                const current = productSales.get(key) || {
                    name: item.name,
                    quantity: 0
                };
                current.quantity += quantity;
                productSales.set(key, current);
            }

            const timestamp = order.updatedAt || order.createdAt;
            const date = typeof timestamp === "string"
                ? timestamp.slice(0, 10)
                : "";
            const parsedDate = new Date(`${date}T00:00:00.000Z`);

            if (!Number.isNaN(parsedDate.getTime())) {
                const dayRevenue = Number.isFinite(total) ? total : 0;
                dailyRevenue.set(
                    date,
                    (dailyRevenue.get(date) || 0) + dayRevenue
                );
            }
        }

        const dailyRevenueSeries = Array.from({ length: 7 }, (_, index) => {
            const day = new Date(todayUtc - (6 - index) * 86400000);
            const date = day.toISOString().slice(0, 10);

            return {
                date,
                revenue: Number((dailyRevenue.get(date) || 0).toFixed(2))
            };
        });

        const topProducts = [...productSales.values()]
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);

        res.json({
            totalRevenue: Number(totalRevenue.toFixed(2)),
            totalOrders: orders.length,
            statusCounts,
            topProducts,
            dailyRevenue: dailyRevenueSeries
        });
    } catch (error) {
        console.error("Sales analytics failed:", error.message);
        res.status(500).json({
            message: "Unable to retrieve sales analytics."
        });
    }
});

// Staff: get all orders
router.get("/", staffAuth, async (req, res) => {
    try {
        const orders = await database.getAll("orders:");

        orders.sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        res.json(orders);
    } catch (error) {
        res.status(500).json({
            message: "Unable to retrieve orders",
            error: error.message
        });
    }
});

// Public: retrieve safe order status using its customer tracking code
router.post("/track", async (req, res) => {
    const { trackingCode } = req.body || {};

    if (typeof trackingCode !== "string" ||
        !trackingCodePattern.test(trackingCode)) {
        return res.status(400).json({
            message: "Enter a valid tracking code."
        });
    }

    try {
        const orderId = await database.get(
            `order-tracking:${trackingCode}`
        );

        if (!orderId) {
            return res.status(404).json({
                message: "No order was found for that tracking code."
            });
        }

        const order = await database.get(`orders:${orderId}`);

        if (!order) {
            return res.status(404).json({
                message: "No order was found for that tracking code."
            });
        }

        res.json({
            order: publicOrderView(order)
        });
    } catch (error) {
        console.error("Order tracking failed:", error.message);
        res.status(500).json({
            message: "Unable to retrieve order status. Please try again."
        });
    }
});

// Staff: get one order
router.get("/:id", staffAuth, async (req, res) => {
    try {
        const order = await database.get(`orders:${req.params.id}`);

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        res.json(order);
    } catch (error) {
        res.status(500).json({
            message: "Unable to retrieve order",
            error: error.message
        });
    }
});

// Public: place an order
router.post("/", async (req, res) => {
    try {
        const { customerName, items } = req.body;

        if (!customerName || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                message: "Customer name and at least one order item are required"
            });
        }

        const orderItems = [];
        let total = 0;

        for (const item of items) {
            const quantity = Number(item.quantity);

            if (!item.productId || !Number.isInteger(quantity) || quantity < 1) {
                return res.status(400).json({
                    message: "Each order item must have a valid product and quantity"
                });
            }

            const product = await database.get(`menu:${item.productId}`);

            if (!product || !product.available) {
                return res.status(400).json({
                    message: `Product is unavailable: ${item.productId}`
                });
            }

            const subtotal = product.price * quantity;
            total += subtotal;

            orderItems.push({
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity,
                subtotal
            });
        }

        const id = randomUUID();
        const trackingCode = createTrackingToken();

        const order = {
            id,
            customerName: customerName.trim(),
            items: orderItems,
            total: Number(total.toFixed(2)),
            status: "Pending",
            createdAt: new Date().toISOString()
        };

        await database.setMany([
            { key: `orders:${id}`, value: order },
            { key: `order-tracking:${trackingCode}`, value: id }
        ]);

        res.status(201).json({
            message: "Order placed successfully",
            order,
            trackingCode
        });
    } catch (error) {
        res.status(500).json({
            message: "Unable to place order",
            error: error.message
        });
    }
});

// Staff: update order status
router.patch("/:id/status", staffAuth, async (req, res) => {
    try {
        const { status } = req.body;
        const key = `orders:${req.params.id}`;
        const order = await database.get(key);

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid order status"
            });
        }

        order.status = status;
        order.updatedAt = new Date().toISOString();

        await database.set(key, order);

        res.json({
            message: "Order status updated successfully",
            order
        });
    } catch (error) {
        res.status(500).json({
            message: "Unable to update order status",
            error: error.message
        });
    }
});

module.exports = router;
