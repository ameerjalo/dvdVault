import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../context/CartContext";
import api from "../api/client";
import "./CartDrawer.css";

export default function CartDrawer() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const {
    cartItems,
    cartTotal,
    isOpen,
    closeCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  const [submitting, setSubmitting] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState(null);
  const [error, setError] = useState(null);

  function handleSignIn() {
    closeCart();
    navigate("/login");
  }

  async function handleCheckout() {
    if (!token) {
      handleSignIn();
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        items: cartItems.map((i) => ({ product_id: i.id, quantity: i.quantity })),
      };
      const res = await api.post("/orders", payload);
      setSuccessOrderId(res.data.id);
      clearCart();
      toast.success(`Order #${res.data.id} placed successfully`);
    } catch (err) {
      const detail = err.response?.data?.detail ?? "Checkout failed.";
      setError(typeof detail === "string" ? detail : "Checkout failed.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setSuccessOrderId(null);
    setError(null);
    closeCart();
  }

  return (
    <>
      <div
        className={`cart-backdrop${isOpen ? " cart-backdrop-open" : ""}`}
        onClick={handleClose}
        aria-hidden={!isOpen}
      />
      <aside
        className={`cart-drawer${isOpen ? " cart-drawer-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        <header className="cart-header">
          <h2>Your Cart</h2>
          <button
            type="button"
            className="cart-close"
            onClick={handleClose}
            aria-label="Close cart"
          >
            ×
          </button>
        </header>

        <div className="cart-body">
          {successOrderId ? (
            <div className="cart-success">
              <div className="cart-success-icon">✓</div>
              <h3>Order placed</h3>
              <p>
                Thanks for your purchase. Your order{" "}
                <strong>#{successOrderId}</strong> is on its way.
              </p>
              <button type="button" className="btn" onClick={handleClose}>
                Keep shopping
              </button>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="cart-empty">
              <p>Your cart is empty.</p>
              <button type="button" className="btn-ghost" onClick={handleClose}>
                Browse the catalog
              </button>
            </div>
          ) : (
            <ul className="cart-list">
              {cartItems.map((item) => (
                <li key={item.id} className="cart-item">
                  <img
                    className="cart-item-img"
                    src={item.image_url}
                    alt={item.name}
                    loading="lazy"
                  />
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-price">
                      ${item.price.toFixed(2)}
                    </div>
                    <div className="cart-item-qty">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                        disabled={item.quantity >= item.stock}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="cart-item-remove"
                    onClick={() => removeFromCart(item.id)}
                    aria-label={`Remove ${item.name}`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {!successOrderId && cartItems.length > 0 && (
          <footer className="cart-footer">
            {error && <div className="cart-error">{error}</div>}
            <div className="cart-total-row">
              <span>Total</span>
              <strong>${cartTotal.toFixed(2)}</strong>
            </div>
            {token ? (
              <button
                type="button"
                className="btn cart-checkout"
                onClick={handleCheckout}
                disabled={submitting}
              >
                {submitting ? "Placing order…" : "Checkout"}
              </button>
            ) : (
              <button
                type="button"
                className="btn cart-checkout"
                onClick={handleSignIn}
              >
                Sign in to checkout
              </button>
            )}
            <p className="cart-disclaimer">
              {token
                ? "Order is placed against current stock and prices."
                : "You must be signed in to place an order."}
            </p>
          </footer>
        )}
      </aside>
    </>
  );
}
