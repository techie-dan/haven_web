"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { CartLine, Product } from "@/lib/types";
import { cartCount, cartSubtotalCents } from "@/lib/pricing";
import { useAuth } from "@/components/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/config";
import {
  clearServerCart,
  deleteCartItem,
  fetchCartRows,
  mergeGuestLines,
  upsertCartItem,
} from "@/lib/cart-sync";

const STORAGE_KEY = "haven.cart.v1";

type CartAction =
  | { type: "hydrate"; lines: CartLine[] }
  | { type: "add"; product: Product; quantity: number }
  | { type: "setQuantity"; productId: string; quantity: number }
  | { type: "remove"; productId: string }
  | { type: "clear" };

function reducer(state: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case "hydrate":
      return action.lines;

    case "add": {
      const existing = state.find((l) => l.product.id === action.product.id);
      if (existing) {
        return state.map((l) =>
          l.product.id === action.product.id
            ? // Clamp at 10 per line — these are made-to-order objects, not stock
              // items, and a basket of 40 urns is almost always a mistake.
              { ...l, quantity: Math.min(10, l.quantity + action.quantity) }
            : l,
        );
      }
      return [
        ...state,
        { product: action.product, quantity: Math.min(10, action.quantity) },
      ];
    }

    case "setQuantity": {
      if (action.quantity <= 0) {
        return state.filter((l) => l.product.id !== action.productId);
      }
      return state.map((l) =>
        l.product.id === action.productId
          ? { ...l, quantity: Math.min(10, action.quantity) }
          : l,
      );
    }

    case "remove":
      return state.filter((l) => l.product.id !== action.productId);

    case "clear":
      return [];
  }
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotalCents: number;
  /** False until the initial cart (local or server) has been resolved. */
  hydrated: boolean;
  /** True once the signed-in basket is backed by Postgres + Realtime. */
  synced: boolean;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  /**
   * Adds a line. Opens the drawer by default — pass `{ silent: true }` when the
   * caller is navigating away (e.g. a buy-now button), so the drawer doesn't
   * animate open behind the new page.
   */
  addItem: (product: Product, quantity?: number, options?: { silent?: boolean }) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

/**
 * Rewrites stored lines against the live catalogue on every cart change.
 *
 * Prices live in localStorage, which the customer can edit. Rather than trust
 * what we read back, we re-resolve each line's price from the catalogue and
 * drop anything that no longer exists. (Real money is recomputed from scratch
 * on the server at checkout — see `POST /api/orders`.)
 */
function reconcile(stored: CartLine[], catalogue: Product[]): CartLine[] {
  return stored
    .map((line) => {
      const current = catalogue.find((p) => p.id === line.product.id);
      if (!current) return null;
      return { product: current, quantity: Math.min(10, Math.max(1, line.quantity)) };
    })
    .filter((line): line is CartLine => line !== null);
}

