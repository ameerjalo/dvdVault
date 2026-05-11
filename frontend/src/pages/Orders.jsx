import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import PublicNavbar from "../components/PublicNavbar";
import "./Orders.css";

const PLACEHOLDER = "https://placehold.co/120x180/18181b/a1a1aa?text=Film";

const currency = (n) =>
  Number(n ?? 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });

function formatDate(iso) {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.get("/orders/me"), api.get("/products")])
      .then(([ordersRes, productsRes]) => {
        if (cancelled) return;
        setOrders(ordersRes.data);
        const map = {};
        for (const p of productsRes.data) map[p.id] = p;
        setProducts(map);
        if (ordersRes.data.length > 0) setOpenId(ordersRes.data[0].id);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.response?.data?.detail ?? "Failed to load orders.");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const totalSpend = useMemo(
    () => orders.reduce((sum, o) => sum + o.total_price, 0),
    [orders],
  );

  return (
    <div className="orders-shell">
      <PublicNavbar />
      <main className="orders-main">
        <header className="orders-header">
          <h1>My Orders</h1>
          <p className="orders-subtitle">
            {orders.length === 0
              ? "No orders yet."
              : `${orders.length} order${orders.length === 1 ? "" : "s"} · ${currency(totalSpend)} lifetime spend`}
          </p>
        </header>

        {loading && <div className="orders-empty">Loading orders…</div>}
        {error && <div className="orders-error">{error}</div>}

        {!loading && !error && orders.length === 0 && (
          <div className="orders-empty">
            You haven't placed any orders yet.
          </div>
        )}

        <div className="orders-list">
          {orders.map((order) => {
            const isOpen = openId === order.id;
            return (
              <article
                key={order.id}
                className={`card order-card ${isOpen ? "is-open" : ""}`}
              >
                <button
                  type="button"
                  className="order-summary"
                  onClick={() => setOpenId(isOpen ? null : order.id)}
                  aria-expanded={isOpen}
                >
                  <div className="order-summary-main">
                    <span className="order-id">Order #{order.id}</span>
                    <span className="order-date">{formatDate(order.created_at)}</span>
                  </div>
                  <div className="order-summary-right">
                    <span className={`order-status status-${order.status}`}>
                      {order.status}
                    </span>
                    <span className="order-total">{currency(order.total_price)}</span>
                    <span className="order-chevron" aria-hidden>
                      {isOpen ? "▾" : "▸"}
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="order-details">
                    <ul className="order-items">
                      {order.items.map((item) => {
                        const product = products[item.product_id];
                        return (
                          <li key={item.id} className="order-item">
                            <img
                              src={product?.image_url ?? PLACEHOLDER}
                              alt={product?.name ?? `Product ${item.product_id}`}
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.src = PLACEHOLDER;
                              }}
                            />
                            <div className="order-item-body">
                              <div className="order-item-name">
                                {product?.name ?? `Product #${item.product_id}`}
                              </div>
                              <div className="order-item-meta">
                                Qty {item.quantity} · {currency(item.price_at_purchase)} each
                              </div>
                            </div>
                            <div className="order-item-line">
                              {currency(item.quantity * item.price_at_purchase)}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
