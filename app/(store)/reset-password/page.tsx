import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/store/auth-forms";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Choose a new password.",
  robots: { index: false },
};

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-5 text-2xl">Choose a new password</h1>
      <ResetPasswordForm />
    </div>
  );
}
