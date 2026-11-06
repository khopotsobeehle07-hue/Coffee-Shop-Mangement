
const express = require("express");
const { randomUUID } = require("crypto");
const db = require("../Config/database");

const router = express.Router();

const ORDER_PREFIX = "order:";
const MENU_PREFIX = "menu:";

const STATUSES = ["Pending", "Preparing", "Ready", "Collected"];

// GET all orders
router.get("/", async (req, res) => {
    const orders = await db.getAll(ORDER_PREFIX);
    res.json(orders);
});

// GET one order
router.get("/:id", async (req, res) => {
    const order = await db.get(`${ORDER_PREFIX}${req.params.id}`);

    if (!order) {
        return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
});

// PLACE order
router.post("/", async (req, res) => {
    try {
        const { customerName, items } = req.body;

        if (!customerName?.trim() ||
            !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                message: "Customer name and order items are required"
            });
        }

        const orderItems = [];
        let total = 0;

        for (const requested of items) {
            if (!Number.isInteger(requested.quantity) ||
                requested.quantity < 1) {
                return res.status(400).json({
                    message: "Invalid item quantity"
                });
            }

            const product = await db.get(
                `${MENU_PREFIX}${requested.productId}`
            );

            if (!product || !product.available) {
                return res.status(400).json({
                    message: "An item is unavailable"
                });
            }

            const subtotal = product.price * requested.quantity;
            total += subtotal;

            orderItems.push({
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity: requested.quantity,
                subtotal
            });
        }

        const id = randomUUID();

        const order = {
            id,
            customerName: customerName.trim(),
            items: orderItems,
            total,
            status: "Pending",
            createdAt: new Date().toISOString()
        };

        await db.set(`${ORDER_PREFIX}${id}`, order);

        res.status(201).json({
            message: "Order placed successfully",
            order
        });

    } catch (error) {
        res.status(500).json({ message: "Could not place order" });
    }
});

// UPDATE order status
router.patch("/:id/status", async (req, res) => {
    const { status } = req.body;
    const key = `${ORDER_PREFIX}${req.params.id}`;

    if (!STATUSES.includes(status)) {
        return res.status(400).json({ message: "Invalid order status" });
    }

    const order = await db.get(key);

    if (!order) {
        return res.status(404).json({ message: "Order not found" });
    }

    order.status = status;

    await db.set(key, order);

    res.json({
        message: "Order status updated",
        order
    });
});

module.exports = router;
