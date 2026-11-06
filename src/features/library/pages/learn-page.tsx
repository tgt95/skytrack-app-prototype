import { ArrowSquareOutIcon, BookOpenIcon } from "@phosphor-icons/react";
import {
  LibraryCardFrame,
  LibraryPageHeader,
  LibraryPageLayout,
} from "@/features/library/cards/library-presentation.tsx";

const LEARN_URL = "https://getskytrack.com/help/category/get-builders-insights";
const LEARN_FEATURED = {
  title: "Use simulation effectively when building autonomous missions",
  desc: "How simulation fits into a responsible mission-building workflow.",
  url: "https://getskytrack.com/en/resources/how-to-use-simulation-effectively-when-building-autonomous-missions-en-394",
};

export default function LearnPage() {
  return (
    <LibraryPageLayout
      titleId="ms-lib-learn-page-title"
      header={
        <LibraryPageHeader
          titleId="ms-lib-learn-page-title"
          title="Learn"
          description={
            <p className="ms-lib-sub mt-1 mx-0 mb-0 text-sm text-(--muted-foreground)">
              Guides from the SkyTrack help center open in a new tab.
            </p>
          }
        />
      }
    >
      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5"
        aria-label="Featured learning resources"
      >
        <LibraryCardFrame
          label={LEARN_FEATURED.title}
          actions={[
            {
              id: "open",
              label: "Open",
              group: "primary",
              onSelect: () =>
                window.open(LEARN_FEATURED.url, "_blank", "noopener,noreferrer"),
            },
          ]}
        >
          <span
            className="ms-lib-thumb relative flex items-center justify-center aspect-4/3 overflow-hidden text-(--muted-foreground) bg-(--background) bg-[repeating-linear-gradient(to_right,color-mix(in_srgb,var(--border)_55%,transparent)_0_0.0625rem,transparent_0_0.0625rem_1.75rem),repeating-linear-gradient(to_bottom,color-mix(in_srgb,var(--border)_55%,transparent)_0_0.0625rem,transparent_0_0.0625rem_1.75rem)] border-b border-b-border [&.is-template]:bg-none [&.is-project]:bg-none [&.is-project]:bg-(--muted) [&.tint-0]:bg-[color-mix(in_srgb,var(--primary)_26%,var(--card))] [&.tint-2]:bg-(--muted) [&.tint-4]:bg-[color-mix(in_srgb,var(--primary)_10%,var(--card))] [&.tint-5]:bg-[color-mix(in_srgb,var(--primary)_32%,var(--muted))] [&.is-learn]:bg-none [&.is-learn]:text-(--primary) is-learn tint-3 [.ms-lib-thumb&]:bg-[color-mix(in_srgb,var(--accent)_70%,var(--card))]"
            aria-hidden="true"
          >
            <BookOpenIcon className="w-11 h-11 opacity-[0.85]" />
          </span>
          <span className="ms-lib-card-body flex flex-col gap-1 p-3">
            <a
              className="border-0 p-0 bg-transparent text-inherit [font:inherit] text-sm font-medium text-left cursor-pointer rounded-(--radius) hover:text-(--primary) focus-visible:outline-2 focus-visible:outline-(--primary) focus-visible:outline-offset-1"
              href={LEARN_FEATURED.url}
              target="_blank"
              rel="noreferrer"
            >
              {LEARN_FEATURED.title}{" "}
              <ArrowSquareOutIcon
                aria-hidden="true"
                className="w-3 h-3 align-[-1px]"
              />
            </a>
            <span className="text-xs text-muted-foreground leading-[1.5]">
              {LEARN_FEATURED.desc}
            </span>
          </span>
        </LibraryCardFrame>
        <LibraryCardFrame
          label="SkyTrack help center"
          actions={[
            {
              id: "open",
              label: "Open",
              group: "primary",
              onSelect: () =>
                window.open(LEARN_URL, "_blank", "noopener,noreferrer"),
            },
          ]}
        >
          <span
            className="ms-lib-thumb relative flex items-center justify-center aspect-4/3 overflow-hidden text-(--muted-foreground) bg-(--background) bg-[repeating-linear-gradient(to_right,color-mix(in_srgb,var(--border)_55%,transparent)_0_0.0625rem,transparent_0_0.0625rem_1.75rem),repeating-linear-gradient(to_bottom,color-mix(in_srgb,var(--border)_55%,transparent)_0_0.0625rem,transparent_0_0.0625rem_1.75rem)] border-b border-b-border [&.is-template]:bg-none [&.is-project]:bg-none [&.is-project]:bg-(--muted) [&.tint-0]:bg-[color-mix(in_srgb,var(--primary)_26%,var(--card))] [&.tint-2]:bg-(--muted) [&.tint-4]:bg-[color-mix(in_srgb,var(--primary)_10%,var(--card))] [&.tint-5]:bg-[color-mix(in_srgb,var(--primary)_32%,var(--muted))] [&.is-learn]:bg-none [&.is-learn]:text-(--primary) is-learn tint-1 [.ms-lib-thumb&]:bg-[color-mix(in_srgb,var(--primary)_16%,var(--muted))]"
            aria-hidden="true"
          >
            <BookOpenIcon className="w-11 h-11 opacity-[0.85]" />
          </span>
          <span className="ms-lib-card-body flex flex-col gap-1 p-3">
            <a
              className="border-0 p-0 bg-transparent text-inherit [font:inherit] text-sm font-medium text-left cursor-pointer rounded-(--radius) hover:text-(--primary) focus-visible:outline-2 focus-visible:outline-(--primary) focus-visible:outline-offset-1"
              href={LEARN_URL}
              target="_blank"
              rel="noreferrer"
            >
              SkyTrack help center{" "}
              <ArrowSquareOutIcon
                aria-hidden="true"
                className="w-3 h-3 align-[-1px]"
              />
            </a>
            <span className="text-xs text-muted-foreground leading-[1.5]">
              Browse guides for planning and flying missions.
            </span>
          </span>
        </LibraryCardFrame>
      </div>
    </LibraryPageLayout>
  );
}
