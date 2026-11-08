
const API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export async function getMenu() {
    const response = await fetch(`${API_URL}/menu`);

    if (!response.ok) {
        throw new Error("Unable to load menu.");
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
        throw new Error(data.message || "Unable to place order.");
    }

    return data;
}

export async function loginStaff(credentials) {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(credentials)
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Staff login failed.");
    }

    return data;
}

async function staffRequest(path, options = {}) {
    const token = sessionStorage.getItem("staffToken");

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
            ...(token
                ? { Authorization: `Bearer ${token}` }
                : {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Staff request failed.");
    }

    return data;
}

export const staffAPI = {
    getOrders() {
        return staffRequest("/orders");
    },

    addProduct(product) {
        return staffRequest("/menu", {
            method: "POST",
            body: JSON.stringify(product)
        });
    },

    updateProduct(id, product) {
        return staffRequest(`/menu/${id}`, {
            method: "PUT",
            body: JSON.stringify(product)
        });
    },

    deleteProduct(id) {
        return staffRequest(`/menu/${id}`, {
            method: "DELETE"
        });
    },

    updateOrder(id, status) {
        return staffRequest(`/orders/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status })
        });
    }
};
