"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { TimezoneSync } from "./timezone-sync";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TimezoneSync />
      {children}
      <Toaster position="top-center" richColors closeButton toastOptions={{ className: "!rounded-2xl" }} />
    </ThemeProvider>
  );
}
