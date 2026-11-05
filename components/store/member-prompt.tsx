"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

const DISMISSED_KEY = "amoka-guest-checkout";

/** Shown to signed-out shoppers arriving at checkout. Registering is optional. */
export function MemberPrompt() {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISSED_KEY)) return;
    dialog.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="member-prompt-heading"
      onClose={() => sessionStorage.setItem(DISMISSED_KEY, "1")}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl bg-white p-6 text-brown shadow-xl backdrop:bg-bark/60"
    >
      <h2 id="member-prompt-heading" className="text-xl">Register Your Account &amp; Enjoy More Rewards!</h2>
      <p className="mt-2 text-sm">
        Create an account or log in to enjoy exclusive member rewards, track your orders and save your
        delivery addresses. Or continue as a guest: you can still place your order.
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link href="/login?next=/checkout" className="btn btn-primary flex-1">Register / Login</Link>
        <button type="button" onClick={() => dialog.current?.close()} className="btn btn-outline flex-1">
          Continue as Guest
        </button>
      </div>
    </dialog>
  );
}
