import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import PublicNavbar from "../components/PublicNavbar";
import ShopCard from "../components/ShopCard";
import { useWishlist } from "../context/WishlistContext";
import "../pages/Storefront.css";
import "./Wishlist.css";

export default function Wishlist() {
  const { wishlistIds, refresh } = useWishlist();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get("/wishlist")
      .then((res) => {
        if (!cancelled) {
          setProducts(res.data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.detail ?? "Failed to load wishlist.");
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [wishlistIds.length]);

  return (
    <div className="storefront">
      <PublicNavbar />

      <section className="wishlist-section">
        <div className="wishlist-inner">
          <header className="wishlist-header">
            <div>
              <h1 className="wishlist-title">My Wishlist</h1>
              <p className="wishlist-sub">
                {loading
                  ? "Loading your saved films…"
                  : products.length === 0
                    ? "You haven't saved any films yet."
                    : `${products.length} saved ${products.length === 1 ? "film" : "films"}`}
              </p>
            </div>
            <button
              type="button"
              className="btn-ghost wishlist-refresh"
              onClick={() => refresh()}
              disabled={loading}
            >
              Refresh
            </button>
          </header>

          {error && <div className="wishlist-error">{error}</div>}

          {!loading && !error && products.length === 0 && (
            <div className="wishlist-empty">
              <p>Browse the vault and tap the heart on any film to save it here.</p>
              <Link to="/" className="btn">
                Enter the vault
              </Link>
            </div>
          )}

          {products.length > 0 && (
            <div className="shop-grid">
              {products.map((p) => (
                <ShopCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