export function CartProvider({
  children,
  catalogue,
}: {
  children: ReactNode;
  /** The live catalogue, used to re-price lines read from storage or Postgres. */
  catalogue: Product[];
}) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const cartSyncEnabled =
    isSupabaseConfigured && process.env.NEXT_PUBLIC_USE_SUPABASE_CATALOG !== "false";

  // One client per configured app; `createClient()` returns a new instance each
  // call, so memoising keeps the sync effect from tearing down on every render.
  const supabase = useMemo(
    () => (cartSyncEnabled ? createClient() : null),
    [cartSyncEnabled],
  );

  const [lines, dispatch] = useReducer(reducer, []);
  const [hydrated, setHydrated] = useState(false);
  const [synced, setSynced] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const mutatedBeforeHydration = useRef(false);
  const hadUser = useRef(false);
  const linesRef = useRef(lines);
  const catalogueRef = useRef(catalogue);

  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  useEffect(() => {
    catalogueRef.current = catalogue;
  }, [catalogue]);

  const persistLocal = useCallback((nextLines: CartLine[]) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextLines));
    } catch {
      // Storage full or blocked — the cart still works for this session.
    }
  }, []);

  /** Server rows are authoritative for a signed-in customer. */
  const applyServerRows = useCallback(
    (rows: { product_id: string; quantity: number }[]) => {
      const next = rows
        .map((row) => {
          const product = catalogueRef.current.find((p) => p.id === row.product_id);
          if (!product) return null;
          return {
            product,
            quantity: Math.min(10, Math.max(1, row.quantity)),
          } satisfies CartLine;
        })
        .filter((line): line is CartLine => line !== null);

      mutatedBeforeHydration.current = true;
      dispatch({ type: "hydrate", lines: next });
      persistLocal(next);
    },
    [persistLocal],
  );

  // Resolve the cart once per identity. Guests restore from localStorage; a
  // signed-in customer merges any guest lines into Postgres, reads the account
  // basket, and subscribes to Realtime so other devices stay in step.
  useEffect(() => {
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    const restoreLocal = () => {
      let local: CartLine[] = [];
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as CartLine[];
          if (Array.isArray(parsed)) local = reconcile(parsed, catalogueRef.current);
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }

      dispatch({
        type: "hydrate",
        lines: mutatedBeforeHydration.current ? linesRef.current : local,
      });
      setSynced(false);
      requestAnimationFrame(() => setHydrated(true));
    };

    async function boot() {
      if (!supabase || !userId) {
        if (hadUser.current) {
          // Signed out: the basket belongs to the account and stays server-side,
          // so it does not leak to the next guest on a shared browser.
          hadUser.current = false;
          try {
            window.localStorage.removeItem(STORAGE_KEY);
          } catch {
            // Storage unavailable — nothing to clear.
          }
          dispatch({ type: "hydrate", lines: [] });
          setSynced(false);
          requestAnimationFrame(() => setHydrated(true));
          return;
        }
        restoreLocal();
        return;
      }
      hadUser.current = true;

      // Read the device cart before the account cart so a guest's picks survive
      // the first sign-in.
      let local: CartLine[] = [];
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as CartLine[];
          if (Array.isArray(parsed)) local = reconcile(parsed, catalogueRef.current);
        }
      } catch {
        // Ignore corrupt storage.
      }

      try {
        if (local.length > 0) await mergeGuestLines(supabase, userId, local);
        const rows = await fetchCartRows(supabase, userId);
        if (cancelled) return;

        applyServerRows(rows);
        setSynced(true);
        requestAnimationFrame(() => setHydrated(true));

        channel = supabase
          .channel(`cart:${userId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "cart_items",
              filter: `user_id=eq.${userId}`,
            },
            () => {
              void fetchCartRows(supabase, userId)
                .then((next) => {
                  if (!cancelled) applyServerRows(next);
                })
                .catch((error) => console.error("[cart] realtime refetch failed:", error));
            },
          )
          .subscribe();
      } catch (error) {
        // If the project is stale or the migration has not been applied, the cart
        // should quietly remain local rather than throwing at every boot.
        const status =
          typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
        const message =
          typeof error === "object" && error !== null && "message" in error
            ? String(error.message)
            : String(error);

        const isSchemaOrNetworkIssue =
          status === "PGRST205" ||
          message.includes("fetch failed") ||
          message.includes("ENOTFOUND") ||
          message.includes("Could not find the table");

        if (!isSchemaOrNetworkIssue) {
          console.error("[cart] could not sync with Supabase; using local cart:", error);
        }

        if (!cancelled) restoreLocal();
      }
    }

    void boot();

    return () => {
      cancelled = true;
      if (channel && supabase) void supabase.removeChannel(channel);
    };
  }, [supabase, userId, applyServerRows]);

  // Persist after hydration only, so we never overwrite storage with [].
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Storage full or blocked — the cart still works for this session.
    }
  }, [lines, hydrated]);

  // Lock the page behind the drawer.
  useEffect(() => {
    if (!isOpen) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isOpen]);

  const addItem = useCallback(
    (product: Product, quantity = 1, options?: { silent?: boolean }) => {
      const nextLines = reducer(linesRef.current, { type: "add", product, quantity });
      if (!hydrated) mutatedBeforeHydration.current = true;
      dispatch({ type: "add", product, quantity });
      persistLocal(nextLines);

      if (supabase && userId) {
        const merged = nextLines.find((l) => l.product.id === product.id);
        void upsertCartItem(supabase, userId, product.id, merged?.quantity ?? quantity).catch(
          (error) => console.error("[cart] failed to save item:", error),
        );
      }

      if (!options?.silent) setIsOpen(true);
    },
    [hydrated, persistLocal, supabase, userId],
  );

  const setQuantity = useCallback(
    (productId: string, quantity: number) => {
      const nextLines = reducer(linesRef.current, { type: "setQuantity", productId, quantity });
      if (!hydrated) mutatedBeforeHydration.current = true;
      dispatch({ type: "setQuantity", productId, quantity });
      persistLocal(nextLines);

      if (supabase && userId) {
        const write =
          quantity <= 0
            ? deleteCartItem(supabase, userId, productId)
            : upsertCartItem(supabase, userId, productId, quantity);
        void write.catch((error) => console.error("[cart] failed to update item:", error));
      }
    },
    [hydrated, persistLocal, supabase, userId],
  );

  const removeItem = useCallback(
    (productId: string) => {
      const nextLines = reducer(linesRef.current, { type: "remove", productId });
      if (!hydrated) mutatedBeforeHydration.current = true;
      dispatch({ type: "remove", productId });
      persistLocal(nextLines);

      if (supabase && userId) {
        void deleteCartItem(supabase, userId, productId).catch((error) =>
          console.error("[cart] failed to remove item:", error),
        );
      }
    },
    [hydrated, persistLocal, supabase, userId],
  );

  const clear = useCallback(() => {
    const nextLines = reducer(linesRef.current, { type: "clear" });
    if (!hydrated) mutatedBeforeHydration.current = true;
    dispatch({ type: "clear" });
    persistLocal(nextLines);

    if (supabase && userId) {
      void clearServerCart(supabase, userId).catch((error) =>
        console.error("[cart] failed to clear cart:", error),
      );
    }
  }, [hydrated, persistLocal, supabase, userId]);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: cartCount(lines),
      subtotalCents: cartSubtotalCents(lines),
      hydrated,
      synced,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem,
      setQuantity,
      removeItem,
      clear,
    }),
    [lines, hydrated, synced, isOpen, addItem, setQuantity, removeItem, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside <CartProvider>.");
  }
  return context;
}
