"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isSecureOrLocal =
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if ("serviceWorker" in navigator && isSecureOrLocal) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          // Registration successful
          if (process.env.NODE_ENV === "development") {
            console.log("Service Worker registered with scope:", reg.scope);
          }
        })
        .catch((error) => {
          console.warn("Service Worker registration failed:", error);
        });
    }
  }, []);

  return null;
}
