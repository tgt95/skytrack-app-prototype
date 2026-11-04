import { useState } from "react";
import { Badge } from "skytrack-ui/badge";
import { Button } from "skytrack-ui/button";
import { PageHeader } from "skytrack-ui/page-header";
import {
  Tabs,
  TabsList,
  TabsPanel,
  TabsTab,
} from "skytrack-ui/tabs";

const DRIVE_STAGES = [
  {
    id: "design",
    letter: "D",
    name: "Design",
    description: "Shape a mission before it reaches a field device or aircraft.",
    roles: [
      "Mission Studio supports mission design and simulation.",
      "Field workflow details are not established in the reviewed guide.",
      "The mission computer is the autonomy and secure-communication hub.",
    ],
  },
  {
    id: "rehearsal",
    letter: "R",
    name: "Rehearsal",
    description: "Review a mission in simulation before planning its use outside the desktop workflow.",
    roles: [
      "The user guide describes local mission simulation.",
      "No Field rehearsal workflow is documented in the reviewed sources.",
      "No OS rehearsal workflow is documented in the reviewed sources.",
    ],
  },
  {
    id: "integrate",
    letter: "I",
    name: "Integrate",
    description: "Understand how mission planning, field use, and onboard software fit together.",
    roles: [
      "Desktop is the documented mission design and simulation environment.",
      "The Field handoff is a product direction; transfer steps need Owner definition.",
      "High-level mission logic sits on the mission computer; flight stability stays with the flight controller.",
    ],
  },
  {
    id: "validate",
    letter: "V",
    name: "Validate",
    description: "Use documented simulation and compatibility evidence to review the next step.",
    roles: [
      "Review the mission's simulation result in the documented Desktop workflow.",
      "An Android compatibility matrix is not present in the reviewed sources.",
      "A specific HITL profile is documented separately; it is not a general OS compatibility certification.",
    ],
  },
  {
    id: "execute",
    letter: "E",
    name: "Execute",
    description: "Keep each platform's role clear when a mission moves toward operation.",
    roles: [
      "The reviewed guide includes report review after simulation.",
      "Field operating procedures are not established in the reviewed sources.",
      "The mission computer runs high-level autonomy; the flight controller handles real-time stability.",
    ],
  },
] as const;

const PLATFORMS = [
  { id: "desktop", shortName: "Desktop", name: "SkyTrack Desktop" },
  { id: "field", shortName: "Field", name: "SkyTrack Field" },
  { id: "os", shortName: "SkyTrack OS", name: "SkyTrack OS" },
] as const;

function MockDraftLabel() {
  return (
    <Badge
      status="outline"
      className="rounded-(--radius)"
      aria-label="Mock draft for Owner replacement"
    >
      MOCK / DRAFT — OWNER REPLACEMENT
    </Badge>
  );
}

