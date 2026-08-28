import { useEffect, useRef } from "react";

declare const __BUILD_ID__: string;

const CURRENT_BUILD_ID =
  typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "dev";
const CHECK_INTERVAL_MS = 60_000; // 1 minute
const STORAGE_KEY = "app_build_id";

async function clearAllCachesAndReload() {
  try {
    // Unregister any service workers (legacy installs)
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    // Wipe Cache Storage
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (e) {
    console.warn("Cache clear failed:", e);
  }

  // Hard reload bypassing HTTP cache
  const url = new URL(window.location.href);
  url.searchParams.set("_v", Date.now().toString());
  window.location.replace(url.toString());
}

async function checkForUpdate() {
  try {
    const res = await fetch(`/version.json?ts=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) return;
    const data = (await res.json()) as { buildId?: string };
    if (!data?.buildId) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    // Always persist the latest server build id
    localStorage.setItem(STORAGE_KEY, data.buildId);

    // If the server's build id differs from the one this bundle was built with,
    // the app has been updated OR reverted to a different version — reload.
    if (CURRENT_BUILD_ID !== "dev" && data.buildId !== CURRENT_BUILD_ID) {
      await clearAllCachesAndReload();
    } else if (stored && stored !== data.buildId) {
      // Fallback: build id changed between polls (covers edge cases)
      await clearAllCachesAndReload();
    }
  } catch {
    /* offline or fetch error — ignore */
  }
}

export function VersionChecker() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // Initial check shortly after mount
    const initial = window.setTimeout(checkForUpdate, 2000);

    // Poll periodically
    const interval = window.setInterval(checkForUpdate, CHECK_INTERVAL_MS);

    // Recheck when tab regains focus / becomes visible
    const onVisible = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", checkForUpdate);

    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", checkForUpdate);
    };
  }, []);

  return null;
}
