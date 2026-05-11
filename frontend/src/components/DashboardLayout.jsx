import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "./DashboardLayout.css";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", end: true },
  { to: "/dashboard/products", label: "Products" },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">B</span>
          <span className="brand-text">ByteBooks</span>
        </div>
        <nav className="nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `nav-link${isActive ? " nav-link-active" : ""}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <Link to="/" className="storefront-link">
            ← Back to Storefront
          </Link>
          {user ? (
            <>
              <div className="user-info">
                <div className="user-email">{user.email}</div>
                <div className="user-role">
                  {user.is_admin ? "Administrator" : "Member"}
                </div>
              </div>
              <button className="btn-ghost btn-logout" onClick={handleLogout}>
                Sign out
              </button>
            </>
          ) : (
            <NavLink to="/login" className="btn btn-login">
              Sign in
            </NavLink>
          )}
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
