import { useCallback, useEffect, useState } from "react";
import api from "../api/client";
import AddProductForm from "../components/AddProductForm";
import Modal from "../components/Modal";
import { useAuth } from "../auth/AuthContext";
import "./Products.css";

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const isAdmin = Boolean(user?.is_admin);

  const fetchProducts = useCallback(
    (params = {}) => {
      setLoading(true);
      api
        .get("/products", { params })
        .then((res) => {
          setProducts(res.data);
          setError(null);
        })
        .catch((err) => setError(err.message ?? "Failed to load products"))
        .finally(() => setLoading(false));
    },
    [],
  );

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

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(product) {
    setEditing(product);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function refresh() {
    const params = {};
    if (search.trim()) params.search_query = search.trim();
    if (categoryId) params.category_id = Number(categoryId);
    fetchProducts(params);
  }

  function handleSuccess() {
    closeModal();
    refresh();
  }

  async function handleDelete(product) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`))
      return;
    setDeletingId(product.id);
    try {
      await api.delete(`/products/${product.id}`);
      refresh();
    } catch (err) {
      const detail = err.response?.data?.detail ?? "Delete failed.";
      window.alert(detail);
    } finally {
      setDeletingId(null);
    }
  }

  function handleImgError(e) {
    e.currentTarget.src =
      "https://placehold.co/80x80/e2e8f0/64748b?text=No+Img";
  }

  return (
    <div>
      <header className="page-header page-header-row">
        <div>
          <h1>Products</h1>
          <p className="page-subtitle">{products.length} items in catalog.</p>
        </div>
        {isAdmin && (
          <button className="btn" onClick={openCreate}>
            + New product
          </button>
        )}
      </header>

      <div className="filter-bar">
        <input
          className="input filter-search"
          type="search"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input filter-select"
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

      <div className="card table-card">
        {loading ? (
          <div className="table-empty">Loading…</div>
        ) : error ? (
          <div className="table-empty table-error">{error}</div>
        ) : products.length === 0 ? (
          <div className="table-empty">No products yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th className="thumb-col">Image</th>
                <th>ID</th>
                <th>Name</th>
                <th>Description</th>
                <th className="num">Price</th>
                <th className="num">Stock</th>
                {isAdmin && <th className="actions-col">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="thumb-col">
                    <img
                      className="product-thumb"
                      src={p.image_url}
                      alt={p.name}
                      loading="lazy"
                      onError={handleImgError}
                    />
                  </td>
                  <td className="muted">#{p.id}</td>
                  <td className="bold">{p.name}</td>
                  <td className="muted ellipsis">{p.description}</td>
                  <td className="num">${p.price.toFixed(2)}</td>
                  <td className="num">
                    <span
                      className={`stock-pill${
                        p.stock > 0 ? "" : " stock-pill-empty"
                      }`}
                    >
                      {p.stock}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="actions-col">
                      <div className="row-actions">
                        <button
                          className="btn-ghost btn-row"
                          onClick={() => openEdit(p)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-ghost btn-row btn-danger"
                          onClick={() => handleDelete(p)}
                          disabled={deletingId === p.id}
                        >
                          {deletingId === p.id ? "…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={modalOpen}
        title={editing ? "Edit product" : "New product"}
        onClose={closeModal}
      >
        <AddProductForm
          initialProduct={editing}
          onSuccess={handleSuccess}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  );
}
