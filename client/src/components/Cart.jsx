
import { X, Trash2 } from "lucide-react";

export default function Cart({
    open,
    onClose,
    cart,
    onQuantityChange,
    onRemove,
    onCheckout
}) {
    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
    );

    if (!open) return null;

    return (
        <div className="cart-overlay">
            <div className="cart-panel">
                <div className="cart-header">
                    <h2>Your Cart</h2>
                    <button onClick={onClose}><X /></button>
                </div>

                {cart.map(item => (
                    <div className="cart-item" key={item.id}>
                        <div>
                            <h4>{item.name}</h4>
                            <p>M{item.price.toFixed(2)}</p>
                        </div>

                        <div className="quantity">
                            <button onClick={() =>
                                onQuantityChange(item.id, -1)
                            }>-</button>

                            <span>{item.quantity}</span>

                            <button onClick={() =>
                                onQuantityChange(item.id, 1)
                            }>+</button>

                            <button onClick={() => onRemove(item.id)}>
                                <Trash2 size={17} />
                            </button>
                        </div>
                    </div>
                ))}

                {cart.length === 0 && <p>Your cart is empty.</p>}

                <div className="cart-total">
                    <strong>Total</strong>
                    <strong>M{total.toFixed(2)}</strong>
                </div>

                <button
                    className="checkout-button"
                    disabled={cart.length === 0}
                    onClick={onCheckout}
                >
                    Proceed to Checkout
                </button>
            </div>
        </div>
    );
}
