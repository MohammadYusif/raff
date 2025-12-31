// src/app/auth/login/page.tsx
import { Metadata } from "next";
import { LoginContent } from "./LoginContent";

export const metadata: Metadata = {
  title: "Login - Raff",
  description: "Login to your Raff account",
};

export default function LoginPage() {
  return <LoginContent />;
}
