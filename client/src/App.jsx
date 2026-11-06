
import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Menu from "./components/Menu";
import Cart from "./components/Cart";
import { getMenu, placeOrder } from "./services/api";
import "./App.css";

function App() {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [category, setCategory] = useState("All");
    const [cartOpen, setCartOpen] = useState(false);
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [customerName, setCustomerName] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        getMenu()
            .then(setProducts)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const addToCart = (product) => {
        setCart(current => {
            const existing = current.find(item => item.id === product.id);

            if (existing) {
                return current.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }

            return [...current, { ...product, quantity: 1 }];
        });
    };

    const changeQuantity = (id, amount) => {
        setCart(current =>
            current
                .map(item => item.id === id
                    ? { ...item, quantity: item.quantity + amount }
                    : item
                )
                .filter(item => item.quantity > 0)
        );
    };

    const removeItem = (id) => {
        setCart(current => current.filter(item => item.id !== id));
    };

    const submitOrder = async (event) => {
        event.preventDefault();
        setError("");

        try {
            const result = await placeOrder({
                customerName,
                items: cart.map(item => ({
                    productId: item.id,
                    quantity: item.quantity
                }))
            });

            setSuccess(
                `Order placed successfully! Order ID: ${result.order.id}`
            );

            setCart([]);
            setCheckoutOpen(false);
            setCartOpen(false);
            setCustomerName("");
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <>
            <Navbar
                cartCount={cart.reduce(
                    (sum, item) => sum + item.quantity, 0
                )}
                onCartClick={() => setCartOpen(true)}
            />

            <Hero />

            <main>
                <section className="menu-section" id="menu">
                    {error && <p className="error-message">{error}</p>}
                    {success && <p className="success-message">{success}</p>}

                    {loading ? (
                        <p className="empty-message">Loading menu...</p>
                    ) : (
                        <Menu
                            products={products}
                            activeCategory={category}
                            setActiveCategory={setCategory}
                            onAdd={addToCart}
                        />
                    )}
                </section>

                <section className="about-section" id="about">
                    <h2>More than just coffee.</h2>
                    <p>
                        We believe every cup tells a story.
                        Fresh ingredients, quality brewing
                        and good moments.
                    </p>
                </section>
            </main>

            <footer>
                © 2026 BREWHAUS. Crafted with passion.
            </footer>

            <Cart
                open={cartOpen}
                onClose={() => setCartOpen(false)}
                cart={cart}
                onQuantityChange={changeQuantity}
                onRemove={removeItem}
                onCheckout={() => {
                    setCartOpen(false);
                    setCheckoutOpen(true);
                }}
            />

            {checkoutOpen && (
                <div className="checkout-overlay">
                    <form className="checkout-form" onSubmit={submitOrder}>
                        <h2>Complete Your Order</h2>

                        <label htmlFor="customerName">
                            Customer name
                        </label>

                        <input
                            id="customerName"
                            value={customerName}
                            onChange={e => setCustomerName(e.target.value)}
                            placeholder="Enter your name"
                            required
                        />

                        {error && <p className="error-message">{error}</p>}

                        <button className="checkout-button" type="submit">
                            Place Order
                        </button>

                        <button
                            type="button"
                            className="cancel-button"
                            onClick={() => setCheckoutOpen(false)}
                        >
                            Cancel
                        </button>
                    </form>
                </div>
            )}
        </>
    );
}

export default App;
