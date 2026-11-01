import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md flex-1 px-4 py-16 text-center">
      <h1 className="text-2xl">We can&apos;t find that page</h1>
      <p className="mt-2">It may have moved, or the product may no longer be available.</p>
      <Link href="/" className="btn btn-primary mt-5">Back to the shop</Link>
    </main>
  );
}
