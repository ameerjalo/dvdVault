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
        <p className="page-subtitle">Overview of your dvdVault archive.</p>
      </header>

      {error && <div className="dashboard-error">{error}</div>}

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-accent" style={{ background: "#e11d48" }} />
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value">
            {loading ? "…" : currency(totalRevenue)}
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-accent" style={{ background: "#eab308" }} />
          <div className="stat-label">Orders (last 7 days)</div>
          <div className="stat-value">{loading ? "…" : totalOrders}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-accent" style={{ background: "#22c55e" }} />
          <div className="stat-label">Total Films</div>
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
                      <stop offset="0%" stopColor="#e11d48" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#e11d48" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="label" stroke="#a1a1aa" fontSize={12} />
                  <YAxis stroke="#a1a1aa" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 10, color: "#fafafa" }}
                    formatter={(value, name) =>
                      name === "revenue" ? currency(value) : value
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#e11d48"
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
            <p>Inventory levels across the vault</p>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} />
                  <YAxis stroke="#a1a1aa" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 10, color: "#fafafa" }}
                    cursor={{ fill: "rgba(234, 179, 8, 0.08)" }}
                  />
                  <Bar dataKey="stock" fill="#eab308" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
