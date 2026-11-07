import Image from "next/image";

/** The Westward Property Care logo. "full" = W mark + name, "mark" = W mark only. */
export default function Logo({ variant = "full" }: { variant?: "full" | "mark" }) {
  if (variant === "mark") {
    return <Image src="/logo-mark.png" alt="" width={276} height={150} className="logo-mark" priority unoptimized />;
  }
  return (
    <Image
      src="/logo.png"
      alt="Westward Property Care"
      width={761}
      height={150}
      className="logo-full"
      priority
      unoptimized
    />
  );
}
