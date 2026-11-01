"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { CartItem, Quote } from "@/lib/types";

const STORAGE_KEY = "amoka-cart";
const MERGED_KEY = "amoka-cart-merged";

type CartContextValue = {
  items: CartItem[];
  count: number;
  ready: boolean;
  add: (variantId: string, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// The cart lives in localStorage for everyone. Once signed in it is merged into the
// saved cart a single time per session, and later changes are copied across.
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const skipNextSync = useRef(false);

  useEffect(() => {
    // localStorage only exists in the browser, so this can't run during server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(readStorage());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const id = session?.user.id ?? null;
      setUserId(id);

      if (event === "SIGNED_OUT") {
        sessionStorage.removeItem(MERGED_KEY);
        localStorage.removeItem(STORAGE_KEY);
        skipNextSync.current = true;
        setItems([]);
        return;
      }

      if (id && sessionStorage.getItem(MERGED_KEY) !== id) {
        // Deferred: Supabase warns against awaiting its own calls inside this callback.
        setTimeout(async () => {
          const { data: merged, error } = await supabase.rpc("sync_cart", { p_items: readStorage() });
          if (error) return;
          sessionStorage.setItem(MERGED_KEY, id);
          skipNextSync.current = true;
          setItems(merged as CartItem[]);
        }, 0);
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));

    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }
    if (!userId || sessionStorage.getItem(MERGED_KEY) !== userId) return;

    const timer = setTimeout(() => {
      void createClient().rpc("sync_cart", { p_items: items, p_replace: true });
    }, 500);
    return () => clearTimeout(timer);
  }, [items, ready, userId]);

  const setQuantity = useCallback((variantId: string, quantity: number) => {
    setItems((current) =>
      quantity < 1
        ? current.filter((i) => i.variant_id !== variantId)
        : current.map((i) => (i.variant_id === variantId ? { ...i, quantity: Math.min(quantity, 99) } : i)),
    );
  }, []);

  const add = useCallback((variantId: string, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((i) => i.variant_id === variantId);
      if (!existing) return [...current, { variant_id: variantId, quantity }];
      return current.map((i) =>
        i === existing ? { ...i, quantity: Math.min(i.quantity + quantity, 99) } : i,
      );
    });
  }, []);

  const remove = useCallback((variantId: string) => setQuantity(variantId, 0), [setQuantity]);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      count: items.reduce((sum, i) => sum + i.quantity, 0),
      ready,
      add,
      setQuantity,
      remove,
      clear,
    }),
    [items, ready, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}

/** Live prices from the server for the current cart. Nothing is priced in the browser. */
export function useQuote() {
  const { items, ready } = useCart();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ready || !isSupabaseConfigured) return;
    let cancelled = false;

    createClient()
      .rpc("quote_cart", { p_items: items })
      .then(({ data, error: rpcError }) => {
        if (cancelled) return;
        setError(Boolean(rpcError));
        if (!rpcError) setQuote(data as Quote);
      });

    return () => {
      cancelled = true;
    };
  }, [items, ready]);

  return { quote, error, loading: !ready || (isSupabaseConfigured && !quote && !error) };
}
