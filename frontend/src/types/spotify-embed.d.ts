declare global {
  interface SpotifyEmbedController {
    loadUri(uri: string): void;
    play(): void;
    pause(): void;
    destroy(): void;
  }

  interface SpotifyIFrameAPI {
    createController(
      element: HTMLElement,
      options: { uri: string; height?: number },
      callback: (controller: SpotifyEmbedController) => void,
    ): void;
  }

  interface Window {
    onSpotifyIframeApiReady?: (api: SpotifyIFrameAPI) => void;
    SpotifyIframeApi?: SpotifyIFrameAPI;
  }
}

export {};
