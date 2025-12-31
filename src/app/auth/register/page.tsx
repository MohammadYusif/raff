// src/app/auth/register/page.tsx
import { Metadata } from "next";
import { RegisterContent } from "./RegisterContent";

export const metadata: Metadata = {
  title: "Register - Raff",
  description: "Create your Raff account",
};

export default function RegisterPage() {
  return <RegisterContent />;
}
