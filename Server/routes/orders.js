
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
