
import { Coffee, ShoppingBag } from "lucide-react";

export default function Navbar({ cartCount, onCartClick }) {
    return (
        <nav className="navbar">
            <a href="#" className="logo">
                <Coffee size={27} />
                <span>BREW<span className="accent">HAUS</span></span>
            </a>

            <div className="nav-links">
                <a href="#home">Home</a>
                <a href="#menu">Our Menu</a>
                <a href="#track-order">Track Order</a>
                <a href="#about">About</a>
            </div>

            <button className="cart-button" onClick={onCartClick}>
                <ShoppingBag size={20} />
                Cart ({cartCount})
            </button>
        </nav>
    );
}
