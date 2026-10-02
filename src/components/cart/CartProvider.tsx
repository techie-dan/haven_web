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
import type { CartLine, Product } from "@/lib/types";
import { cartCount, cartSubtotalCents } from "@/lib/pricing";

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
  /** False until localStorage has been read, so the UI can avoid a flash. */
  hydrated: boolean;
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
  /** The live catalogue, used to re-price lines read from storage. */
  catalogue: Product[];
}) {
  const [lines, dispatch] = useReducer(reducer, []);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const mutatedBeforeHydration = useRef(false);
  const linesRef = useRef(lines);

  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  // Load once on mount. If the user already interacted before the restore effect
  // runs, keep the in-memory cart instead of overwriting it with the persisted
  // snapshot from storage.
  useEffect(() => {
    let restored: CartLine[] = [];

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartLine[];
        if (Array.isArray(parsed)) restored = reconcile(parsed, catalogue);
      }
    } catch {
      // Corrupt or unavailable storage (private mode, quota) — start empty.
      window.localStorage.removeItem(STORAGE_KEY);
    }

    dispatch({
      type: "hydrate",
      lines: mutatedBeforeHydration.current ? linesRef.current : restored,
    });

    const frame = requestAnimationFrame(() => setHydrated(true));
    return () => cancelAnimationFrame(frame);
  }, [catalogue]);

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

  const persistLines = useCallback((nextLines: CartLine[]) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextLines));
    } catch {
      // Storage full or blocked — the cart still works for this session.
    }
  }, []);

  const addItem = useCallback(
    (product: Product, quantity = 1, options?: { silent?: boolean }) => {
      const nextLines = reducer(linesRef.current, { type: "add", product, quantity });
      if (!hydrated) mutatedBeforeHydration.current = true;
      dispatch({ type: "add", product, quantity });
      persistLines(nextLines);
      if (!options?.silent) setIsOpen(true);
    },
    [hydrated, persistLines],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: cartCount(lines),
      subtotalCents: cartSubtotalCents(lines),
      hydrated,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem,
      setQuantity: (productId, quantity) => {
        const nextLines = reducer(linesRef.current, {
          type: "setQuantity",
          productId,
          quantity,
        });
        if (!hydrated) mutatedBeforeHydration.current = true;
        dispatch({ type: "setQuantity", productId, quantity });
        persistLines(nextLines);
      },
      removeItem: (productId) => {
        const nextLines = reducer(linesRef.current, { type: "remove", productId });
        if (!hydrated) mutatedBeforeHydration.current = true;
        dispatch({ type: "remove", productId });
        persistLines(nextLines);
      },
      clear: () => {
        const nextLines = reducer(linesRef.current, { type: "clear" });
        if (!hydrated) mutatedBeforeHydration.current = true;
        dispatch({ type: "clear" });
        persistLines(nextLines);
      },
    }),
    [lines, hydrated, isOpen, addItem, persistLines],
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
