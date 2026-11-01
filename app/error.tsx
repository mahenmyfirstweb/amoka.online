"use client";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-md flex-1 px-4 py-16 text-center">
      <h1 className="text-2xl">Something went wrong</h1>
      <p className="mt-2">Please try again in a moment.</p>
      <button type="button" onClick={reset} className="btn btn-primary mt-5">Try again</button>
    </main>
  );
}
