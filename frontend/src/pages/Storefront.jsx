import { useCallback, useEffect, useState } from "react";
import api from "../api/client";
import PublicNavbar from "../components/PublicNavbar";
import ShopCard from "../components/ShopCard";
import "./Storefront.css";

export default function Storefront() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = useCallback((params) => {
    setLoading(true);
    api
      .get("/products", { params })
      .then((res) => {
        setProducts(res.data);
        setError(null);
      })
      .catch((err) => setError(err.message ?? "Failed to load catalog"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api
      .get("/categories")
      .then((res) => setCategories(res.data))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      const params = {};
      if (search.trim()) params.search_query = search.trim();
      if (categoryId) params.category_id = Number(categoryId);
      fetchProducts(params);
    }, 200);
    return () => clearTimeout(handle);
  }, [search, categoryId, fetchProducts]);

  function scrollToCatalog() {
    document
      .getElementById("catalog")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleBuy(product) {
    window.alert(`Added "${product.name}" to your cart (demo).`);
  }

  return (
    <div className="storefront">
      <PublicNavbar />

      <section className="hero">
        <div className="hero-inner">
          <span className="hero-eyebrow">A vault of cinema, on disc.</span>
          <h1 className="hero-title">
            Films that <em>refuse</em> to fade.
          </h1>
          <p className="hero-sub">
            A curated archive of action, sci-fi, noir, and horror — pressed to
            physical media for collectors who still believe in the format.
          </p>
          <div className="hero-actions">
            <button className="btn hero-cta" onClick={scrollToCatalog}>
              Enter the Vault
            </button>
            <a
              href="#catalog"
              className="hero-secondary"
              onClick={(e) => {
                e.preventDefault();
                scrollToCatalog();
              }}
            >
              Browse collections →
            </a>
          </div>
        </div>
      </section>

      <section id="catalog" className="catalog">
        <div className="catalog-inner">
          <header className="catalog-header">
            <div>
              <h2 className="catalog-title">The Vault</h2>
              <p className="catalog-sub">
                {products.length} {products.length === 1 ? "film" : "films"}{" "}
                available
              </p>
            </div>
            <div className="catalog-filters">
              <input
                className="input catalog-search"
                type="search"
                placeholder="Search films…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="input catalog-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </header>

          {loading ? (
            <div className="catalog-empty">Loading the vault…</div>
          ) : error ? (
            <div className="catalog-empty catalog-error">{error}</div>
          ) : products.length === 0 ? (
            <div className="catalog-empty">No films match your filters.</div>
          ) : (
            <div className="shop-grid">
              {products.map((p) => (
                <ShopCard key={p.id} product={p} onBuy={handleBuy} />
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="public-footer">
        <div className="public-footer-inner">
          <span>© {new Date().getFullYear()} dvdVault</span>
          <span className="public-footer-tag">Pressed for collectors.</span>
        </div>
      </footer>
    </div>
  );
}
