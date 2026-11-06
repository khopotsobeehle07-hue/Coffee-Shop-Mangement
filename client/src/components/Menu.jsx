
import ProductCard from "./ProductCard";

const categories = ["All", "Coffee", "Tea", "Pastries"];

export default function Menu({
    products,
    activeCategory,
    setActiveCategory,
    onAdd
}) {
    const filteredProducts = activeCategory === "All"
        ? products
        : products.filter(
            product => product.category.toLowerCase() ===
                activeCategory.toLowerCase()
        );

    return (
        <section className="menu-section" id="menu">
            <div className="section-heading">
                <span className="eyebrow">MADE FRESH DAILY</span>
                <h2>Explore Our Menu</h2>
                <p>Find your next favourite cup.</p>
            </div>

            <div className="categories">
                {categories.map(category => (
                    <button
                        key={category}
                        className={activeCategory === category ? "active" : ""}
                        onClick={() => setActiveCategory(category)}
                    >
                        {category}
                    </button>
                ))}
            </div>

            <div className="product-grid">
                {filteredProducts.map(product => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        onAdd={onAdd}
                    />
                ))}
            </div>

            {filteredProducts.length === 0 && (
                <p className="empty-message">
                    No products available in this category.
                </p>
            )}
        </section>
    );
}
