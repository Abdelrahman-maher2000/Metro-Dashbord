"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function BlockedEmailGuard({
  blockedEmail,
  redirectTo = "/",
  children,
}) {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const isBlocked =
    currentUser?.email &&
    currentUser.email.toLowerCase() === blockedEmail.toLowerCase();

  useEffect(() => {
    if (!isBlocked) return;
    const timer = setTimeout(() => {
      router.push(redirectTo);
    }, 1500);
    return () => clearTimeout(timer);
  }, [isBlocked, redirectTo, router]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">
            Login Required
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Please sign in to access this page.
          </p>
        </div>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">
            Access Denied
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            This account does not have access to this page.
          </p>
          <button
            type="button"
            onClick={() => router.push(redirectTo)}
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Go back to dashboard
          </button>
        </div>
      </div>
    );
  }

  if (typeof children === "function") {
    return children({ user: currentUser });
  }

  return children || null;
}
