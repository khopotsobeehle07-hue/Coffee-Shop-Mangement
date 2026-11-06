
const express = require("express");
const { randomUUID } = require("crypto");
const db = require("../Config/database");

const router = express.Router();

const MENU_PREFIX = "menu:";

// GET all menu items
router.get("/", async (req, res) => {
    try {
        const items = await db.getAll(MENU_PREFIX);
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: "Failed to retrieve menu" });
    }
});

// GET one menu item
router.get("/:id", async (req, res) => {
    const item = await db.get(`${MENU_PREFIX}${req.params.id}`);

    if (!item) {
        return res.status(404).json({ message: "Menu item not found" });
    }

    res.json(item);
});

// ADD menu item
router.post("/", async (req, res) => {
    const { name, description, price, category, available } = req.body;

    if (!name || !description || !category ||
        typeof price !== "number" || price < 0) {
        return res.status(400).json({ message: "Invalid menu item data" });
    }

    const id = randomUUID();

    const item = {
        id,
        name,
        description,
        price,
        category,
        available: available ?? true,
        createdAt: new Date().toISOString()
    };

    await db.set(`${MENU_PREFIX}${id}`, item);

    res.status(201).json({
        message: "Menu item created",
        item
    });
});

// UPDATE menu item
router.put("/:id", async (req, res) => {
    const key = `${MENU_PREFIX}${req.params.id}`;
    const existing = await db.get(key);

    if (!existing) {
        return res.status(404).json({ message: "Menu item not found" });
    }

    const { name, description, price, category, available } = req.body;

    if (price !== undefined &&
        (typeof price !== "number" || price < 0)) {
        return res.status(400).json({ message: "Invalid price" });
    }

    const updated = {
        ...existing,
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price }),
        ...(category !== undefined && { category }),
        ...(available !== undefined && { available })
    };

    await db.set(key, updated);

    res.json({ message: "Menu item updated", item: updated });
});

// DELETE menu item
router.delete("/:id", async (req, res) => {
    const key = `${MENU_PREFIX}${req.params.id}`;
    const existing = await db.get(key);

    if (!existing) {
        return res.status(404).json({ message: "Menu item not found" });
    }

    await db.remove(key);

    res.json({ message: "Menu item deleted" });
});

module.exports = router;
