import type { ReactNode } from "react";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <p className="mb-4 text-center text-2xl font-bold text-primary">AquaOS</p>
        {children}
      </div>
    </div>
  );
}
