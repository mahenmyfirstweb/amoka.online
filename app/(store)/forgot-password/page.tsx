import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/store/auth-forms";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Reset your amoka.online password.",
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-5 text-2xl">Reset your password</h1>
      <ForgotPasswordForm />
    </div>
  );
}
