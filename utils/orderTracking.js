const crypto = require("crypto");

function createTrackingToken() {
  // 256-bit, URL-safe, unguessable customer tracking token.
  return crypto.randomBytes(32).toString("base64url");
}

function publicOrderView(order) {
  return {
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt || null,
    collectedAt: order.collectedAt || null,
    items: Array.isArray(order.items)
      ? order.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
        }))
      : [],
  };
}

module.exports = {
  createTrackingToken,
  publicOrderView,
};