"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((registration) => {
        void registration.update();
      }).catch(() => undefined);
    }
  }, []);

  return null;
}
