"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-outline no-print">
      Print or save as PDF
    </button>
  );
}
