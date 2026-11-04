import type { OutputImagePreview } from "./mission-insights-output-data";
import { Button } from "skytrack-ui/button";

export function MissionInsightsOutputPreview({
  preview,
  onOpenSurveyImages,
}: {
  preview: OutputImagePreview;
  onOpenSurveyImages?: () => void;
}) {
  return (
    <figure className="m-0 flex min-w-0 flex-col gap-2">
      {onOpenSurveyImages ? (
        <Button
          type="button"
          variant="ghost"
          className="h-auto w-full justify-start gap-0 p-0"
          aria-label="Open Survey image set in Media & Files"
          onClick={onOpenSurveyImages}
        >
          <img
            src={preview.src}
            alt={preview.alt}
            loading="lazy"
            className="block aspect-video w-full rounded-(--radius) border border-border object-cover"
          />
        </Button>
      ) : (
        <img
          src={preview.src}
          alt={preview.alt}
          loading="lazy"
          className="block aspect-video w-full rounded-(--radius) border border-border object-cover"
        />
      )}
      <figcaption className="m-0 text-(--muted-foreground)">
        {preview.caption}
      </figcaption>
    </figure>
  );
}
