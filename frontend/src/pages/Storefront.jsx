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
          <span className="hero-eyebrow">Curated reading, delivered.</span>
          <h1 className="hero-title">
            Discover books that <em>change</em> the way you think.
          </h1>
          <p className="hero-sub">
            A boutique catalog of fiction, technology, and business titles —
            handpicked for the relentlessly curious.
          </p>
          <div className="hero-actions">
            <button className="btn hero-cta" onClick={scrollToCatalog}>
              Browse the Catalog
            </button>
            <a
              href="#catalog"
              className="hero-secondary"
              onClick={(e) => {
                e.preventDefault();
                scrollToCatalog();
              }}
            >
              View collections →
            </a>
          </div>
        </div>
      </section>

      <section id="catalog" className="catalog">
        <div className="catalog-inner">
          <header className="catalog-header">
            <div>
              <h2 className="catalog-title">The Catalog</h2>
              <p className="catalog-sub">
                {products.length} {products.length === 1 ? "title" : "titles"}{" "}
                available
              </p>
            </div>
            <div className="catalog-filters">
              <input
                className="input catalog-search"
                type="search"
                placeholder="Search titles…"
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
            <div className="catalog-empty">Loading the shelves…</div>
          ) : error ? (
            <div className="catalog-empty catalog-error">{error}</div>
          ) : products.length === 0 ? (
            <div className="catalog-empty">No titles match your filters.</div>
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
          <span>© {new Date().getFullYear()} ByteBooks</span>
          <span className="public-footer-tag">Crafted for readers.</span>
        </div>
      </footer>
    </div>
  );
}
