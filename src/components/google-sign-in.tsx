"use client";

import { useEffect, useRef, useCallback, useState } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (
            element: HTMLElement,
            config: Record<string, unknown>
          ) => void;
        };
      };
    };
  }
}

interface GoogleSignInProps {
  onError?: (message: string) => void;
}

export default function GoogleSignIn({ onError }: GoogleSignInProps) {
  const googleRef = useRef<HTMLDivElement>(null);
  const scriptLoaded = useRef(false);
  const handleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ idToken: response.credential }),
        });

        const data = await res.json();

        if (!res.ok) {
          onError?.(data.error || "Google sign-in failed");
          // error handled above
          return;
        }

        window.location.href = data.user?.isNewUser ? "/onboarding" : "/dashboard";
      } catch {
        onError?.("Google sign-in failed. Please try again.");
      }
    },
    [onError]
  );

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || scriptLoaded.current) return;

    scriptLoaded.current = true;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.google || !googleRef.current) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
      });

      window.google.accounts.id.renderButton(googleRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "center",
        width: googleRef.current.offsetWidth,
      });
    };

    document.head.appendChild(script);

    return () => {
      scriptLoaded.current = false;
    };
  }, [handleCredentialResponse]);

  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return null;

  return (
    <div
      ref={googleRef}
      className="w-full [&>div]:!w-full [&_iframe]:!w-full"
    />
  );
}
