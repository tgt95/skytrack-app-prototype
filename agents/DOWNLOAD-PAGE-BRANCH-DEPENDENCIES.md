# Download page branch dependencies

```mermaid
flowchart LR
  page[Download page] --> app{activePlatform}

  app -->|Desktop| host{hostOs}
  host -->|macOS| mac[macOS card · v1.2 · 11+]
  mac --> macReq[macOS requirements]
  mac --> macDl[Download · 248 MB · .dmg]
  mac --> macDocker[Docker macOS instructions]
  host -->|Ubuntu| ubuntu[Ubuntu card · v1.2 · 20.04 / 22.04]
  ubuntu --> ubuntuReq[Ubuntu requirements]
  ubuntu --> ubuntuDl[Download · 216 MB · .deb]
  ubuntu --> ubuntuDocker[Docker Ubuntu instructions]
  host -->|Windows| win[Windows card · v1.2 · 10 / 11]
  win --> winReq[Windows requirements]
  win --> winDl[Download · 284 MB · .exe]
  win --> winDocker[Docker Windows instructions]

  app -->|Mobile / Field| android[Android · v1.2 · Android 11+]
  android --> androidReq[Requirements · proposed minimum + recommended]
  android --> play[Download opens Google Play]
  android --> mobileSetup[Mobile setup copy]

  app -->|SkyTrack OS| target{skyTrackOsTarget}
  target -->|Jetson| jetson[NVIDIA Jetson · v1.2 · Orin Nano / Orin NX]
  jetson --> jetsonOrin[Orin Download · demo tar.gz]
  jetson --> jetsonNx[NX Download · demo tar.gz]
  target -->|Pi 5| pi[Raspberry Pi 5 · v1.2]
  pi --> piImage[Pi 5 Download · demo ext4]
  target -->|Linux SBC| linux[Disabled · Coming soon · no Download]
  jetson --> compatibility[Compatibility copy names selected target]
  pi --> compatibility
  jetson --> osSetup[JetsonFlashGuideline]
  pi -. current behavior .-> osSetup

  page --> shared[Shared behavior]
  shared --> state[hostOs persists across app switches]
  shared --> reset[activePlatform remount resets target to Jetson]
  shared --> toast[Desktop and OS buttons show no-installer toast]
  shared --> accordions[Selector + requirements + setup start expanded]
  shared --> tables[Desktop columns 30 / 70 · Android 20 / 35 / 45]
```

## Change hotspots

- A Desktop host change must update the same host key in `HOST_OPTIONS`, `DESKTOP_SYSTEM_REQUIREMENTS`, and `DOCKER_DESKTOP_INSTALL_GUIDES`.
- A SkyTrack OS image change must update the target card and its `downloadImages` entry together: button label, full filename, extension, and demo size.
- SkyTrack OS setup is Jetson-specific today. Add a target-specific setup branch if Pi instructions become available.
- Download sizes are mock values. Desktop and SkyTrack OS buttons do not download files; Android links to Google Play.

Current SkyTrack OS image filenames:

- Jetson Orin: `skytrack-mc-image-dev-jetson-orin-nano-devkit-nvme.rootfs.tegraflash.tar.gz`
- Jetson NX: `skytrack-mc-image-dev-p3768-0000-p3767-0000.rootfs-20260908085629.tegraflash.tar.gz`
- Raspberry Pi 5: `core-image-full-cmdline-raspberrypi5.rootfs.ext4`

Source of truth: [`download-page.tsx`](../src/features/library/pages/download-page.tsx) — `PLATFORMS`, host maps, `ANDROID_SYSTEM_REQUIREMENTS`, `SKYTRACK_OS_TARGETS`, and `PlatformDetails`.
