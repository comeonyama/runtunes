import { useEffect, useRef } from "react";
import type { CandidateTrack } from "../types/candidateTrack";

const SPOTIFY_IFRAME_API_URL = "https://open.spotify.com/embed/iframe-api/v1";

let spotifyApiPromise: Promise<SpotifyIFrameAPI> | null = null;

function loadSpotifyIFrameApi(): Promise<SpotifyIFrameAPI> {
  if (window.SpotifyIframeApi) {
    return Promise.resolve(window.SpotifyIframeApi);
  }

  if (spotifyApiPromise) {
    return spotifyApiPromise;
  }

  spotifyApiPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${SPOTIFY_IFRAME_API_URL}"]`,
    );
    const script = existingScript ?? document.createElement("script");

    window.onSpotifyIframeApiReady = (api) => {
      window.SpotifyIframeApi = api;
      resolve(api);
    };

    script.addEventListener(
      "error",
      () => {
        spotifyApiPromise = null;
        reject(new Error("Failed to load the Spotify IFrame API."));
      },
      { once: true },
    );

    if (!existingScript) {
      script.src = SPOTIFY_IFRAME_API_URL;
      document.body.appendChild(script);
    }
  });

  return spotifyApiPromise;
}

function useSpotifyEmbedController(tracks?: CandidateTrack[]) {
  const embedContainerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<SpotifyEmbedController | null>(null);
  const pendingTrackUriRef = useRef<string | null>(null);

  useEffect(() => {
    const container = embedContainerRef.current;
    const initialTrack = tracks?.[0];

    if (!container || !initialTrack) {
      return;
    }

    let cancelled = false;

    void loadSpotifyIFrameApi()
      .then((api) => {
        if (cancelled) {
          return;
        }

        api.createController(
          container,
          { height: 80, uri: initialTrack.uri },
          (controller) => {
            if (cancelled) {
              controller.destroy();
              return;
            }

            controllerRef.current = controller;

            if (pendingTrackUriRef.current) {
              controller.loadUri(pendingTrackUriRef.current);
              controller.play();
              pendingTrackUriRef.current = null;
            }
          },
        );
      })
      .catch(() => {
        // The player remains unavailable if Spotify's external script fails.
      });

    return () => {
      cancelled = true;
      controllerRef.current?.destroy();
      controllerRef.current = null;
      pendingTrackUriRef.current = null;
    };
  }, [tracks]);

  const playTrack = (uri: string) => {
    const controller = controllerRef.current;

    if (!controller) {
      pendingTrackUriRef.current = uri;
      return;
    }

    controller.loadUri(uri);
    controller.play();
  };

  return { embedContainerRef, playTrack };
}

export default useSpotifyEmbedController;
