import { useEffect } from "react";
import { GoogleAuthProvider, signInWithCredential, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

const GOOGLE_WEB_CLIENT_ID =
  "651298773881-i63ha5pms8i8f2hkh6r60kvggqb8br26.apps.googleusercontent.com";

const GSI_SRC = "https://accounts.google.com/gsi/client";

type GoogleCredentialResponse = { credential?: string };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          prompt: (listener?: (notification: unknown) => void) => void;
          cancel: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

function loadGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("GSI failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("GSI failed to load"));
    document.head.appendChild(script);
  });
}

/**
 * Google One Tap: shows the "Continue as ..." prompt for returning users and
 * silently re-signs them in when possible. New users get the account chooser.
 */
export default function GoogleOneTap() {
  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (cancelled) return;

      if (user) {
        // Already signed in — make sure no prompt is showing.
        window.google?.accounts.id.cancel();
        return;
      }

      try {
        await loadGsiScript();
        if (cancelled || auth.currentUser) return;

        window.google?.accounts.id.initialize({
          client_id: GOOGLE_WEB_CLIENT_ID,
          auto_select: true, // automatic sign-in for returning users
          cancel_on_tap_outside: false,
          itp_support: true,
          use_fedcm_for_prompt: true,
          context: "signin",
          callback: async (response: GoogleCredentialResponse) => {
            if (!response.credential) return;
            try {
              const credential = GoogleAuthProvider.credential(response.credential);
              await signInWithCredential(auth, credential);
            } catch (error) {
              console.error("Google One Tap sign-in failed:", error);
            }
          },
        });

        window.google?.accounts.id.prompt();
      } catch (error) {
        console.error("Google One Tap unavailable:", error);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
      window.google?.accounts.id.cancel();
    };
  }, []);

  return null;
}
