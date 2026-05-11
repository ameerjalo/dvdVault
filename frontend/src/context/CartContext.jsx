import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "bytebooks_cart";

const CartContext = createContext(null);

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(readStored);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
    } catch {
      /* ignore */
    }
  }, [cartItems]);

  const addToCart = useCallback((product) => {
    setCartItems((items) => {
      const existing = items.find((i) => i.id === product.id);
      const stock = Number(product.stock ?? 0);
      if (existing) {
        const nextQty = Math.min(existing.quantity + 1, stock);
        if (nextQty === existing.quantity) return items;
        return items.map((i) =>
          i.id === product.id ? { ...i, quantity: nextQty } : i,
        );
      }
      if (stock < 1) return items;
      return [
        ...items,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          image_url: product.image_url,
          stock,
          quantity: 1,
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((id, quantity) => {
    setCartItems((items) =>
      items
        .map((i) =>
          i.id === id
            ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) }
            : i,
        )
        .filter((i) => i.quantity > 0),
    );
  }, []);

  const removeFromCart = useCallback((id) => {
    setCartItems((items) => items.filter((i) => i.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const { cartTotal, cartCount } = useMemo(() => {
    let total = 0;
    let count = 0;
    for (const i of cartItems) {
      total += i.price * i.quantity;
      count += i.quantity;
    }
    return { cartTotal: total, cartCount: count };
  }, [cartItems]);

  const value = useMemo(
    () => ({
      cartItems,
      cartTotal,
      cartCount,
      isOpen,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      openCart,
      closeCart,
    }),
    [
      cartItems,
      cartTotal,
      cartCount,
      isOpen,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      openCart,
      closeCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
