
import { useEffect, useState } from "react";
import {
    Plus,
    Trash2,
    Pencil,
    RefreshCw,
    X,
    Package,
    ShoppingBag,
    BarChart3,
    CircleDollarSign,
    ClipboardList
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
const editableOrderStatuses = ["Pending", "Preparing", "Ready"];

const currencyFormatter = new Intl.NumberFormat("en-LS", {
    minimumFractionDigits: 2
});

function formatMaloti(amount) {
    return `M${currencyFormatter.format(amount)}`;
}

const chartColors = [
    "#638154",
    "#bd8a4b",
    "#4e7b87",
    "#b85c4a",
    "#806c91",
    "#9b9b52"
];

function getMonthlyProductSlices(analytics) {
    const monthlyRevenue = Number(analytics?.monthlyRevenue) || 0;
    const products = Array.isArray(analytics?.monthlyProducts)
        ? analytics.monthlyProducts
        : [];
    const productRevenue = products.reduce(
        (sum, product) => sum + Number(product.revenue || 0),
        0
    );
    const chartTotal = Math.max(monthlyRevenue, productRevenue);

    if (chartTotal <= 0) return [];

    const entries = products.map(product => ({
        name: product.name,
        revenue: Number(product.revenue) || 0
    }));
    const unallocatedRevenue = Math.max(0, monthlyRevenue - productRevenue);

    if (unallocatedRevenue >= 0.01) {
        entries.push({ name: "Other", revenue: unallocatedRevenue });
    }

    entries.sort((a, b) => b.revenue - a.revenue);

    const slices = [];
    let otherRevenue = 0;

    for (const product of entries) {
        const share = product.revenue / chartTotal;

        if (product.name !== "Other" && share >= 0.04 && slices.length < 5) {
            slices.push(product);
        } else {
            otherRevenue += product.revenue;
        }
    }

    if (otherRevenue >= 0.01) {
        slices.push({ name: "Other", revenue: otherRevenue });
    }

    let currentStop = 0;
    return slices.map((slice, index) => {
        const start = currentStop;
        currentStop = index === slices.length - 1
            ? 100
            : currentStop + slice.revenue / chartTotal * 100;

        return {
            ...slice,
            percentage: slice.revenue / chartTotal * 100,
            color: chartColors[index % chartColors.length],
            start,
            end: currentStop
        };
    });
}

function formatBusinessMonth(value) {
    if (!/^\d{4}-\d{2}$/.test(value || "")) return "Current month";

    return new Intl.DateTimeFormat("en", {
        month: "long",
        year: "numeric",
        timeZone: "Africa/Maseru"
    }).format(new Date(`${value}-15T12:00:00.000Z`));
}

export default function StaffDashboard({ products, refreshMenu }) {
    const [form, setForm] = useState(emptyProduct);
    const [editingId, setEditingId] = useState(null);
    const [orders, setOrders] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const [analyticsError, setAnalyticsError] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [saving, setSaving] = useState(false);
    const maxDailyRevenue = Math.max(
        0,
        ...(analytics?.dailyRevenue?.map(day => day.revenue) || [])
    );
    const weeklyRevenue = analytics?.weeklyRevenue || [];
    const maxWeeklyRevenue = Math.max(
        0,
        ...weeklyRevenue.map(day => day.revenue)
    );
    const monthlyProductSlices = getMonthlyProductSlices(analytics);
    const pieBackground = monthlyProductSlices.length
        ? `conic-gradient(${monthlyProductSlices.map(slice =>
            `${slice.color} ${slice.start}% ${slice.end}%`
        ).join(", ")})`
        : "#eee8e0";

    async function loadOrders() {
        try {
            setError("");
            const data = await staffAPI.getOrders();
            setOrders(data);
        } catch (err) {
            setError(err.message);
        }
    }

    async function loadAnalytics() {
        setAnalyticsError("");
        setAnalyticsLoading(true);

        try {
            const data = await staffAPI.getSalesAnalytics();
            setAnalytics(data);
        } catch (err) {
            setAnalyticsError(err.message);
        } finally {
            setAnalyticsLoading(false);
        }
    }

    useEffect(() => {
        let cancelled = false;

        async function fetchInitialOrders() {
            try {
                const data = await staffAPI.getOrders();

                if (!cancelled) {
                    setOrders(data);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message);
                }
            }
        }

        async function fetchInitialAnalytics() {
            try {
                const data = await staffAPI.getSalesAnalytics();

                if (!cancelled) {
                    setAnalytics(data);
                }
            } catch (err) {
                if (!cancelled) {
                    setAnalyticsError(err.message);
                }
            } finally {
                if (!cancelled) {
                    setAnalyticsLoading(false);
                }
            }
        }

        fetchInitialOrders();
        fetchInitialAnalytics();

        let polling = false;
        const pollTimer = window.setInterval(async () => {
            if (polling || cancelled) return;
            polling = true;

            try {
                const data = await staffAPI.getOrders();
                if (!cancelled) setOrders(data);
            } catch (err) {
                if (!cancelled) setError(err.message);
            }

            try {
                const data = await staffAPI.getSalesAnalytics();
                if (!cancelled) setAnalytics(data);
            } catch (err) {
                if (!cancelled) setAnalyticsError(err.message);
            } finally {
                polling = false;
            }
        }, 15000);

        return () => {
            cancelled = true;
            window.clearInterval(pollTimer);
        };
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
            await Promise.all([loadOrders(), loadAnalytics()]);
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

            <section className="staff-section analytics-section">
                <div className="staff-section-heading">
                    <div>
                        <span className="eyebrow">SALES OVERVIEW</span>
                        <h2>Sales Analytics</h2>
                    </div>
                    <button
                        type="button"
                        className="staff-refresh"
                        onClick={loadAnalytics}
                        disabled={analyticsLoading}
                    >
                        <RefreshCw size={16} />
                        {analyticsLoading ? "Refreshing..." : "Refresh"}
                    </button>
                </div>

                {analyticsError && (
                    <div className="staff-alert staff-alert-error">
                        {analyticsError}
                    </div>
                )}

                {analyticsLoading && !analytics ? (
                    <p className="analytics-message">
                        Loading sales analytics...
                    </p>
                ) : analytics ? (
                    <>
                        <div className="analytics-summary">
                            <div className="analytics-summary-card">
                                <CircleDollarSign size={22} />
                                <div>
                                    <span>Collected revenue</span>
                                    <strong>
                                        {formatMaloti(analytics.totalRevenue)}
                                    </strong>
                                </div>
                            </div>
                            <div className="analytics-summary-card">
                                <ClipboardList size={22} />
                                <div>
                                    <span>Total orders</span>
                                    <strong>{analytics.totalOrders}</strong>
                                </div>
                            </div>
                        </div>

                        <div className="analytics-status-grid">
                            {orderStatuses.map(status => (
                                <div className="analytics-status-card" key={status}>
                                    <span>{status}</span>
                                    <strong>
                                        {analytics.statusCounts?.[status] ?? 0}
                                    </strong>
                                </div>
                            ))}
                        </div>

                        <div className="analytics-content-grid">
                            <div className="analytics-panel">
                                <div className="analytics-panel-heading">
                                    <BarChart3 size={19} />
                                    <h3>Daily Collected Revenue</h3>
                                </div>
                                {analytics.dailyRevenue?.some(
                                    day => day.revenue > 0
                                ) ? (
                                    <div
                                        className="revenue-chart"
                                        role="img"
                                        aria-label="Daily collected revenue for the last seven days"
                                    >
                                        {analytics.dailyRevenue.map(day => {
                                            const height = maxDailyRevenue > 0
                                                ? Math.max(
                                                    day.revenue / maxDailyRevenue * 100,
                                                    day.revenue > 0 ? 5 : 0
                                                )
                                                : 0;
                                            const date = new Date(
                                                `${day.date}T00:00:00.000Z`
                                            );

                                            return (
                                                <div
                                                    className="revenue-chart-day"
                                                    key={day.date}
                                                    title={`${day.date}: ${formatMaloti(day.revenue)}`}
                                                >
                                                    <span className="revenue-chart-value">
                                                        {day.revenue > 0
                                                            ? formatMaloti(day.revenue)
                                                            : ""}
                                                    </span>
                                                    <div className="revenue-chart-track">
                                                        <div
                                                            className="revenue-chart-bar"
                                                            style={{
                                                                height: `${height}%`
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="revenue-chart-label">
                                                        {Number.isNaN(date.getTime())
                                                            ? day.date
                                                            : new Intl.DateTimeFormat(
                                                                "en",
                                                                {
                                                                    month: "short",
                                                                    day: "numeric",
                                                                    timeZone: "UTC"
                                                                }
                                                            ).format(date)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="analytics-message">
                                        No collected revenue in the last seven days.
                                    </p>
                                )}
                            </div>

                            <div className="analytics-panel">
                                <div className="analytics-panel-heading">
                                    <ShoppingBag size={19} />
                                    <h3>Top 5 Best-Selling</h3>
                                </div>
                                {analytics.topProducts?.length ? (
                                    <ol className="top-products-list">
                                        {analytics.topProducts.map((product, index) => (
                                            <li
                                                key={`${product.name}-${index}`}
                                            >
                                                <span className="top-product-rank">
                                                    {index + 1}
                                                </span>
                                                <span className="top-product-name">
                                                    {product.name}
                                                </span>
                                                <strong>
                                                    {product.quantity} sold
                                                </strong>
                                            </li>
                                        ))}
                                    </ol>
                                ) : (
                                    <p className="analytics-message">
                                        No collected product sales yet.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="analytics-content-grid analytics-new-charts">
                            <section className="analytics-panel">
                                <div className="analytics-panel-heading">
                                    <BarChart3 size={19} />
                                    <div>
                                        <h3>Weekly Sales Revenue</h3>
                                        <p className="chart-period">
                                            Monday through Sunday · Africa/Maseru
                                        </p>
                                    </div>
                                </div>
                                <p className="chart-total">
                                    Weekly total
                                    <strong>
                                        {formatMaloti(analytics.weeklyTotalRevenue || 0)}
                                    </strong>
                                </p>
                                {weeklyRevenue.length === 7 ? (
                                    <>
                                        <div
                                            className="weekly-revenue-chart"
                                            role="img"
                                            aria-label={`Weekly sales revenue from Monday through Sunday. Total ${formatMaloti(analytics.weeklyTotalRevenue || 0)}.`}
                                        >
                                            {weeklyRevenue.map(day => {
                                                const height = maxWeeklyRevenue > 0
                                                    ? Math.max(
                                                        day.revenue / maxWeeklyRevenue * 100,
                                                        day.revenue > 0 ? 4 : 0
                                                    )
                                                    : 0;

                                                return (
                                                    <div
                                                        className="weekly-revenue-day"
                                                        key={day.date}
                                                    >
                                                        <span className="weekly-revenue-value">
                                                            {formatMaloti(day.revenue)}
                                                        </span>
                                                        <div className="weekly-revenue-track">
                                                            <div
                                                                className="weekly-revenue-bar"
                                                                style={{ height: `${height}%` }}
                                                            />
                                                        </div>
                                                        <strong>{day.weekday.slice(0, 3)}</strong>
                                                        <span className="weekly-revenue-date">
                                                            {day.date.slice(5)}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {analytics.weeklyTotalRevenue === 0 && (
                                            <p className="analytics-message">
                                                No collected sales this week. Each day is shown as M0.
                                            </p>
                                        )}
                                        <table className="screen-reader-table">
                                            <caption>Weekly Sales Revenue by Maseru business day</caption>
                                            <thead>
                                                <tr><th>Day</th><th>Date</th><th>Revenue</th></tr>
                                            </thead>
                                            <tbody>
                                                {weeklyRevenue.map(day => (
                                                    <tr key={day.date}>
                                                        <th scope="row">{day.weekday}</th>
                                                        <td>{day.date}</td>
                                                        <td>{formatMaloti(day.revenue)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </>
                                ) : (
                                    <p className="analytics-message">
                                        Weekly revenue data is unavailable.
                                    </p>
                                )}
                            </section>

                            <section className="analytics-panel">
                                <div className="analytics-panel-heading">
                                    <ShoppingBag size={19} />
                                    <div>
                                        <h3>Monthly Sales by Product</h3>
                                        <p className="chart-period">
                                            {formatBusinessMonth(analytics.businessMonth)} · Africa/Maseru
                                        </p>
                                    </div>
                                </div>
                                <p className="chart-total">
                                    Monthly total
                                    <strong>{formatMaloti(analytics.monthlyRevenue || 0)}</strong>
                                </p>
                                {monthlyProductSlices.length ? (
                                    <>
                                        <div className="monthly-sales-chart">
                                            <div
                                                className="monthly-sales-pie"
                                                role="img"
                                                aria-label={`Monthly product sales by contribution: ${monthlyProductSlices.map(slice => `${slice.name}, ${slice.percentage.toFixed(1)} percent, ${formatMaloti(slice.revenue)}`).join("; ")}`}
                                                style={{ background: pieBackground }}
                                            />
                                            <ul className="monthly-sales-legend">
                                                {monthlyProductSlices.map(slice => (
                                                    <li key={slice.name}>
                                                        <span
                                                            className="monthly-sales-swatch"
                                                            style={{ "--slice-color": slice.color }}
                                                            aria-hidden="true"
                                                        />
                                                        <span className="monthly-sales-product">
                                                            {slice.name}
                                                        </span>
                                                        <span>{slice.percentage.toFixed(1)}%</span>
                                                        <strong>{formatMaloti(slice.revenue)}</strong>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <table className="screen-reader-table">
                                            <caption>Monthly Sales by Product for {formatBusinessMonth(analytics.businessMonth)}</caption>
                                            <thead>
                                                <tr><th>Product</th><th>Revenue</th><th>Share</th></tr>
                                            </thead>
                                            <tbody>
                                                {monthlyProductSlices.map(slice => (
                                                    <tr key={slice.name}>
                                                        <th scope="row">{slice.name}</th>
                                                        <td>{formatMaloti(slice.revenue)}</td>
                                                        <td>{slice.percentage.toFixed(1)}%</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </>
                                ) : (
                                    <p className="analytics-message">
                                        No collected product sales this month.
                                    </p>
                                )}
                            </section>
                        </div>
                    </>
                ) : !analyticsError ? (
                    <p className="analytics-message">
                        No sales analytics available yet.
                    </p>
                ) : null}
            </section>

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
                        <option value="Desserts">Desserts</option>
                        <option value="Foods">Foods</option>
                        <option value="Drinks">Drinks</option>
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
                                        {order.status === "Collected" ? (
                                            <span>Collected</span>
                                        ) : (
                                            <select
                                                value={order.status}
                                                onChange={event =>
                                                    changeOrderStatus(
                                                        order.id,
                                                        event.target.value
                                                    )
                                                }
                                            >
                                                {editableOrderStatuses.map(status => (
                                                    <option
                                                        key={status}
                                                        value={status}
                                                    >
                                                        {status}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
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
