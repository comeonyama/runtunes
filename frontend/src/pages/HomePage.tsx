import { Link } from "react-router-dom";
import PlaylistForm from "../components/forms/PlaylistForm";

function HomePage() {
  return (
    <main className="min-h-screen bg-run-bg px-3 py-7 text-white sm:px-6 sm:py-12 md:py-16">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
        <header className="mb-8 text-center sm:mb-10">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            <Link
              aria-label="RunTunes home"
              className="inline-block rounded-md transition-opacity duration-200 hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-run-green focus-visible:ring-offset-4 focus-visible:ring-offset-run-bg"
              to="/"
            >
              Run<span className="text-run-green">Tunes</span>
            </Link>
          </h1>
          <p className="mt-3 text-sm text-neutral-400 sm:text-base">
            Find the soundtrack for your next run.
          </p>
        </header>

        <PlaylistForm />
      </div>
    </main>
  );
}

export default HomePage;
