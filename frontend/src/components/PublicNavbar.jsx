import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../context/CartContext";
import "./PublicNavbar.css";

export default function PublicNavbar() {
  const { token } = useAuth();
  const { cartCount, openCart } = useCart();

  return (
    <header className="public-nav">
      <div className="public-nav-inner">
        <Link to="/" className="public-brand">
          <span className="public-brand-mark">D</span>
          <span className="public-brand-text">dvdVault</span>
        </Link>
        <nav className="public-nav-links">
          <NavLink to="/" end className="public-nav-link">
            Shop
          </NavLink>
          {token && (
            <>
              <NavLink to="/wishlist" className="public-nav-link">
                Wishlist
              </NavLink>
              <NavLink to="/orders" className="public-nav-link">
                Orders
              </NavLink>
              <NavLink to="/dashboard" className="public-nav-link">
                Dashboard
              </NavLink>
            </>
          )}
          <button
            type="button"
            className="public-cart-btn"
            onClick={openCart}
            aria-label={`Open cart (${cartCount} items)`}
          >
            Cart
            {cartCount > 0 && <span className="public-cart-badge">{cartCount}</span>}
          </button>
          {!token && (
            <>
              <NavLink to="/register" className="public-nav-link">
                Register
              </NavLink>
              <Link to="/login" className="btn public-login-btn">
                Login
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
