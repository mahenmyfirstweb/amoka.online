import Image from "next/image";

/** The Amoka logo. public/logo.png is generated from images/logo with its background removed. */
export function LogoImage({ height, priority = false, className = "" }: { height: number; priority?: boolean; className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Amoka, Tasty & Healthy"
      width={Math.round((height * 480) / 311)}
      height={height}
      preload={priority}
      className={className}
    />
  );
}