export default function DownloadPage({ onGoHome }: { onGoHome: () => void }) {
  const [activeDriveStage, setActiveDriveStage] = useState<string>("design");
  const [activePlatform, setActivePlatform] = useState<string>("desktop");

  return (
    <div className="min-w-0">
      <PageHeader
        title="Get SkyTrack"
        toolbar={
          <Button variant="outline" size="sm" onClick={onGoHome}>
            Back to Home
          </Button>
        }
      >
        <p className="m-0 max-w-3xl text-(--muted-foreground)">
          Explore the D.R.I.V.E. workflow, then review platform-specific
          compatibility notes and setup draft.
        </p>
      </PageHeader>

      <div className="flex flex-col gap-10 p-6">
        <nav aria-label="Jump to platform compatibility" className="flex flex-wrap gap-2">
          {PLATFORMS.map((platform) => (
            <a
              key={platform.id}
              className="inline-flex min-h-9 items-center border border-border bg-(--card) px-3 py-2 text-(--foreground) no-underline rounded-(--radius) hover:border-(--primary) focus-visible:outline-2 focus-visible:outline-(--ring) focus-visible:outline-offset-2"
              href="#download-platform-title"
              onClick={() => setActivePlatform(platform.id)}
            >
              {platform.name}
            </a>
          ))}
        </nav>

        <section aria-labelledby="download-drive-title" className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h2
              id="download-drive-title"
              className="m-0 text-lg font-medium text-(--foreground)"
            >
              D.R.I.V.E.
            </h2>
            <p className="m-0 max-w-3xl text-(--muted-foreground)">
              Select a stage to see its purpose and how Desktop, Field, and SkyTrack OS
              contribute. Product details that are not documented are called out.
            </p>
          </div>

          <Tabs
            value={activeDriveStage}
            onValueChange={(next) => setActiveDriveStage(String(next))}
            className="flex flex-col gap-5"
          >
            <TabsList
              aria-label="Select a D.R.I.V.E. stage"
              variant="line"
              width="full"
              className="grid grid-cols-2 gap-0 rounded-(--radius) border-0 border-b border-border bg-transparent p-0 sm:grid-cols-5"
            >
              {DRIVE_STAGES.map((stage, index) => (
                <TabsTab
                  key={stage.id}
                  value={stage.id}
                  className="h-auto min-h-24 items-start justify-start rounded-(--radius) border-0 border-b-2 border-transparent px-3 py-3 text-left data-active:border-primary data-active:bg-primary data-active:text-primary-foreground"
                >
                  <span className="flex flex-col items-start gap-2">
                    <span className="sub-heading text-xs">
                      {String(index + 1).padStart(2, "0")} / {stage.letter}
                    </span>
                    <span className="text-sm font-medium">{stage.name}</span>
                  </span>
                </TabsTab>
              ))}
            </TabsList>

            {DRIVE_STAGES.map((stage) => (
              <TabsPanel key={stage.id} value={stage.id} className="min-w-0">
                <div className="grid min-w-0 grid-cols-1 border border-border bg-(--card) sm:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)] rounded-(--radius)">
                  <div className="flex min-h-56 flex-col justify-between gap-8 bg-primary p-6 text-primary-foreground [clip-path:polygon(0_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%)]">
                    <div className="flex flex-col gap-4">
                      <span className="sub-heading text-xs text-primary-foreground">
                        {stage.letter} / {stage.name.toUpperCase()}
                      </span>
                      <p className="m-0 font-mono text-6xl tabular-nums">
                        {String(DRIVE_STAGES.indexOf(stage) + 1).padStart(2, "0")}
                      </p>
                    </div>
                    <p className="m-0 mt-auto max-w-xs text-sm text-primary-foreground">
                      {stage.description}
                    </p>
                  </div>
                  <dl className="m-0 grid grid-cols-1 gap-0 sm:grid-cols-3">
                    {stage.roles.map((role, index) => (
                      <div
                        key={PLATFORMS[index].id}
                        className="flex min-w-0 flex-col gap-4 border-t border-border p-5 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0"
                      >
                        <dt className="sub-heading text-xs text-(--muted-foreground)">
                          {PLATFORMS[index].shortName}
                        </dt>
                        <dd className="m-0 text-sm text-(--foreground)">{role}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </TabsPanel>
            ))}
          </Tabs>
        </section>

        <section aria-labelledby="download-platform-title" className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h2
              id="download-platform-title"
              className="m-0 text-lg font-medium text-(--foreground)"
            >
              Platform compatibility
            </h2>
              <p className="m-0 max-w-3xl text-(--muted-foreground)">
              Choose an application to view its documented compatibility and
              mock setup guideline.
              All setup prompts are MOCK / DRAFT and need Owner replacement.
            </p>
          </div>

          <Tabs
            value={activePlatform}
            onValueChange={(next) => setActivePlatform(String(next))}
            className="flex flex-col gap-5"
          >
            <TabsList
              aria-label="Select an application"
              variant="line"
              width="full"
              className="flex w-full flex-wrap justify-start rounded-(--radius) border-0 border-b border-border bg-transparent p-0"
            >
              {PLATFORMS.map((platform) => (
                <TabsTab
                  key={platform.id}
                  value={platform.id}
                  className="rounded-(--radius) border-0 border-b-2 border-transparent data-active:border-primary"
                >
                  {platform.name}
                </TabsTab>
              ))}
            </TabsList>

            <TabsPanel value="desktop" id="desktop-compatibility" className="scroll-mt-20">
              <section aria-labelledby="desktop-compatibility-title" className="flex flex-col gap-4 border border-border bg-(--card) p-5 rounded-(--radius)">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 id="desktop-compatibility-title" className="m-0 text-base font-medium text-(--foreground)">
                    SkyTrack Desktop
                  </h3>
                  <MockDraftLabel />
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <h4 className="m-0 text-base font-medium text-(--foreground)">Compatibility</h4>
                    <p className="m-0 text-(--muted-foreground)">
                      The Getting Started guide lists macOS, Windows, or Debian/Ubuntu, an internet connection, permission to install Docker Desktop, and a SkyTrack account using a supported provider. These are guide prerequisites, not confirmation of a current downloadable build.
                    </p>
                    <p className="m-0 text-(--muted-foreground)">
                      Optional HITL is documented for a Linux/Ubuntu host with Gazebo Harmonic and OpenSSH, using the Mini A8 Pro profile with Jetson Orin NX and Pixhawk FMUv6X. This is a specific bench profile, not general Desktop or onboard certification.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h4 className="m-0 text-base font-medium text-(--foreground)">Setup guideline · mock</h4>
                    <ol className="m-0 flex list-decimal flex-col gap-2 pl-5 text-(--muted-foreground)">
                      <li>Install SkyTrack Desktop using the published installer.</li>
                      <li>Install Docker Desktop, enable socket access if required, and confirm Docker is running.</li>
                      <li>Open SkyTrack Desktop, sign in, then open a mission to prepare its local simulation runtime.</li>
                    </ol>
                  </div>
                </div>
              </section>
            </TabsPanel>

            <TabsPanel value="field" id="field-compatibility" className="scroll-mt-20">
              <section aria-labelledby="field-compatibility-title" className="flex flex-col gap-4 border border-border bg-(--card) p-5 rounded-(--radius)">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 id="field-compatibility-title" className="m-0 text-base font-medium text-(--foreground)">
                    SkyTrack Field
                  </h3>
                  <MockDraftLabel />
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <h4 className="m-0 text-base font-medium text-(--foreground)">Compatibility evidence</h4>
                    <p className="m-0 text-(--muted-foreground)">
                      The reviewed sources do not include an Android compatibility matrix. Minimum Android versions, supported devices, and distribution channel are unknown here.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h4 className="m-0 text-base font-medium text-(--foreground)">Setup guideline · mock</h4>
                    <ol className="m-0 flex list-decimal flex-col gap-2 pl-5 text-(--muted-foreground)">
                      <li>Install SkyTrack Field from the approved app channel.</li>
                      <li>Sign in and choose the mission prepared in SkyTrack Desktop.</li>
                      <li>Follow the approved connection and mission-transfer guide before field use.</li>
                    </ol>
                  </div>
                </div>
              </section>
            </TabsPanel>

            <TabsPanel value="os" id="os-compatibility" className="scroll-mt-20">
              <section aria-labelledby="os-compatibility-title" className="flex flex-col gap-4 border border-border bg-(--card) p-5 rounded-(--radius)">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 id="os-compatibility-title" className="m-0 text-base font-medium text-(--foreground)">
                    SkyTrack OS
                  </h3>
                  <MockDraftLabel />
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <h4 className="m-0 text-base font-medium text-(--foreground)">Architecture examples, not certification</h4>
                    <p className="m-0 text-(--muted-foreground)">
                      The architecture context names Jetson Nano / Xavier / Orin NX, Raspberry Pi / Compute Module, and Linux SBCs as common hardware. These examples do not certify board compatibility or an OS image. A separate optional HITL profile describes a narrower host and bench scenario; it is not a general compatibility matrix.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h4 className="m-0 text-base font-medium text-(--foreground)">Setup guideline · mock</h4>
                    <ol className="m-0 flex list-decimal flex-col gap-2 pl-5 text-(--muted-foreground)">
                      <li>Choose a companion-computer and flight-controller combination from the published compatibility matrix.</li>
                      <li>Use the installation image and board-specific instructions for that combination.</li>
                      <li>Verify the onboard runtime and controller integration using the approved setup guide.</li>
                    </ol>
                  </div>
                </div>
              </section>
            </TabsPanel>
          </Tabs>
        </section>

        <section aria-labelledby="download-resources-title" className="flex flex-col gap-3">
          <h2 id="download-resources-title" className="m-0 text-lg font-medium text-(--foreground)">
            Resources
          </h2>
          <p className="m-0 text-(--muted-foreground)">
            Verified product and compatibility destinations can be added after the Owner confirms the current links.
          </p>
        </section>
      </div>
    </div>
  );
}
