// src/app/merchant/settings/MerchantSettingsContent.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Container,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Input,
  AnimatedButton,
  Skeleton,
} from "@/shared/components/ui";
import {
  User,
  Store,
  Bell,
  Shield,
  Plug,
  Globe,
  Save,
  RefreshCw,
  AlertCircle,
  CreditCard,
  CheckCircle,
} from "lucide-react";
import Image from "next/image";
import { useLocale } from "next-intl";
import { useMerchantProfile } from "@/lib/hooks/useMerchantApi";
import { toast } from "sonner";

function SettingsLoadingSkeleton() {
  return (
    <Container className="py-8">
      {/* Header Skeleton */}
      <div className="mb-6 space-y-2">
        <Skeleton variant="shimmer" className="h-8 w-56" />
        <Skeleton variant="shimmer" className="h-5 w-72" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar Skeleton */}
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton
              key={index}
              variant="shimmer"
              className="h-11 w-full"
            />
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="space-y-6 lg:col-span-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="space-y-2">
                <Skeleton variant="shimmer" className="h-6 w-40" />
                <Skeleton variant="shimmer" className="h-4 w-64" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Skeleton variant="shimmer" className="h-4 w-24" />
                  <Skeleton variant="shimmer" className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton variant="shimmer" className="h-4 w-28" />
                  <Skeleton variant="shimmer" className="h-10 w-full" />
                  <Skeleton variant="shimmer" className="h-3 w-40" />
                </div>
                <Skeleton variant="shimmer" className="h-10 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Container>
  );
}

