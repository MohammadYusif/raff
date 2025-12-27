// next-intl.config.ts
import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "ar";

  return {
    locale,
    messages: (await import(`./public/messages/${locale}.json`)).default,
  };
});
