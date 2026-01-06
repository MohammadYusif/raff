// src/app/merchant/settings/MerchantSettingsContent.tsx
"use client";

import { useState } from "react";
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
} from "lucide-react";
import { useMerchantProfile } from "@/lib/hooks/useMerchantApi";
import { toast } from "sonner";

export function MerchantSettingsContent() {
  const { data: session, update: updateSession } = useSession();
  const t = useTranslations("merchantSettings");
  const router = useRouter();
  const merchantId = session?.user?.merchantId ?? null;
  const { profile, loading: isLoading } = useMerchantProfile(
    Boolean(merchantId)
  );

  const [saving, setSaving] = useState(false);
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
    return (
      <Container className="py-8">
        <Card>
          <CardContent className="p-12 text-center">
            <RefreshCw className="mx-auto mb-4 h-12 w-12 animate-spin text-raff-primary" />
            <p className="text-raff-neutral-600">{t("loading")}</p>
          </CardContent>
        </Card>
      </Container>
    );
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
        <div className="space-y-2">
          <button className="flex w-full items-center gap-3 rounded-lg bg-raff-primary px-4 py-3 text-start text-white transition-colors">
            <User className="h-5 w-5" />
            <span className="font-medium">{t("nav.account")}</span>
          </button>
          <button className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-start text-raff-neutral-700 transition-colors hover:bg-raff-neutral-100">
            <Store className="h-5 w-5" />
            <span className="font-medium">{t("nav.store")}</span>
          </button>
          <button className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-start text-raff-neutral-700 transition-colors hover:bg-raff-neutral-100">
            <Bell className="h-5 w-5" />
            <span className="font-medium">{t("nav.notifications")}</span>
          </button>
          <button className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-start text-raff-neutral-700 transition-colors hover:bg-raff-neutral-100">
            <Shield className="h-5 w-5" />
            <span className="font-medium">{t("nav.security")}</span>
          </button>
          <button className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-start text-raff-neutral-700 transition-colors hover:bg-raff-neutral-100">
            <Plug className="h-5 w-5" />
            <span className="font-medium">{t("nav.integrations")}</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Account Information */}
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

          {/* Store Settings */}
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
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-raff-primary">
                      {t("store.connectedStore")}
                    </p>
                    <p className="text-sm text-raff-neutral-600">
                      {profile?.name || t("store.noStore")}
                    </p>
                  </div>
                  {profile?.storeInfo.isConnected && (
                    <Badge variant="success" className="gap-1">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-raff-success" />
                      {t("store.connected")}
                    </Badge>
                  )}
                </div>

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

          {/* Notification Settings */}
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
        </div>
      </div>
    </Container>
  );
}
