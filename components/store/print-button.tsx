"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Print or save as PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-outline no-print">
      <Printer aria-hidden="true" size={18} /> {label}
    </button>
  );
}
