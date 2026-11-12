
const express = require("express");
const { randomUUID } = require("crypto");
const staffAuth = require("../middleware/auth");
const database = require("../Config/database");
const logServerError = require("../utils/logServerError");
const { orderCreationLimiter } = require("../middleware/rateLimits");
const {
    createTrackingToken,
    publicOrderView
} = require("../../utils/orderTracking");

const router = express.Router();

const businessTimeZone = "Africa/Maseru";
const trackingCodePattern = /^[A-Za-z0-9_-]{43}$/;
const validStatuses = [
    "Pending",
    "Preparing",
    "Ready",
    "Collected"
];
const staffStatuses = ["Pending", "Preparing", "Ready"];
const maxCustomerNameLength = 80;
const maxOrderItems = 20;
const maxProductIdLength = 128;
const maxItemQuantity = 50;
const productIdPattern = /^[A-Za-z0-9_-]+$/;
const businessDateFormatter = new Intl.DateTimeFormat("en", {
    timeZone: businessTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
});

function businessDate(timestamp) {
    const parsedTimestamp = new Date(timestamp);

    if (Number.isNaN(parsedTimestamp.getTime())) {
        return null;
    }

    const parts = Object.fromEntries(
        businessDateFormatter
            .formatToParts(parsedTimestamp)
            .filter(part => part.type !== "literal")
            .map(part => [part.type, part.value])
    );

    return `${parts.year}-${parts.month}-${parts.day}`;
}

function currentBusinessWeek(today) {
    const monday = new Date(`${today}T00:00:00.000Z`);
    monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);

    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(monday);
        date.setUTCDate(monday.getUTCDate() + index);
        const dateString = date.toISOString().slice(0, 10);

        return {
            date: dateString,
            weekday: new Intl.DateTimeFormat("en", {
                timeZone: "UTC",
                weekday: "long"
            }).format(new Date(`${dateString}T12:00:00.000Z`))
        };
    });
}

function roundMoney(amount) {
    return Number(amount.toFixed(2));
}

