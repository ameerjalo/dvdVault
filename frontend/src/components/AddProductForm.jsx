import { useEffect, useState } from "react";
import api from "../api/client";
import "./AddProductForm.css";

const EMPTY = {
  name: "",
  description: "",
  price: "",
  stock: "",
  category_id: "",
};

export default function AddProductForm({ initialProduct, onSuccess, onCancel }) {
  const isEdit = Boolean(initialProduct);
  const [name, setName] = useState(initialProduct?.name ?? "");
  const [description, setDescription] = useState(initialProduct?.description ?? "");
  const [price, setPrice] = useState(
    initialProduct?.price != null ? String(initialProduct.price) : "",
  );
  const [stock, setStock] = useState(
    initialProduct?.stock != null ? String(initialProduct.stock) : "",
  );
  const [categoryId, setCategoryId] = useState(
    initialProduct?.category_id != null ? String(initialProduct.category_id) : "",
  );
  const [imageUrl, setImageUrl] = useState(initialProduct?.image_url ?? "");
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/categories")
      .then((res) => setCategories(res.data))
      .catch(() => setCategories([]));
  }, []);

  function validate() {
    if (!name.trim()) return "Name is required.";
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum <= 0)
      return "Price must be greater than 0.";
    const stockNum = Number(stock);
    if (!Number.isInteger(stockNum) || stockNum < 0)
      return "Stock must be a non-negative integer.";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      price: Number(price),
      stock: Number(stock),
      category_id: categoryId === "" ? null : Number(categoryId),
    };
    const trimmedImage = imageUrl.trim();
    if (trimmedImage) payload.image_url = trimmedImage;

    setSubmitting(true);
    try {
      if (isEdit) {
        await api.put(`/products/${initialProduct.id}`, payload);
      } else {
        await api.post("/products", payload);
      }
      onSuccess();
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((d) => d.msg).join("; ")
            : "Save failed.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="product-form">
      <label className="field">
        <span>Name</span>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </label>
      <label className="field">
        <span>Description</span>
        <textarea
          className="input"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <div className="field-row">
        <label className="field">
          <span>Price ($)</span>
          <input
            className="input"
            type="number"
            min="0.01"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Stock</span>
          <input
            className="input"
            type="number"
            min="0"
            step="1"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            required
          />
        </label>
      </div>
      <label className="field">
        <span>Category</span>
        <select
          className="input"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">— None —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Image URL (optional)</span>
        <input
          className="input"
          type="url"
          placeholder="https://…"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
      </label>

      {error && <div className="form-error">{error}</div>}

      <div className="form-actions">
        <button
          type="button"
          className="btn-ghost"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Create product"}
        </button>
      </div>
    </form>
  );
}

export { EMPTY };
