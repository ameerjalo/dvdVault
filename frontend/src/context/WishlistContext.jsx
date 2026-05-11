import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import toast from "react-hot-toast";
import api from "../api/client";
import { useAuth } from "../auth/AuthContext";

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { token } = useAuth();
  const [wishlistIds, setWishlistIds] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) {
      setWishlistIds([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get("/wishlist");
      setWishlistIds(res.data.map((p) => p.id));
    } catch {
      setWishlistIds([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = useCallback(
    async (product) => {
      if (!token) {
        toast.error("Sign in to save items.");
        return;
      }
      const productId = typeof product === "object" ? product.id : product;
      const name = typeof product === "object" ? product.name : null;
      const wasInList = wishlistIds.includes(productId);

      setWishlistIds((ids) =>
        wasInList ? ids.filter((id) => id !== productId) : [...ids, productId],
      );

      try {
        const res = await api.post(`/wishlist/${productId}`);
        const added = res.data?.added;
        if (added) {
          toast.success(name ? `Added "${name}" to wishlist` : "Added to wishlist");
        } else {
          toast.success(
            name ? `Removed "${name}" from wishlist` : "Removed from wishlist",
          );
        }
      } catch (err) {
        setWishlistIds((ids) =>
          wasInList ? [...ids, productId] : ids.filter((id) => id !== productId),
        );
        const detail = err.response?.data?.detail ?? "Could not update wishlist.";
        toast.error(typeof detail === "string" ? detail : "Could not update wishlist.");
      }
    },
    [token, wishlistIds],
  );

  const isInWishlist = useCallback(
    (productId) => wishlistIds.includes(productId),
    [wishlistIds],
  );

  const value = useMemo(
    () => ({
      wishlistIds,
      isInWishlist,
      toggle,
      refresh,
      loading,
    }),
    [wishlistIds, isInWishlist, toggle, refresh, loading],
  );

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
