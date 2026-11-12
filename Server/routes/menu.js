
const express = require("express");
const { randomUUID } = require("crypto");
const staffAuth = require("../middleware/auth");
const database = require("../Config/database");
const logServerError = require("../utils/logServerError");

const router = express.Router();

// Public: get all menu products
router.get("/", async (req, res) => {
    try {
        const products = await database.getAll("menu:");
        res.json(products);
    } catch (error) {
        logServerError("Retrieve menu", error);
        res.status(500).json({
            message: "Unable to retrieve menu."
        });
    }
});

// Public: get one product
router.get("/:id", async (req, res) => {
    try {
        const product = await database.get(`menu:${req.params.id}`);

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.json(product);
    } catch (error) {
        logServerError("Retrieve product", error);
        res.status(500).json({
            message: "Unable to retrieve product."
        });
    }
});

// Staff: add product
router.post("/", staffAuth, async (req, res) => {
    try {
        const {
            name,
            description,
            price,
            category,
            available,
            image
        } = req.body;

        if (!name || !description || !category ||
            price === undefined || Number(price) < 0 ||
            !Number.isFinite(Number(price))) {
            return res.status(400).json({
                message: "Please provide a valid name, description, category and price"
            });
        }

        const id = randomUUID();

        const product = {
            id,
            name: name.trim(),
            description: description.trim(),
            price: Number(price),
            category,
            available: available !== false,
            image: image || "",
            createdAt: new Date().toISOString()
        };

        await database.set(`menu:${id}`, product);

        res.status(201).json({
            message: "Product added successfully",
            product
        });
    } catch (error) {
        logServerError("Add product", error);
        res.status(500).json({
            message: "Unable to add product."
        });
    }
});

// Staff: update product
router.put("/:id", staffAuth, async (req, res) => {
    try {
        const key = `menu:${req.params.id}`;
        const existingProduct = await database.get(key);

        if (!existingProduct) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        const {
            name,
            description,
            price,
            category,
            available,
            image
        } = req.body;

        if (!name || !description || !category ||
            price === undefined || !Number.isFinite(Number(price)) ||
            Number(price) < 0) {
            return res.status(400).json({
                message: "Please provide valid product details"
            });
        }

        const updatedProduct = {
            ...existingProduct,
            name: name.trim(),
            description: description.trim(),
            price: Number(price),
            category,
            available: available !== false,
            image: image || ""
        };

        await database.set(key, updatedProduct);

        res.json({
            message: "Product updated successfully",
            product: updatedProduct
        });
    } catch (error) {
        logServerError("Update product", error);
        res.status(500).json({
            message: "Unable to update product."
        });
    }
});

// Staff: delete product
router.delete("/:id", staffAuth, async (req, res) => {
    try {
        const key = `menu:${req.params.id}`;
        const product = await database.get(key);

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        await database.remove(key);

        res.json({
            message: "Product deleted successfully"
        });
    } catch (error) {
        logServerError("Delete product", error);
        res.status(500).json({
            message: "Unable to delete product."
        });
    }
});

module.exports = router;
