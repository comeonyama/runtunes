import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  exchangeCodeForToken,
  validateSpotifyAuthState,
} from "../services/spotify/auth";

function getAuthorizationErrorMessage(errorCode: string) {
  switch (errorCode) {
    case "access_denied":
      return "Spotify connection was cancelled.";
    case "temporarily_unavailable":
      return "Spotify is temporarily unavailable. Please try again later.";
    default:
      return "Spotify authorization failed. Please try again.";
  }
}

function CallbackPage() {
  const navigate = useNavigate();
  const hasStarted = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (hasStarted.current) {
      return;
    }

    hasStarted.current = true;

    async function completeLogin() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const state = params.get("state");
        const authorizationError = params.get("error");

        if (!validateSpotifyAuthState(state)) {
          throw new Error("Spotify login state could not be verified.");
        }

        if (authorizationError) {
          throw new Error(getAuthorizationErrorMessage(authorizationError));
        }

        if (!code) {
          throw new Error("Spotify did not return an authorization code.");
        }

        await exchangeCodeForToken(code);
        navigate("/", { replace: true });
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Spotify connection failed. Please try again.",
        );
      }
    }

    void completeLogin();
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-run-bg px-4 text-white">
      <section
        aria-live="polite"
        className="w-full max-w-md rounded-2xl border border-white/10 bg-run-surface p-8 text-center shadow-2xl shadow-black/40"
      >
        {errorMessage ? (
          <>
            <p className="text-lg font-bold">Couldn’t connect Spotify</p>
            <p className="mt-3 text-sm leading-6 text-neutral-400">
              {errorMessage}
            </p>
            <button
              className="mt-6 rounded-full bg-run-green px-6 py-3 text-sm font-bold text-black transition duration-200 hover:bg-run-green-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-run-green focus-visible:ring-offset-2 focus-visible:ring-offset-run-surface"
              onClick={() => navigate("/", { replace: true })}
              type="button"
            >
              Back to RunTunes
            </button>
          </>
        ) : (
          <>
            <span
              aria-hidden="true"
              className="mx-auto block size-8 animate-spin rounded-full border-2 border-neutral-700 border-t-run-green"
            />
            <p className="mt-5 font-semibold">Connecting Spotify…</p>
          </>
        )}
      </section>
    </main>
  );
}

export default CallbackPage;
