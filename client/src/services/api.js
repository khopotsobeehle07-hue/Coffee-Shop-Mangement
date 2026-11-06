
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export async function getMenu() {
    const response = await fetch(`${API_URL}/menu`);

    if (!response.ok) {
        throw new Error("Unable to load menu");
    }

    return response.json();
}

export async function placeOrder(orderData) {
    const response = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(orderData)
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Order failed");
    }

    return data;
}
