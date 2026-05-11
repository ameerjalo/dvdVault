import toast from "react-hot-toast";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import "./ShopCard.css";

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
      />
    </svg>
  );
}

export default function ShopCard({ product }) {
  const { addToCart, openCart } = useCart();
  const { isInWishlist, toggle } = useWishlist();
  const active = isInWishlist(product.id);

  function handleImgError(e) {
    e.currentTarget.src =
      "https://placehold.co/600x400/e2e8f0/64748b?text=No+Image";
  }

  function handleBuy() {
    addToCart(product);
    toast.success(`Added "${product.name}" to cart`);
    openCart();
  }

  function handleWishlist(e) {
    e.preventDefault();
    e.stopPropagation();
    toggle(product);
  }

  const inStock = product.stock > 0;

  return (
    <article className="shop-card">
      <div className="shop-card-media">
        <img
          className="shop-card-img"
          src={product.image_url}
          alt={product.name}
          loading="lazy"
          onError={handleImgError}
        />
        <button
          type="button"
          className={`shop-card-wishlist${active ? " is-active" : ""}`}
          onClick={handleWishlist}
          aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={active}
        >
          <HeartIcon />
        </button>
      </div>
      <div className="shop-card-body">
        <h3 className="shop-card-title">{product.name}</h3>
        {product.description && (
          <p className="shop-card-desc">{product.description}</p>
        )}
        <div className="shop-card-footer">
          <span className="shop-card-price">${product.price.toFixed(2)}</span>
          <button
            type="button"
            className="btn shop-card-cta"
            disabled={!inStock}
            onClick={handleBuy}
          >
            {inStock ? "Buy Now" : "Sold Out"}
          </button>
        </div>
      </div>
    </article>
  );
}