export function MerchantSettingsContent() {
  const { data: session, update: updateSession } = useSession();
  const t = useTranslations("merchantSettings");
  const integrationsT = useTranslations("merchantIntegrations");
  const locale = useLocale();
  const router = useRouter();
  const merchantId = session?.user?.merchantId ?? null;
  const { profile, loading: isLoading } = useMerchantProfile(
    Boolean(merchantId)
  );

  const [activeSection, setActiveSection] = useState<
    "account" | "store" | "subscription" | "notifications" | "security" | "integrations"
  >("account");
  const [saving, setSaving] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isScrollingRef = useRef(false);
  const [accountData, setAccountData] = useState({
    name: session?.user?.name || "",
    email: session?.user?.email || "",
  });

  const [storeData, setStoreData] = useState({
    autoSync: profile?.storeInfo.autoSyncEnabled ?? true,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    orderNotifications: true,
    analyticsReports: false,
    weeklyDigest: true,
  });

  // Set up IntersectionObserver to detect which section is visible
  useEffect(() => {
    const sections = [
      "account",
      "store",
      "subscription",
      "notifications",
      "security",
      "integrations",
    ];

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Don't update from observer during programmatic scroll
        if (isScrollingRef.current) return;

        // Find the section with the highest intersection ratio
        const visibleSections = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visibleSections.length > 0) {
          const mostVisibleSection = visibleSections[0].target.id as
            | "account"
            | "store"
            | "subscription"
            | "notifications"
            | "security"
            | "integrations";
          setActiveSection(mostVisibleSection);
        }
      },
      {
        root: null,
        rootMargin: "-20% 0px -60% 0px", // Trigger when section is in the top 40% of viewport
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    // Observe all sections
    sections.forEach((sectionId) => {
      const element = document.getElementById(sectionId);
      if (element && observerRef.current) {
        observerRef.current.observe(element);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const handleSectionChange = (
    sectionId: "account" | "store" | "subscription" | "notifications" | "security" | "integrations"
  ) => {
    // Immediately set active section for responsive UI feedback
    setActiveSection(sectionId);

    // Disable observer updates during programmatic scroll
    isScrollingRef.current = true;

    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });

      // Re-enable observer after scroll completes
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 1000); // Wait for smooth scroll animation to complete
    }
  };

  const handleSaveAccount = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/user/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: accountData.name,
          email: accountData.email,
        }),
      });

      if (!response.ok) throw new Error("Failed to update account");

      await updateSession();
      toast.success(t("saveSuccess"));
    } catch (error) {
      console.error("Error saving account:", error);
      toast.error(t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStoreSettings = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/merchant/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoSyncProducts: storeData.autoSync,
        }),
      });

      if (!response.ok) throw new Error("Failed to update store settings");

      toast.success(t("saveSuccess"));
      router.refresh();
    } catch (error) {
      console.error("Error saving store settings:", error);
      toast.error(t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <SettingsLoadingSkeleton />;
  }

  return (
    <Container className="py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold text-raff-primary">
          {t("title")}
        </h1>
        <p className="text-raff-neutral-600">{t("subtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar Navigation */}
        <div className="space-y-2 lg:sticky lg:top-24 lg:self-start">
          {(
            [
              { id: "account", label: t("nav.account"), icon: User },
              { id: "store", label: t("nav.store"), icon: Store },
              { id: "subscription", label: t("nav.subscription", { defaultValue: "Subscription" }), icon: CreditCard },
              {
                id: "notifications",
                label: t("nav.notifications"),
                icon: Bell,
              },
              { id: "security", label: t("nav.security"), icon: Shield },
              {
                id: "integrations",
                label: t("nav.integrations"),
                icon: Plug,
              },
            ] as const
          ).map((item) => {
            const isActive = activeSection === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSectionChange(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-start transition-colors ${
                  isActive
                    ? "bg-raff-primary text-white"
                    : "text-raff-neutral-700 hover:bg-raff-neutral-100"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Account Information */}
          <section id="account" className="scroll-mt-24">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t("account.title")}
                </CardTitle>
                <CardDescription>{t("account.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-raff-primary">
                    {t("account.name")}
                  </label>
                  <Input
                    type="text"
                    value={accountData.name}
                    onChange={(e) =>
                      setAccountData({ ...accountData, name: e.target.value })
                    }
                    placeholder={t("account.namePlaceholder")}
                  />
                </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-raff-primary">
                  {t("account.email")}
                </label>
                <Input
                  type="email"
                  value={accountData.email}
                  onChange={(e) =>
                    setAccountData({ ...accountData, email: e.target.value })
                  }
                  placeholder={t("account.emailPlaceholder")}
                />
                <p className="mt-1 text-xs text-raff-neutral-500">
                  {t("account.emailHelp")}
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-raff-neutral-200 bg-raff-neutral-50 p-3">
                <AlertCircle className="h-4 w-4 text-raff-accent" />
                <p className="text-sm text-raff-neutral-700">
                  {t("account.roleInfo")}:{" "}
                  <Badge variant="default" className="ms-1">
                    {session?.user?.role}
                  </Badge>
                </p>
              </div>

                <AnimatedButton
                  onClick={handleSaveAccount}
                  disabled={saving}
                  className="gap-2"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      {t("saving")}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {t("save")}
                    </>
                  )}
                </AnimatedButton>
              </CardContent>
            </Card>
          </section>

          {/* Store Settings */}
          <section id="store" className="scroll-mt-24">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  {t("store.title")}
                </CardTitle>
              <CardDescription>{t("store.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Store Connection Status */}
              <div className="rounded-lg border border-raff-neutral-200 bg-raff-neutral-50 p-4">
                <div className="mb-3 flex items-center gap-3">
                  {profile?.storeInfo.platform && (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                      <Image
                        src={`/images/brands/${profile.storeInfo.platform}.svg`}
                        alt={profile.storeInfo.platform === "salla"
                          ? integrationsT("platforms.salla.name")
                          : integrationsT("platforms.zid.name")}
                        width={24}
                        height={24}
                        className="h-6 w-6"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-raff-primary">
                      {t("store.connectedStore")}
                    </p>
                    <p className="text-sm text-raff-neutral-600">
                      {profile?.name || t("store.noStore")}
                    </p>
                    {profile?.storeInfo.platform && (
                      <p className="text-xs text-raff-neutral-500">
                        {profile.storeInfo.platform === "salla"
                          ? integrationsT("platforms.salla.name")
                          : integrationsT("platforms.zid.name")}
                      </p>
                    )}
                  </div>
                </div>
                {profile?.storeInfo.isConnected && (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle className="h-4 w-4" />
                    {t("store.connected")}
                  </Badge>
                )}

                {profile?.storeInfo.storeUrl && (
                  <a
                    href={profile.storeInfo.storeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-raff-accent hover:underline"
                  >
                    <Globe className="h-4 w-4" />
                    {profile.storeInfo.storeUrl}
                  </a>
                )}
              </div>

              {/* Auto Sync */}
              <div className="flex items-center justify-between rounded-lg border border-raff-neutral-200 p-4">
                <div>
                  <p className="font-medium text-raff-primary">
                    {t("store.autoSync")}
                  </p>
                  <p className="text-sm text-raff-neutral-600">
                    {t("store.autoSyncDesc")}
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={storeData.autoSync}
                    onChange={(e) =>
                      setStoreData({ ...storeData, autoSync: e.target.checked })
                    }
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-raff-neutral-300 after:absolute after:h-5 after:w-5 after:rounded-full after:border after:border-raff-neutral-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-raff-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-raff-primary/20"></div>
                </label>
              </div>

              <AnimatedButton
                onClick={handleSaveStoreSettings}
                disabled={saving}
                className="gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    {t("saving")}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {t("save")}
                  </>
                )}
              </AnimatedButton>
            </CardContent>
            </Card>
          </section>

          {/* Subscription */}
          <section id="subscription" className="scroll-mt-24">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  {t("subscription.title", { defaultValue: "Subscription & Billing" })}
                </CardTitle>
                <CardDescription>
                  {t("subscription.description", { defaultValue: "Manage your subscription plan and billing" })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Subscription Status */}
                <div className={`rounded-lg border p-4 ${
                  profile?.subscriptionStatus === "ACTIVE"
                    ? "border-raff-success/20 bg-raff-success/5"
                    : profile?.subscriptionStatus === "TRIAL"
                      ? "border-raff-warning/20 bg-raff-warning/5"
                      : "border-raff-error/20 bg-raff-error/5"
                }`}>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-raff-primary">
                        {t("subscription.status", { defaultValue: "Subscription Status" })}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge
                          variant={
                            profile?.subscriptionStatus === "ACTIVE"
                              ? "success"
                              : profile?.subscriptionStatus === "TRIAL"
                                ? "warning"
                                : "default"
                          }
                        >
                          {profile?.subscriptionStatus
                            ? t(`subscription.statuses.${profile.subscriptionStatus}`, {
                                defaultValue: profile.subscriptionStatus
                              })
                            : t("subscription.statuses.INACTIVE", { defaultValue: "Inactive" })
                          }
                        </Badge>
                        {profile?.subscriptionPlan && (
                          <span className="text-sm text-raff-neutral-600">
                            {profile.subscriptionPlan}
                          </span>
                        )}
                      </div>
                      {profile?.subscriptionEndDate && (
                        <p className="mt-2 text-xs text-raff-neutral-500">
                          {t("subscription.expiresOn", { defaultValue: "Expires on" })}:{" "}
                          {new Date(profile.subscriptionEndDate).toLocaleDateString(locale)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {(profile?.subscriptionStatus === "INACTIVE" ||
                  profile?.subscriptionStatus === "EXPIRED" ||
                  profile?.subscriptionStatus === "CANCELED") && (
                  <AnimatedButton className="gap-2">
                    <CreditCard className="h-4 w-4" />
                    {t("subscription.upgrade", { defaultValue: "Upgrade Plan" })}
                  </AnimatedButton>
                )}

                {profile?.subscriptionStatus === "ACTIVE" && (
                  <div className="text-sm text-raff-neutral-600">
                    {t("subscription.manageInfo", {
                      defaultValue: "Contact support to manage your subscription"
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Notification Settings */}
          <section id="notifications" className="scroll-mt-24">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  {t("notifications.title")}
                </CardTitle>
                <CardDescription>
                  {t("notifications.description")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
              {Object.entries(notificationSettings).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-raff-neutral-200 p-4"
                >
                  <div>
                    <p className="font-medium text-raff-primary">
                      {t(`notifications.${key}`)}
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          [key]: e.target.checked,
                        })
                      }
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-raff-neutral-300 after:absolute after:h-5 after:w-5 after:rounded-full after:border after:border-raff-neutral-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-raff-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-raff-primary/20"></div>
                  </label>
                </div>
              ))}

              <AnimatedButton disabled className="gap-2 opacity-50">
                <Save className="h-4 w-4" />
                {t("save")} ({t("comingSoon")})
              </AnimatedButton>
            </CardContent>
            </Card>
          </section>

          {/* Security */}
          <section id="security" className="scroll-mt-24">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {t("nav.security")}
                </CardTitle>
                <CardDescription>{t("comingSoon")}</CardDescription>
              </CardHeader>
            </Card>
          </section>

          {/* Integrations */}
          <section id="integrations" className="scroll-mt-24">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plug className="h-5 w-5" />
                  {t("nav.integrations")}
                </CardTitle>
                <CardDescription>{t("comingSoon")}</CardDescription>
              </CardHeader>
            </Card>
          </section>
        </div>
      </div>
    </Container>
  );
}
