import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../api/client";
import "./Dashboard.css";

const currency = (n) =>
  Number(n ?? 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });

function formatDayLabel(iso) {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "numeric",
    day: "numeric",
  });
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [productCount, setProductCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get("/admin/stats"),
      api.get("/products"),
    ])
      .then(([statsRes, productsRes]) => {
        if (cancelled) return;
        setStats(statsRes.data);
        setProductCount(productsRes.data.length);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.response?.data?.detail ?? "Failed to load analytics.");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const totalRevenue = stats?.total_revenue ?? 0;
  const totalOrders =
    stats?.orders_last_7_days?.reduce((sum, d) => sum + d.order_count, 0) ?? 0;

  const salesSeries =
    stats?.orders_last_7_days?.map((d) => ({
      label: formatDayLabel(d.date),
      revenue: d.revenue,
      orders: d.order_count,
    })) ?? [];

  const stockSeries =
    stats?.stock_by_category?.map((c) => ({
      name: c.category_name,
      stock: c.total_stock,
    })) ?? [];

  return (
    <div>
      <header className="page-header">
        <h1>Dashboard</h1>
        <p className="page-subtitle">Overview of your ByteBooks store.</p>
      </header>

      {error && <div className="dashboard-error">{error}</div>}

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-accent" style={{ background: "#2563eb" }} />
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value">
            {loading ? "…" : currency(totalRevenue)}
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-accent" style={{ background: "#16a34a" }} />
          <div className="stat-label">Orders (last 7 days)</div>
          <div className="stat-value">{loading ? "…" : totalOrders}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-accent" style={{ background: "#f59e0b" }} />
          <div className="stat-label">Total Products</div>
          <div className="stat-value">
            {productCount === null ? "…" : productCount}
          </div>
        </div>
      </div>

      <div className="chart-grid">
        <section className="card chart-card">
          <header className="chart-header">
            <h2>Recent Sales</h2>
            <p>Revenue over the last 7 days</p>
          </header>
          <div className="chart-body">
            {loading ? (
              <div className="chart-empty">Loading…</div>
            ) : salesSeries.length === 0 ? (
              <div className="chart-empty">No sales data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart
                  data={salesSeries}
                  margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    formatter={(value, name) =>
                      name === "revenue" ? currency(value) : value
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fill="url(#salesFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="card chart-card">
          <header className="chart-header">
            <h2>Stock by Category</h2>
            <p>Inventory levels across the catalog</p>
          </header>
          <div className="chart-body">
            {loading ? (
              <div className="chart-empty">Loading…</div>
            ) : stockSeries.length === 0 ? (
              <div className="chart-empty">No inventory data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={stockSeries}
                  margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="stock" fill="#16a34a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
