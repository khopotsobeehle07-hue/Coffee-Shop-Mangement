
import { useEffect, useState } from "react";
import {
    Plus,
    Trash2,
    Pencil,
    RefreshCw,
    X,
    Package,
    ShoppingBag
} from "lucide-react";
import { staffAPI } from "../services/api";

const emptyProduct = {
    name: "",
    description: "",
    price: "",
    category: "Coffee",
    image: "",
    available: true
};

const orderStatuses = [
    "Pending",
    "Preparing",
    "Ready",
    "Collected"
];

export default function StaffDashboard({ products, refreshMenu }) {
    const [form, setForm] = useState(emptyProduct);
    const [editingId, setEditingId] = useState(null);
    const [orders, setOrders] = useState([]);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [saving, setSaving] = useState(false);

    async function loadOrders() {
        try {
            setError("");
            const data = await staffAPI.getOrders();
            setOrders(data);
        } catch (err) {
            setError(err.message);
        }
    }

    useEffect(() => {
        loadOrders();
    }, []);

    function updateField(event) {
        const { name, value, type, checked } = event.target;

        setForm(current => ({
            ...current,
            [name]: type === "checkbox" ? checked : value
        }));
    }

    async function saveProduct(event) {
        event.preventDefault();
        setError("");
        setMessage("");
        setSaving(true);

        try {
            const product = {
                ...form,
                price: Number(form.price)
            };

            if (editingId) {
                await staffAPI.updateProduct(editingId, product);
            } else {
                await staffAPI.addProduct(product);
            }

            setForm(emptyProduct);
            setEditingId(null);
            await refreshMenu();

            setMessage(
                editingId
                    ? "Product updated successfully."
                    : "Product added successfully."
            );
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    function editProduct(product) {
        setEditingId(product.id);

        setForm({
            name: product.name || "",
            description: product.description || "",
            price: String(product.price ?? ""),
            category: product.category || "Coffee",
            image: product.image || "",
            available: product.available !== false
        });

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    function cancelEditing() {
        setEditingId(null);
        setForm(emptyProduct);
        setError("");
        setMessage("");
    }

    async function deleteProduct(id) {
        if (!window.confirm("Are you sure you want to delete this product?")) {
            return;
        }

        setError("");
        setMessage("");

        try {
            await staffAPI.deleteProduct(id);
            await refreshMenu();
            setMessage("Product deleted successfully.");
        } catch (err) {
            setError(err.message);
        }
    }

    async function toggleAvailability(product) {
        setError("");
        setMessage("");

        try {
            await staffAPI.updateProduct(product.id, {
                ...product,
                available: !product.available
            });

            await refreshMenu();
            setMessage("Product availability updated.");
        } catch (err) {
            setError(err.message);
        }
    }

    async function changeOrderStatus(id, status) {
        setError("");
        setMessage("");

        try {
            await staffAPI.updateOrder(id, status);
            await loadOrders();
            setMessage("Order status updated.");
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <div className="staff-dashboard">
            <div className="staff-heading">
                <div>
                    <span className="eyebrow">BREWHAUS MANAGEMENT</span>
                    <h1>Staff Dashboard</h1>
                    <p>Manage products, availability and customer orders.</p>
                </div>

                <button
                    type="button"
                    className="staff-refresh"
                    onClick={loadOrders}
                >
                    <RefreshCw size={17} />
                    Refresh orders
                </button>
            </div>

            {error && (
                <div className="staff-alert staff-alert-error">
                    {error}
                </div>
            )}

            {message && (
                <div className="staff-alert staff-alert-success">
                    {message}
                </div>
            )}

            <div className="staff-stats">
                <div className="staff-stat">
                    <Package size={22} />
                    <div>
                        <strong>{products.length}</strong>
                        <span>Total products</span>
                    </div>
                </div>

                <div className="staff-stat">
                    <ShoppingBag size={22} />
                    <div>
                        <strong>{orders.length}</strong>
                        <span>Customer orders</span>
                    </div>
                </div>
            </div>

            <section className="staff-section">
                <div className="staff-section-heading">
                    <h2>{editingId ? "Edit Product" : "Add New Product"}</h2>
                    {editingId && (
                        <button
                            type="button"
                            className="staff-cancel"
                            onClick={cancelEditing}
                        >
                            <X size={16} />
                            Cancel editing
                        </button>
                    )}
                </div>

                <form className="product-form" onSubmit={saveProduct}>
                    <input
                        name="name"
                        placeholder="Product name"
                        value={form.name}
                        onChange={updateField}
                        required
                    />

                    <input
                        name="description"
                        placeholder="Product description"
                        value={form.description}
                        onChange={updateField}
                        required
                    />

                    <input
                        name="price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Price (M)"
                        value={form.price}
                        onChange={updateField}
                        required
                    />

                    <select
                        name="category"
                        value={form.category}
                        onChange={updateField}
                    >
                        <option value="Coffee">Coffee</option>
                        <option value="Tea">Tea</option>
                        <option value="Pastries">Pastries</option>
                    </select>

                    <input
                        name="image"
                        type="url"
                        placeholder="Product image URL (optional)"
                        value={form.image}
                        onChange={updateField}
                    />

                    <label className="availability-control">
                        <input
                            name="available"
                            type="checkbox"
                            checked={form.available}
                            onChange={updateField}
                        />
                        Available for customers
                    </label>

                    <button
                        className="checkout-button"
                        type="submit"
                        disabled={saving}
                    >
                        <Plus size={17} />
                        {saving
                            ? "Saving..."
                            : editingId
                                ? "Save Changes"
                                : "Add Product"}
                    </button>
                </form>
            </section>

            <section className="staff-section">
                <h2>Menu Products ({products.length})</h2>

                <div className="staff-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Price</th>
                                <th>Category</th>
                                <th>Availability</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {products.length === 0 ? (
                                <tr>
                                    <td colSpan="5">No products found.</td>
                                </tr>
                            ) : products.map(product => (
                                <tr key={product.id}>
                                    <td>{product.name}</td>
                                    <td>
                                        M{Number(product.price).toFixed(2)}
                                    </td>
                                    <td>{product.category}</td>
                                    <td>
                                        <button
                                            type="button"
                                            className={
                                                product.available
                                                    ? "availability available"
                                                    : "availability unavailable"
                                            }
                                            onClick={() => toggleAvailability(product)}
                                        >
                                            {product.available
                                                ? "Available"
                                                : "Unavailable"}
                                        </button>
                                    </td>
                                    <td className="staff-actions">
                                        <button
                                            type="button"
                                            title="Edit product"
                                            onClick={() => editProduct(product)}
                                        >
                                            <Pencil size={16} />
                                        </button>

                                        <button
                                            type="button"
                                            title="Delete product"
                                            onClick={() => deleteProduct(product.id)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="staff-section">
                <div className="staff-section-heading">
                    <h2>Customer Orders ({orders.length})</h2>

                    <button
                        type="button"
                        className="staff-refresh"
                        onClick={loadOrders}
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                </div>

                <div className="staff-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th>Update status</th>
                            </tr>
                        </thead>

                        <tbody>
                            {orders.length === 0 ? (
                                <tr>
                                    <td colSpan="6">No customer orders yet.</td>
                                </tr>
                            ) : orders.map(order => (
                                <tr key={order.id}>
                                    <td>{order.id.slice(0, 8)}</td>
                                    <td>{order.customerName}</td>
                                    <td>
                                        {order.items?.reduce(
                                            (sum, item) => sum + item.quantity,
                                            0
                                        ) || 0}
                                    </td>
                                    <td>
                                        M{Number(order.total).toFixed(2)}
                                    </td>
                                    <td>{order.status}</td>
                                    <td>
                                        <select
                                            value={order.status}
                                            onChange={event =>
                                                changeOrderStatus(
                                                    order.id,
                                                    event.target.value
                                                )
                                            }
                                        >
                                            {orderStatuses.map(status => (
                                                <option
                                                    key={status}
                                                    value={status}
                                                >
                                                    {status}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
