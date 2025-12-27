// src/i18n/request.ts
import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export default getRequestConfig(async () => {
  // Try to get locale from cookie
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("NEXT_LOCALE");
  const locale = localeCookie?.value || "ar"; // Default to Arabic

  return {
    locale,
    messages: (await import(`../../public/messages/${locale}.json`)).default,
  };
});
