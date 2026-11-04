import type { InsightOutput } from "./mission-insights-output-data";

export const rescueLocationsReal: InsightOutput = {
  id: "rescue-locations-real",
  name: "Rescue locations",
  status: "Partial",
  summary: "2 of 3 locations saved · rescue_locations.txt",
  remoteFileCount: 3,
  details: [
    {
      title: "Summary",
      rows: [
        ["Integrity", "48 B · Local · Declared (not checked)"],
        [
          "Detection result",
          "2 person detections saved at 4.5, -0.9 m and 9.6, 0.1 m",
        ],
        ["File rows", "2 of 3 rows saved"],
      ],
    },
    {
      title: "Files",
      rows: [
        [
          "rescue_locations.txt",
          "48 B · 2 of 3 rows · Local · Declared (not checked)",
          "~/SkyTrack/runs/10072026-091502/outputs/rescue_locations.txt",
        ],
        [
          "cap_1791339346000.png",
          "56 KB (55,531 B) · +44.0 s · saved location 1 at 4.5, -0.9 m",
          "~/SkyTrack/runs/10072026-091502/artifacts/images/siyi-a8/cap_1791339346000.png",
        ],
        [
          "cap_1791339405000.png",
          "57 KB (56,993 B) · +103.0 s · saved location 2 at 9.6, 0.1 m · On Mission Computer",
          "~/SkyTrack/runs/10072026-091502/artifacts/images/siyi-a8/cap_1791339405000.png",
        ],
      ],
    },
    {
      title: "Produced by",
      rows: [
        ["Action", "Save rescue locations"],
        ["Time span", "+45.0 s – 150.0 s · action duration 105.0 s"],
        ["Model", "yolo-person 2.1.0 · on Mission Computer"],
        ["Invocations", "4 total · 2 with results · 2 zero · 0 failed"],
        ["Mean / p95 duration", "116 ms / 132 ms"],
      ],
    },
    {
      title: "Issues",
      rows: [
        [
          "Warning",
          "MEDIA_REMOTE_ONLY · 3 files remain on the Mission Computer (2 images, 1 video) · time unknown",
        ],
      ],
    },
    {
      title: "Image information",
      rows: [
        [
          "Selected image",
          "cap_1791339405000.png · PNG · 57 KB · on Mission Computer",
        ],
        ["Created / modified", "Oct 07, 2026 - 09:16:45"],
        ["Dimensions", "640 × 480 · RGB · sRGB IEC61966-2.1"],
        ["Device", "SIYI · A8"],
        ["Creator", "SkyTrack"],
        ["Location metadata", "Omitted from this preview"],
      ],
    },
    {
      title: "Lineage and identifiers",
      rows: [
        [
          "Lineage",
          "Two images (one local, one on Mission Computer) → two detection files (person 0.88 and 0.79) → rescue_locations.txt (2 of 3 saved)",
        ],
        ["Output SHA-256", "4d66a36e…7338 · Declared (not checked)"],
        [
          "Action / model IDs",
          "action_report_person_01 (mission.report_location) · model_person SHA-256 8d10aa3f…e2c7 · inv_0001 … inv_0004",
        ],
        [
          "Remote files",
          "Additional remote image and video remain on the Mission Computer; host details omitted",
        ],
        [
          "Frame and poses",
          "world_ned · capture poses x 7.11 m, y -0.39 m, z 3.05 m and x 6.4 m, y 2.62 m, z 2.61 m",
        ],
        [
          "Flight",
          "29.4 m path · 3.1 m maximum altitude · touchdown 0.04 m from pad",
        ],
      ],
    },
  ],
};
