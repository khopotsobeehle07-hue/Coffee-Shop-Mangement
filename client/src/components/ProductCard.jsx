
import { Plus } from "lucide-react";

export default function ProductCard({ product, onAdd }) {
    return (
        <article className="product-card">
            <div className="product-image">
                <img
                    src={product.image || "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600"}
                    alt={product.name}
                />

                {!product.available && (
                    <span className="unavailable">Unavailable</span>
                )}
            </div>

            <div className="product-info">
                <span className="product-category">
                    {product.category}
                </span>

                <h3>{product.name}</h3>

                <p>{product.description}</p>

                <div className="product-footer">
                    <strong>M{product.price.toFixed(2)}</strong>

                    <button
                        disabled={!product.available}
                        onClick={() => onAdd(product)}
                        aria-label={`Add ${product.name} to cart`}
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </div>
        </article>
    );
}