// Staff: calculate sales analytics from existing order records
router.get("/analytics", staffAuth, async (req, res) => {
    try {
        const storedOrders = await database.getAll("orders:");
        const orders = [...new Map(storedOrders.map((order, index) => [
            order.id || `legacy-order-${index}`,
            order
        ])).values()];
        const collectedOrders = orders.filter(
            order => order.status === "Collected"
        );
        const statusCounts = Object.fromEntries(
            validStatuses.map(status => [status, 0])
        );
        const productSales = new Map();
        const dailyRevenue = new Map();
        const monthlyProductSales = new Map();
        const today = businessDate(new Date());
        const currentMonth = today.slice(0, 7);
        const weeklyDates = currentBusinessWeek(today);
        const weekStart = weeklyDates[0].date;
        const weekEnd = weeklyDates[6].date;
        let monthlyRevenue = 0;

        for (const order of orders) {
            if (validStatuses.includes(order.status)) {
                statusCounts[order.status] += 1;
            }
        }

        let totalRevenue = 0;

        for (const order of collectedOrders) {
            const total = Number(order.total);
            // Historical Collected orders use updatedAt, then createdAt, when collectedAt is absent.
            const collectionDate = businessDate(
                order.collectedAt || order.updatedAt || order.createdAt
            );

            if (Number.isFinite(total)) {
                totalRevenue += total;

                if (collectionDate?.startsWith(currentMonth)) {
                    monthlyRevenue += total;
                }
            }

            if (collectionDate) {
                dailyRevenue.set(
                    collectionDate,
                    (dailyRevenue.get(collectionDate) || 0) +
                        (Number.isFinite(total) ? total : 0)
                );
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

                const itemPrice = Number(item.price);
                if (collectionDate?.startsWith(currentMonth) &&
                    Number.isFinite(itemPrice) && itemPrice >= 0) {
                    const monthlyKey = item.productId || item.name;
                    const monthlyProduct = monthlyProductSales.get(monthlyKey) || {
                        name: item.name,
                        revenue: 0,
                        quantity: 0
                    };
                    monthlyProduct.revenue += itemPrice * quantity;
                    monthlyProduct.quantity += quantity;
                    monthlyProductSales.set(monthlyKey, monthlyProduct);
                }
            }

        }

        const dailyRevenueSeries = Array.from({ length: 7 }, (_, index) => {
            const day = new Date(`${today}T00:00:00.000Z`);
            day.setUTCDate(day.getUTCDate() - (6 - index));
            const date = day.toISOString().slice(0, 10);

            return {
                date,
                revenue: roundMoney(dailyRevenue.get(date) || 0)
            };
        });

        const weeklyRevenue = weeklyDates.map(day => ({
            ...day,
            revenue: roundMoney(dailyRevenue.get(day.date) || 0)
        }));

        const monthlyProducts = [...monthlyProductSales.values()]
            .map(product => ({
                ...product,
                revenue: roundMoney(product.revenue),
                percentage: monthlyRevenue > 0
                    ? roundMoney(product.revenue / monthlyRevenue * 100)
                    : 0
            }))
            .sort((a, b) => b.revenue - a.revenue);

        const topProducts = [...productSales.values()]
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);

        res.json({
            totalRevenue: roundMoney(totalRevenue),
            totalOrders: orders.length,
            statusCounts,
            topProducts,
            dailyRevenue: dailyRevenueSeries,
            businessTimeZone,
            weeklyRevenue,
            weeklyTotalRevenue: roundMoney(
                weeklyRevenue.reduce((sum, day) => sum + day.revenue, 0)
            ),
            monthlyRevenue: roundMoney(monthlyRevenue),
            monthlyProducts,
            monthlyProductRevenue: roundMoney(
                monthlyProducts.reduce((sum, product) => sum + product.revenue, 0)
            ),
            businessMonth: currentMonth,
            businessWeekStart: weekStart,
            businessWeekEnd: weekEnd
        });
    } catch (error) {
        logServerError("Sales analytics", error);
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
        logServerError("Retrieve orders", error);
        res.status(500).json({
            message: "Unable to retrieve orders."
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
        logServerError("Order tracking", error);
        res.status(500).json({
            message: "Unable to retrieve order status. Please try again."
        });
    }
});

// Public: confirm collection using the customer's private tracking code
router.post("/confirm-collection", async (req, res) => {
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

        const result = await database.transitionOrderStatus(
            orderId,
            ["Ready"],
            "Collected",
            new Date().toISOString()
        );

        if (!result.found) {
            return res.status(404).json({
                message: "No order was found for that tracking code."
            });
        }

        if (!result.updated && result.order?.status !== "Collected") {
            return res.status(409).json({
                message: "This order is not ready for collection confirmation."
            });
        }

        res.json({
            message: "Order collection confirmed successfully.",
            order: publicOrderView(result.order)
        });
    } catch (error) {
        logServerError("Confirm order collection", error);
        res.status(500).json({
            message: "Unable to confirm order collection. Please try again."
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
        logServerError("Retrieve order", error);
        res.status(500).json({
            message: "Unable to retrieve order."
        });
    }
});

// Public: place an order
router.post("/", orderCreationLimiter, async (req, res) => {
    try {
        const body = req.body;

        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return res.status(400).json({
                message: "A valid order is required."
            });
        }

        const { customerName, items } = body;
        if (typeof customerName !== "string") {
            return res.status(400).json({
                message: "Customer name must be provided as text."
            });
        }

        const normalizedCustomerName = customerName.trim();
        if (!normalizedCustomerName ||
            normalizedCustomerName.length > maxCustomerNameLength) {
            return res.status(400).json({
                message: `Customer name must be between 1 and ${maxCustomerNameLength} characters.`
            });
        }

        if (!Array.isArray(items) || items.length === 0 ||
            items.length > maxOrderItems) {
            return res.status(400).json({
                message: `An order must contain between 1 and ${maxOrderItems} items.`
            });
        }

        const orderItems = [];
        let total = 0;

        for (const item of items) {
            if (!item || typeof item !== "object" || Array.isArray(item)) {
                return res.status(400).json({
                    message: "Each order item must be a valid object."
                });
            }

            const productId = typeof item.productId === "string"
                ? item.productId.trim()
                : "";
            if (!productId || productId.length > maxProductIdLength ||
                !productIdPattern.test(productId)) {
                return res.status(400).json({
                    message: "Each order item must include a valid product ID."
                });
            }

            const quantity = item.quantity;
            if (!Number.isSafeInteger(quantity) || quantity < 1 ||
                quantity > maxItemQuantity) {
                return res.status(400).json({
                    message: `Each item quantity must be a whole number between 1 and ${maxItemQuantity}.`
                });
            }

            const product = await database.get(`menu:${productId}`);

            if (!product || !product.available) {
                return res.status(400).json({
                    message: "One or more selected products are unavailable."
                });
            }

            const productPrice = Number(product.price);
            if (!Number.isFinite(productPrice) || productPrice < 0) {
                logServerError(
                    "Place order",
                    new Error("Stored product price is invalid.")
                );
                return res.status(500).json({
                    message: "Unable to place order."
                });
            }

            const subtotal = productPrice * quantity;
            total += subtotal;
            if (!Number.isFinite(subtotal) || !Number.isFinite(total)) {
                return res.status(400).json({
                    message: "The selected products exceed the supported order total."
                });
            }

            orderItems.push({
                productId: product.id,
                name: product.name,
                price: productPrice,
                quantity,
                subtotal
            });
        }

        const id = randomUUID();
        const trackingCode = createTrackingToken();

        const order = {
            id,
            customerName: normalizedCustomerName,
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
        logServerError("Place order", error);
        res.status(500).json({
            message: "Unable to place order."
        });
    }
});

// Staff: update order status
router.patch("/:id/status", staffAuth, async (req, res) => {
    try {
        const { status } = req.body;
        if (!staffStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid order status"
            });
        }

        const result = await database.transitionOrderStatus(
            req.params.id,
            ["Pending", "Preparing", "Ready"],
            status,
            new Date().toISOString()
        );

        if (!result.found) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        if (!result.updated) {
            return res.status(409).json({
                message: "Collected orders cannot be changed."
            });
        }

        res.json({
            message: "Order status updated successfully",
            order: result.order
        });
    } catch (error) {
        logServerError("Update order status", error);
        res.status(500).json({
            message: "Unable to update order status."
        });
    }
});

module.exports = router;
