// src/app/auth/register/page.tsx
import { Metadata } from "next";
import { RegisterContent } from "./RegisterContent";

/**
 * Register Page
 *
 * Auth pages intentionally don't use PageLayout to provide
 * a focused, distraction-free authentication experience without
 * navigation and footer elements that might distract from the registration flow.
 */

export const metadata: Metadata = {
  title: "Register - Raff",
  description: "Create your Raff account",
};

export default function RegisterPage() {
  return <RegisterContent />;
}
