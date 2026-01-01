// src/app/cart/CartContent.tsx
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Container, Card, CardContent, Button } from "@/shared/components/ui";
import { ShoppingCart, Trash2, AlertCircle, ShoppingBag } from "lucide-react";
import { ArrowForward } from "@/core/i18n";

interface CartItem {
  id: string;
  productId: string;
  title: string;
  price: number;
  currency: string;
  merchantName: string;
  merchantId: string;
  imageUrl?: string;
  quantity: number;
}

/**
 * CartContent Component
 *
 * Wide layout with prominent auth notice
 */
export function CartContent() {
  const t = useTranslations("cart");
  const commonT = useTranslations("common");
  const { data: session, status } = useSession();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load cart from localStorage
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("raff_cart");
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      }
    } catch (error) {
      console.error("Error loading cart:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    if (!loading) {
      localStorage.setItem("raff_cart", JSON.stringify(cartItems));
    }
  }, [cartItems, loading]);

  const removeItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const showAuthNotice =
    status === "unauthenticated" ||
    (status === "authenticated" && session?.user?.role !== "CUSTOMER");

  if (loading) {
    return (
      <Container className="py-8 pt-20">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-raff-primary border-t-transparent" />
        </div>
      </Container>
    );
  }

  // Empty cart - WIDER LAYOUT
  if (cartItems.length === 0) {
    return (
      <Container className="py-8 pt-20">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-6 rounded-full bg-raff-neutral-100 p-8">
              <ShoppingCart className="h-16 w-16 text-raff-neutral-400" />
            </div>
            <h2 className="mb-3 text-3xl font-bold text-raff-neutral-900">
              {t("emptyTitle")}
            </h2>
            <p className="mb-8 text-lg text-raff-neutral-600">
              {t("emptyDescription")}
            </p>
            <Button size="lg">
              <Link href="/products">
                <ArrowForward className="h-5 w-5 ltr:mr-2 rtl:ml-2" />
                {t("continueShopping")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-8 pt-20">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-raff-neutral-900 md:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-raff-neutral-600">
            {t("itemCount", { count: totalItems })}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={clearCart}
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <Trash2 className="h-5 w-5 ltr:mr-2 rtl:ml-2" />
          {t("clearCart")}
        </Button>
      </div>

      {/* Auth Notice - FULL WIDTH, PROMINENT */}
      {showAuthNotice && (
        <Card className="mb-8 border-2 border-raff-accent from-raff-accent/5 to-raff-accent/10">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
              <div className="flex shrink-0 items-center justify-center rounded-full bg-raff-accent/20 p-4">
                <AlertCircle className="h-8 w-8 text-raff-accent md:h-10 md:w-10" />
              </div>
              <div className="flex-1 space-y-4">
                <h3 className="text-xl font-bold text-raff-neutral-900 md:text-2xl">
                  {t("authNoticeTitle")}
                </h3>
                <p className="text-base leading-relaxed text-raff-neutral-700 md:text-lg">
                  {t("authNoticeDescription")}
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                  <Button size="lg" className="w-full sm:w-auto">
                    <Link href="/auth/login">
                      <ShoppingBag className="h-5 w-5 ltr:mr-2 rtl:ml-2" />
                      {t("loginCta")}
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    <Link href="/auth/register">{t("registerCta")}</Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cart Items - FULL WIDTH */}
      <Card className="mb-8">
        <CardContent className="divide-y divide-raff-neutral-200 p-0">
          {cartItems.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 p-6 transition-colors hover:bg-raff-neutral-50 md:gap-6"
            >
              {/* Product Image - BIGGER */}
              {item.imageUrl && (
                <div className="h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-raff-neutral-100 md:h-32 md:w-32">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              {/* Product Details - WIDER */}
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold leading-snug text-raff-neutral-900 md:text-xl">
                    {item.title}
                  </h3>
                  <p className="text-base text-raff-neutral-600">
                    {item.merchantName || t("merchantFallback")}
                  </p>
                  <p className="text-base text-raff-neutral-600">
                    {t("quantity", { count: item.quantity })}
                  </p>
                </div>
                <p className="mt-3 text-xl font-bold text-raff-primary md:text-2xl">
                  {item.price.toLocaleString()} {item.currency}
                </p>
              </div>

              {/* Remove Button */}
              <button
                onClick={() => removeItem(item.id)}
                className="shrink-0 self-start rounded-lg p-3 text-raff-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600"
                aria-label={t("remove")}
              >
                <Trash2 className="h-6 w-6" />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Continue Shopping - CENTERED */}
      <div className="flex justify-center">
        <Button variant="outline" size="lg" className="w-full sm:w-auto">
          <Link href="/products">
            <ArrowForward className="h-5 w-5 ltr:mr-2 rtl:ml-2" />
            {t("continueShopping")}
          </Link>
        </Button>
      </div>
    </Container>
  );
}
