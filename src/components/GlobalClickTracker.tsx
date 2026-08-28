import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { trackActivity } from "@/lib/activity-tracker";

function getClickLabel(el: HTMLElement): string {
  const text = el.innerText?.trim().substring(0, 80);
  const ariaLabel = el.getAttribute("aria-label");
  const title = el.getAttribute("title");
  const alt = (el as HTMLImageElement).alt;
  const placeholder = (el as HTMLInputElement).placeholder;
  return ariaLabel || title || alt || (text && text.length > 0 ? text : "") || placeholder || "";
}

function getClickTarget(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute("role");
  const type = (el as HTMLInputElement).type;

  if (tag === "a") return "link";
  if (tag === "button" || role === "button") return "button";
  if (tag === "input") return `input[${type || "text"}]`;
  if (tag === "select") return "select";
  if (tag === "textarea") return "textarea";
  if (tag === "img") return "image";
  if (tag === "video") return "video";
  if (tag === "svg" || el.closest("svg")) return "icon";
  return tag;
}

export function GlobalClickTracker() {
  const { user } = useAuth();
  const lastClickRef = useRef<string>("");
  const lastClickTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!user) return;

    // Track page view on load
    trackActivity({
      userId: user.id,
      userName: user.name || "Unknown",
      userEmail: user.email || "",
      action: "Page View",
      details: `Viewed ${document.title || window.location.pathname}`,
      page: window.location.pathname,
    });

    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // Find the nearest interactive element or use the target itself
      const interactive =
        (target.closest("a, button, [role='button'], input, select, textarea") as HTMLElement) ||
        target;

      const label = getClickLabel(interactive);
      const targetType = getClickTarget(interactive);

      // Build a unique key to debounce rapid duplicate clicks
      const clickKey = `${targetType}:${label}:${window.location.pathname}`;
      const now = Date.now();
      if (clickKey === lastClickRef.current && now - lastClickTimeRef.current < 2000) {
        return; // skip duplicate within 2s
      }
      lastClickRef.current = clickKey;
      lastClickTimeRef.current = now;

      const details = label
        ? `${targetType}: "${label.substring(0, 100)}"`
        : `${targetType} element`;

      trackActivity({
        userId: user.id,
        userName: user.name || "Unknown",
        userEmail: user.email || "",
        action: "Click",
        details,
        page: window.location.pathname,
      });
    };

    // Track hash/popstate navigation
    const navHandler = () => {
      trackActivity({
        userId: user.id,
        userName: user.name || "Unknown",
        userEmail: user.email || "",
        action: "Navigate",
        details: `Navigated to ${window.location.pathname}`,
        page: window.location.pathname,
      });
    };

    document.addEventListener("click", handler, true);
    window.addEventListener("popstate", navHandler);

    return () => {
      document.removeEventListener("click", handler, true);
      window.removeEventListener("popstate", navHandler);
    };
  }, [user]);

  return null;
}
