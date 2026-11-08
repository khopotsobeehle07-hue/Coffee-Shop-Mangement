
import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Menu from "./components/Menu";
import Cart from "./components/Cart";
import StaffDashboard from "./components/StaffDashboard";
import {
    getMenu,
    placeOrder,
    loginStaff,
    staffAPI
} from "./services/api";
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

    const [staffMode, setStaffMode] = useState(false);
    const [staffAuthenticated, setStaffAuthenticated] = useState(false);
    const [staffUsername, setStaffUsername] = useState("");
    const [staffPassword, setStaffPassword] = useState("");
    const [staffError, setStaffError] = useState("");
    const [staffLoading, setStaffLoading] = useState(false);

    const cartCount = cart.reduce(
        (sum, item) => sum + item.quantity,
        0
    );

    async function refreshMenu() {
        const updatedMenu = await getMenu();
        setProducts(updatedMenu);
    }

    useEffect(() => {
        getMenu()
            .then(setProducts)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    function addToCart(product) {
        if (!product.available) return;

        setCart(current => {
            const existing = current.find(
                item => item.id === product.id
            );

            if (existing) {
                return current.map(item =>
                    item.id === product.id
                        ? {
                            ...item,
                            quantity: item.quantity + 1
                        }
                        : item
                );
            }

            return [
                ...current,
                {
                    ...product,
                    quantity: 1
                }
            ];
        });
    }

    function changeQuantity(id, amount) {
        setCart(current =>
            current
                .map(item =>
                    item.id === id
                        ? {
                            ...item,
                            quantity: item.quantity + amount
                        }
                        : item
                )
                .filter(item => item.quantity > 0)
        );
    }

    function removeItem(id) {
        setCart(current =>
            current.filter(item => item.id !== id)
        );
    }

    async function submitOrder(event) {
        event.preventDefault();
        setError("");
        setSuccess("");

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
    }

    async function handleStaffLogin(event) {
        event.preventDefault();

        setStaffError("");
        setStaffLoading(true);

        try {
            const result = await loginStaff({
                username: staffUsername,
                password: staffPassword
            });

            sessionStorage.setItem("staffToken", result.token);

            await staffAPI.getOrders();

            setStaffAuthenticated(true);
            setStaffPassword("");
        } catch (err) {
            sessionStorage.removeItem("staffToken");
            setStaffAuthenticated(false);
            setStaffError(err.message);
        } finally {
            setStaffLoading(false);
        }
    }

    function logoutStaff() {
        sessionStorage.removeItem("staffToken");
        setStaffAuthenticated(false);
        setStaffUsername("");
        setStaffPassword("");
        setStaffMode(false);
        setStaffError("");
    }

    function toggleStaffMode() {
        setStaffMode(current => !current);
        setStaffError("");
    }

    return (
        <>
            <Navbar
                cartCount={cartCount}
                onCartClick={() => setCartOpen(true)}
            />

            <div className="app-toolbar">
                <button
                    type="button"
                    className="staff-toggle"
                    onClick={toggleStaffMode}
                >
                    {staffMode
                        ? "Return to Customer View"
                        : "Staff Dashboard"}
                </button>
            </div>

            {staffMode ? (
                staffAuthenticated ? (
                    <>
                        <div className="staff-topbar">
                            <span>Staff access active</span>

                            <button
                                type="button"
                                onClick={logoutStaff}
                            >
                                Sign Out
                            </button>
                        </div>

                        <StaffDashboard
                            products={products}
                            refreshMenu={refreshMenu}
                        />
                    </>
                ) : (
                    <main className="staff-login-page">
                        <form
                            className="staff-login-form"
                            onSubmit={handleStaffLogin}
                        >
                            <span className="eyebrow">
                                BREWHAUS MANAGEMENT
                            </span>

                            <h1>Staff Login</h1>

                            <p>
                                Sign in to manage products and
                                customer orders.
                            </p>

                            <label htmlFor="staffUsername">
                                Username
                            </label>

                            <input
                                id="staffUsername"
                                value={staffUsername}
                                onChange={event =>
                                    setStaffUsername(event.target.value)
                                }
                                placeholder="Enter username"
                                autoComplete="username"
                                required
                            />

                            <label htmlFor="staffPassword">
                                Password
                            </label>

                            <input
                                id="staffPassword"
                                type="password"
                                value={staffPassword}
                                onChange={event =>
                                    setStaffPassword(event.target.value)
                                }
                                placeholder="Enter password"
                                autoComplete="current-password"
                                required
                            />

                            {staffError && (
                                <p className="error-message">
                                    {staffError}
                                </p>
                            )}

                            <button
                                className="checkout-button"
                                type="submit"
                                disabled={staffLoading}
                            >
                                {staffLoading
                                    ? "Signing in..."
                                    : "Sign In"}
                            </button>
                        </form>
                    </main>
                )
            ) : (
                <>
                    <Hero />

                    <main>
                        {error && (
                            <p className="error-message app-message">
                                {error}
                            </p>
                        )}

                        {success && (
                            <p className="success-message app-message">
                                {success}
                            </p>
                        )}

                        {loading ? (
                            <p className="empty-message">
                                Loading menu...
                            </p>
                        ) : (
                            <Menu
                                products={products}
                                activeCategory={category}
                                setActiveCategory={setCategory}
                                onAdd={addToCart}
                            />
                        )}

                        <section
                            className="about-section"
                            id="about"
                        >
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
                </>
            )}

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
                    <form
                        className="checkout-form"
                        onSubmit={submitOrder}
                    >
                        <h2>Complete Your Order</h2>

                        <label htmlFor="customerName">
                            Customer name
                        </label>

                        <input
                            id="customerName"
                            value={customerName}
                            onChange={event =>
                                setCustomerName(event.target.value)
                            }
                            placeholder="Enter your name"
                            required
                        />

                        {error && (
                            <p className="error-message">
                                {error}
                            </p>
                        )}

                        <button
                            className="checkout-button"
                            type="submit"
                        >
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
