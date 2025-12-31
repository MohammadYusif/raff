// src/app/auth/login/page.tsx
import { Metadata } from "next";
import { LoginContent } from "./LoginContent";

/**
 * Login Page
 *
 * Auth pages intentionally don't use PageLayout to provide
 * a focused, distraction-free authentication experience without
 * navigation and footer elements that might distract from the login flow.
 */

export const metadata: Metadata = {
  title: "Login - Raff",
  description: "Login to your Raff account",
};

export default function LoginPage() {
  return <LoginContent />;
}
