import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ArrowRight, LogOut, MapPin, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { formatPrice } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

/**
 * Never prerender this route.
 *
 * It reads cookies for the session, and it branches on whether Supabase is
 * configured — both are request-time facts. Without this, a build with no
 * credentials bakes the "not configured" notice into a static file that is then
 * served forever, even after the credentials are added.
 */
export const dynamic = "force-dynamic";

const DELIVERY_LABELS: Record<string, string> = {
  standard_ground: "Standard Insured Ground",
  white_glove: "White Glove Fragile Care",
  eco_courier: "Eco-Courier Same Day",
};

/** Shown when Supabase is unconfigured, so the route reads as a setup step. */
function AccountNotConfigured() {
  return (
    <div className="mx-auto max-w-lg px-5 py-28 text-center sm:px-8">
      <p className="eyebrow text-muted">Client Account</p>
      <h1 className="mt-3 font-display text-[30px] font-light leading-tight text-ink">
        Accounts aren&rsquo;t connected yet.
      </h1>
      <p className="mt-4 text-[13.5px] leading-relaxed text-muted">
        This deployment has no Supabase credentials, so there is no session to
        read. Add them to{" "}
        <code className="font-mono text-[12px]">.env.local</code> —{" "}
        <code className="font-mono text-[12px]">SETUP.md</code> walks through it.
        You can still browse and check out as a guest.
      </p>
      <Link
        href="/collections/all"
        className="eyebrow mt-8 inline-block bg-ink px-8 py-4 text-white transition-colors hover:bg-terracotta"
      >
        Browse the collection
      </Link>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  pending: "border-brass/40 bg-brass/10 text-brass",
  paid: "border-sage/40 bg-sage/10 text-sage",
  processing: "border-sage/40 bg-sage/10 text-sage",
  shipped: "border-sage/40 bg-sage/10 text-sage",
  delivered: "border-sage/40 bg-sage/10 text-sage",
  cancelled: "border-terracotta/40 bg-terracotta-50 text-terracotta",
  refunded: "border-terracotta/40 bg-terracotta-50 text-terracotta",
};

interface OrderRow {
  order_number: string;
  status: string;
  delivery: string;
  total_cents: number;
  created_at: string;
  order_items: {
    product_name: string;
    image_url: string | null;
    quantity: number;
  }[];
}

export default async function AccountPage() {
  // Without Supabase there is no session to read, and `createClient()` would
  // throw. Render an honest notice instead of the error boundary.
  if (!isSupabaseConfigured) return <AccountNotConfigured />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Belt-and-braces: middleware already guards this route, but a server
  // component should never render authenticated content on an assumption.
  if (!user) redirect("/login?next=/account");

  const [{ data: profile }, { data: orders }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("orders")
      .select(
        "order_number, status, delivery, total_cents, created_at, " +
          "order_items ( product_name, image_url, quantity )",
      )
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const orderList = (orders as unknown as OrderRow[]) ?? [];
  const addressLines = [
    profile?.address_line1,
    profile?.address_line2,
    profile?.city && profile?.state
      ? `${profile.city}, ${profile.state} ${profile.postal_code ?? ""}`.trim()
      : null,
    profile?.country,
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-14 sm:px-8 sm:py-20">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8">
        <div className="flex items-center gap-5">
          {profile?.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-sunk font-display text-[20px] text-muted">
              {(profile?.full_name ?? user.email ?? "?").charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <p className="eyebrow text-muted">Client Account</p>
            <h1 className="mt-1.5 font-display text-[30px] leading-tight text-ink">
              {profile?.full_name ?? "Welcome"}
            </h1>
            <p className="mt-1 text-[12.5px] text-muted">{user.email}</p>
          </div>
        </div>

        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="eyebrow flex items-center gap-2 border border-line px-4 py-3 text-ink-soft transition-colors hover:border-terracotta hover:text-terracotta"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </form>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Orders */}
        <section>
          <h2 className="flex items-center gap-2.5 font-display text-[22px] text-ink">
            <Package size={17} strokeWidth={1.4} className="text-terracotta" />
            Your Orders
          </h2>

          {orderList.length === 0 ? (
            <div className="mt-6 border border-line bg-surface px-6 py-12 text-center">
              <p className="font-display text-[18px] text-ink">
                No orders yet
              </p>
              <p className="mx-auto mt-2 max-w-sm text-[12.5px] leading-relaxed text-muted">
                When you place an order, it will appear here with dispatch
                tracking and provenance records.
              </p>
              <Link
                href="/collections/all"
                className="eyebrow mt-6 inline-flex items-center gap-2 bg-ink px-7 py-3.5 text-white transition-colors hover:bg-terracotta"
              >
                Browse the collection
                <ArrowRight size={12} />
              </Link>
            </div>
          ) : (
            <ul className="mt-6 space-y-4">
              {orderList.map((order) => (
                <li
                  key={order.order_number}
                  className="border border-line bg-surface px-6 py-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="eyebrow text-ink">{order.order_number}</p>
                      <p className="mt-1.5 text-[12px] text-muted">
                        {new Date(order.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                        {" · "}
                        {DELIVERY_LABELS[order.delivery] ?? order.delivery}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className={`eyebrow border px-2.5 py-1 ${
                          STATUS_STYLES[order.status] ??
                          "border-line bg-surface-sunk text-muted"
                        }`}
                      >
                        {order.status}
                      </span>
                      <span className="tabular font-display text-[19px] text-ink">
                        {formatPrice(order.total_cents)}
                      </span>
                    </div>
                  </div>

                  {order.order_items?.length > 0 && (
                    <ul className="mt-4 flex flex-wrap gap-3 border-t border-line pt-4">
                      {order.order_items.map((item, index) => (
                        <li
                          key={`${item.product_name}-${index}`}
                          className="flex items-center gap-2.5"
                        >
                          <span className="relative h-10 w-10 shrink-0 overflow-hidden bg-surface-sunk">
                            {item.image_url && (
                              <Image
                                src={item.image_url}
                                alt=""
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            )}
                          </span>
                          <span className="text-[12px] text-ink-soft">
                            {item.product_name}
                            {item.quantity > 1 && (
                              <span className="text-muted"> × {item.quantity}</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Saved address */}
        <aside>
          <h2 className="flex items-center gap-2.5 font-display text-[22px] text-ink">
            <MapPin size={17} strokeWidth={1.4} className="text-terracotta" />
            Delivery Details
          </h2>

          <div className="mt-6 border border-line bg-surface px-6 py-6">
            {addressLines.length > 0 ? (
              <address className="text-[12.5px] not-italic leading-relaxed text-ink-soft">
                {profile?.full_name && (
                  <span className="block font-medium text-ink">
                    {profile.full_name}
                  </span>
                )}
                {addressLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
                {profile?.phone && <span className="block">{profile.phone}</span>}
              </address>
            ) : (
              <p className="text-[12.5px] leading-relaxed text-muted">
                No saved address yet. Your details are captured at checkout and
                reused next time.
              </p>
            )}

            <p className="mt-5 border-t border-line pt-4 text-[11px] leading-relaxed text-muted">
              Contact the studio to amend a saved address. We keep a record of
              every dispatch for provenance.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
