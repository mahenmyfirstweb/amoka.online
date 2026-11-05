"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IMAGE_BUCKET } from "@/lib/supabase/config";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

// Uploads straight from the browser to Storage, which checks the admin role itself.
// This avoids the request size limit on server functions.
export function ImageUpload({ folder, label, onUploaded }: {
  folder: string;
  label: string;
  onUploaded: (path: string) => Promise<void> | void;
}) {
  const router = useRouter();
  const inputId = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setError(null);
    if (!ALLOWED_TYPES.includes(file.type)) return setError("Use a JPG, PNG or WebP image.");
    if (file.size > MAX_BYTES) return setError("Images must be 5 MB or smaller.");

    setPending(true);
    const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[file.type] ?? "jpg";
    const path = `${folder}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await createClient().storage.from(IMAGE_BUCKET).upload(path, file);

    if (uploadError) {
      setError(uploadError.message);
    } else {
      await onUploaded(path);
      router.refresh();
    }
    setPending(false);
    input.value = "";
  }

  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium">{label}</label>
      <input
        id={inputId}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        disabled={pending}
        onChange={upload}
        className="input"
      />
      {pending && <p role="status" className="mt-1 text-sm">Uploading...</p>}
      {error && <p role="alert" className="mt-1 text-sm font-medium text-bark">{error}</p>}
    </div>
  );
}
