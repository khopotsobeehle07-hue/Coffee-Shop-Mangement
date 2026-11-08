import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { trackOrder } from "../services/api";

const orderStatuses = [
    "Pending",
    "Preparing",
    "Ready",
    "Collected"
];

function formatDate(value) {
    if (!value) return null;

    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? null
        : date.toLocaleString();
}

export default function OrderTracking() {
    const [trackingCode, setTrackingCode] = useState("");
    const [order, setOrder] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function lookupOrder(event) {
        event.preventDefault();
        setError("");
        setLoading(true);

        try {
            const result = await trackOrder(trackingCode.trim());
            setOrder(result);
        } catch (err) {
            setOrder(null);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const currentStatusIndex = orderStatuses.indexOf(order?.status);

    return (
        <section className="tracking-section" id="track-order">
            <div className="tracking-card">
                <div className="tracking-heading">
                    <span className="eyebrow">YOUR BREWHAUS ORDER</span>
                    <h2>Track Your Order</h2>
                    <p>
                        Enter the tracking code from your checkout
                        confirmation to see your order progress.
                    </p>
                </div>

                <form className="tracking-form" onSubmit={lookupOrder}>
                    <label htmlFor="trackingCode">Tracking code</label>
                    <div className="tracking-input-row">
                        <input
                            id="trackingCode"
                            value={trackingCode}
                            onChange={event =>
                                setTrackingCode(event.target.value)
                            }
                            placeholder="Paste your tracking code"
                            autoComplete="off"
                            required
                        />
                        <button
                            className="checkout-button"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? "Checking..." : "Track Order"}
                        </button>
                    </div>
                </form>

                {error && (
                    <p className="error-message tracking-error" role="alert">
                        {error}
                    </p>
                )}

                {order && (
                    <div className="tracking-result" aria-live="polite">
                        <div className="tracking-result-heading">
                            <div>
                                <span className="eyebrow">ORDER STATUS</span>
                                <h3>{order.status}</h3>
                            </div>
                            <button
                                type="button"
                                className="staff-refresh"
                                onClick={lookupOrder}
                                disabled={loading}
                            >
                                <RefreshCw size={16} />
                                {loading ? "Refreshing..." : "Refresh"}
                            </button>
                        </div>

                        <ol className="order-progress">
                            {orderStatuses.map((status, index) => {
                                const isComplete =
                                    currentStatusIndex >= index;
                                const isCurrent =
                                    currentStatusIndex === index;

                                return (
                                    <li
                                        key={status}
                                        className={[
                                            isComplete ? "complete" : "",
                                            isCurrent ? "current" : ""
                                        ].filter(Boolean).join(" ")}
                                        aria-current={
                                            isCurrent ? "step" : undefined
                                        }
                                    >
                                        <span className="progress-marker">
                                            {index + 1}
                                        </span>
                                        <span>{status}</span>
                                    </li>
                                );
                            })}
                        </ol>

                        <div className="tracking-order-details">
                            <h4>Items in your order</h4>
                            {Array.isArray(order.items) &&
                            order.items.length > 0 ? (
                                <ul>
                                    {order.items.map((item, index) => (
                                        <li key={`${item.name}-${index}`}>
                                            <span>{item.name}</span>
                                            <span>× {item.quantity}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>Order items are unavailable.</p>
                            )}
                            {formatDate(order.updatedAt || order.createdAt) && (
                                <p className="tracking-updated">
                                    Last updated{" "}
                                    {formatDate(
                                        order.updatedAt || order.createdAt
                                    )}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
