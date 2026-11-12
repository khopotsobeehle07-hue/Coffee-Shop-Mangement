import { Check, Copy, Printer } from "lucide-react";

const maseruDateFormatter = new Intl.DateTimeFormat("en-LS", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Maseru"
});

function formatMaloti(amount) {
    const value = Number(amount);
    return `M${(Number.isFinite(value) ? value : 0).toFixed(2)}`;
}

export default function OrderCollectionSlip({
    order,
    trackingCode,
    copied,
    copyError,
    onCopy
}) {
    if (!order || !trackingCode) return null;

    const orderDate = new Date(order.createdAt);

    return (
        <section
            className="order-collection-slip"
            aria-labelledby="collection-slip-title"
        >
            <header className="slip-header">
                <span className="slip-brand-mark" aria-hidden="true">B</span>
                <div>
                    <p className="slip-brand-name">BREWHAUS</p>
                    <p className="slip-brand-caption">COFFEE · KITCHEN · COMMUNITY</p>
                </div>
            </header>

            <div className="slip-title-block">
                <span className="eyebrow">YOUR CUSTOMER RECEIPT</span>
                <h2 id="collection-slip-title">ORDER COLLECTION SLIP</h2>
                <p>
                    {Number.isNaN(orderDate.getTime())
                        ? "Order date unavailable"
                        : maseruDateFormatter.format(orderDate)}
                    {" · Africa/Maseru"}
                </p>
            </div>

            <div className="slip-customer-row">
                <span>Customer</span>
                <strong>{order.customerName}</strong>
            </div>

            <table className="slip-items-table">
                <thead>
                    <tr>
                        <th scope="col">Item</th>
                        <th scope="col">Qty</th>
                        <th scope="col">Price</th>
                        <th scope="col">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {(Array.isArray(order.items) ? order.items : []).map(
                        (item, index) => (
                            <tr key={`${item.productId || item.name}-${index}`}>
                                <td>{item.name}</td>
                                <td>{item.quantity}</td>
                                <td>{formatMaloti(item.price)}</td>
                                <td>{formatMaloti(item.subtotal)}</td>
                            </tr>
                        )
                    )}
                </tbody>
                <tfoot>
                    <tr>
                        <th scope="row" colSpan="3">Grand total</th>
                        <td>{formatMaloti(order.total)}</td>
                    </tr>
                </tfoot>
            </table>

            <div className="slip-status-row">
                <span>Initial order status</span>
                <strong>{order.status}</strong>
            </div>

            <div className="slip-tracking-block">
                <span className="eyebrow">YOUR SECURE TRACKING CODE</span>
                <code>{trackingCode}</code>
                <p>Keep this code safe. Anyone with it can view this order's progress.</p>
            </div>

            <div className="slip-instructions">
                <p>
                    Enter your tracking code on the BREWHAUS order tracking
                    page. Confirm collection only after you have physically
                    received your order.
                </p>
                <p>Thank you for choosing BREWHAUS. We hope you enjoy it.</p>
            </div>

            <div className="slip-actions">
                <button
                    type="button"
                    className="checkout-button"
                    onClick={() => window.print()}
                >
                    <Printer size={17} />
                    Print Slip
                </button>
                <button
                    type="button"
                    className="copy-tracking-button"
                    onClick={onCopy}
                >
                    {copied ? <Check size={17} /> : <Copy size={17} />}
                    {copied ? "Copied" : "Copy Tracking Code"}
                </button>
            </div>
            {copyError && <p className="error-message" role="alert">{copyError}</p>}
        </section>
    );
}