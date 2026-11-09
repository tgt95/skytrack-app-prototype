import { ArrowLeftIcon } from "@phosphor-icons/react";
import { Button } from "skytrack-ui/button";

export default function NotFoundPage({
  pathname,
  onGoHome,
}: {
  pathname: string;
  onGoHome: () => void;
}) {
  return (
    <main
      className="ms-root grid min-h-dvh place-items-center bg-(--background) px-6 py-12 text-foreground"
      aria-labelledby="ms-not-found-title"
      data-testid="ms-not-found-page"
    >
      <section className="flex w-full max-w-lg flex-col items-center gap-5 text-center">
        <p className="m-0 font-mono text-6xl font-semibold tracking-tight text-primary">
          404
        </p>
        <div className="flex flex-col gap-2">
          <h1 id="ms-not-found-title" className="h3 m-0">
            Page not found
          </h1>
          <p className="m-0 text-(--muted-foreground)">
            We couldn’t find <code className="font-mono">{pathname}</code>. The
            address may be outdated or incorrect.
          </p>
        </div>
        <Button size="lg" onClick={onGoHome}>
          <ArrowLeftIcon aria-hidden="true" />
          Go to Home
        </Button>
      </section>
    </main>
  );
}
