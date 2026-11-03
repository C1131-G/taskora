"use client";

import "./globals.css";
import { RouteError } from "@/components/ui/route-error";
import { AppToaster } from "@/components/workspace/app-toaster";

const GlobalError = ({ retry }: { readonly retry: () => void }) => (
  <html lang="en">
    <body className="font-sans antialiased">
      <title>Application error | Taskora</title>
      <main className="grid min-h-dvh place-items-center">
        <RouteError retry={retry} title="Application error" />
      </main>
      <AppToaster />
    </body>
  </html>
);

export default GlobalError;
