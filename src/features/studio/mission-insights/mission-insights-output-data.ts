export type OutputDetailSection = {
  title: string;
  rows: ReadonlyArray<
    readonly [label: string, value: string, copyPath?: string]
  >;
};

export type OutputImagePreview = {
  src: string;
  alt: string;
  caption: string;
  attribution?: { author: string; sourceUrl: string; license: string; licenseUrl: string };
};

export type InsightOutput = {
  id: string;
  name: string;
  status: "Available" | "Partial";
  summary: string;
  preview?: OutputImagePreview;
  remoteFileCount?: number;
  details: OutputDetailSection[];
};

function demoMappedAreas(
  id: string,
  summary: string,
  image: string,
  alt: string,
  caption: string,
  author: string,
  sourceUrl: string,
  license: string,
  licenseUrl: string,
  areas: number,
  images: number,
  file: string,
): InsightOutput {
  return {
    id, name: "Mapped areas", status: "Available", summary,
    preview: {
      src: image, alt,
      caption: `Reference image · not captured by this run · ${caption}`,
      attribution: { author, sourceUrl, license, licenseUrl },
    },
    details: [{ title: "Summary", rows: [["Mapped areas", String(areas)], ["Source images", String(images)], ["Output file", file]] }],
  };
}

export const demoMappedAreaOutputs: Record<string, InsightOutput> = {
  "construction-progress": demoMappedAreas("demo-construction-areas", "12 areas from 42 images · construction-progress.geojson", constructionReference, "Aerial digital surface model of a motorway construction site.", "construction site", "Kbosak", "https://commons.wikimedia.org/wiki/File:DSM_construction_site.jpg", "CC BY 3.0", "https://creativecommons.org/licenses/by/3.0/", 12, 42, "construction-progress.geojson"),
  "flood-impact": demoMappedAreas("demo-flood-areas", "18 of 20 impact areas from 36 images · flood-impact.geojson", floodReference, "Aerial view of flooding in Pakistan.", "flood impact", "Department of Foreign Affairs and Trade", "https://commons.wikimedia.org/wiki/File:Aerial_view_of_flooding,_Pakistan_2010.jpg", "CC BY 2.0", "https://creativecommons.org/licenses/by/2.0/", 18, 36, "flood-impact.geojson"),
  "bridge-inspection": demoMappedAreas("demo-bridge-areas", "8 areas from 64 images · bridge-inspection.geojson", bridgeReference, "Drone view of a bridge during an inspection.", "bridge inspection", "FedericaGaspari", "https://commons.wikimedia.org/wiki/File:Drone_view_of_a_bridge_during_an_inspection.jpg", "CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/", 8, 64, "bridge-inspection.geojson"),
  "erosion-survey": demoMappedAreas("demo-erosion-areas", "11 areas from 33 images · erosion-survey.geojson", erosionReference, "Stream bank erosion along a waterway.", "stream bank erosion", "El Grafo", "https://commons.wikimedia.org/wiki/File:Stream_bank_erosion.jpg", "CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/", 11, 33, "erosion-survey.geojson"),
};

export const stressedAreaMap: InsightOutput = {
  id: "stressed-area-map",
  name: "Mapped areas",
  status: "Available",
  summary: "27 areas from 11 images · stressed-areas.geojson",
  preview: {
    src: okSourceImage,
    alt: "Source image 000003.jpg for the mapped areas output.",
    caption: "Source image · 000003.jpg",
  },
  details: [
    {
      title: "Summary",
      rows: [
        ["Detected areas", "27"],
        ["Source images", "11"],
        ["Output file", "stressed-areas.geojson"],
      ],
    },
  ],
};

export const surveyImageSet: InsightOutput = {
  id: "survey-image-set",
  name: "Survey image set",
  status: "Available",
  summary: "24 of 24 images · JPEG · 1920 × 1080",
  preview: {
    src: okSurveyImage,
    alt: "Survey image 000001.jpg",
    caption: "Survey image · 000001.jpg",
  },
  details: [
    {
      title: "Summary",
      rows: [
        ["Images", "24 of 24"],
        ["Format", "JPEG"],
        ["Dimensions", "1920 × 1080"],
      ],
    },
  ],
};

export const rescueLocationsFailed: InsightOutput = {
  id: "rescue-locations-failed",
  name: "Location results",
  status: "Partial",
  summary: "1 of 3 locations saved · rescue_locations.txt",
  preview: {
    src: failedRescueImage,
    alt: "Source image 000002.jpg associated with the location results output.",
    caption: "Source image · 000002.jpg",
  },
  details: [
    {
      title: "Summary",
      rows: [
        ["Integrity", "24 B · Local · Verified"],
        [
          "Detection result",
          "2 person detections · 1 saved at 4.6, 4.9 m · 1 detected but not saved at 9.5, 5.6 m",
        ],
        ["File rows", "1 of 3 rows saved"],
      ],
    },
    {
      title: "Files",
      rows: [
        [
          "rescue_locations.txt",
          "24 B · 1 of 3 rows · Local · Verified",
          "~/SkyTrack/runs/10062026-152739/outputs/rescue_locations.txt",
        ],
        [
          "000002.jpg",
          "213 KB (212,600 B) · +22.0 s · 1 saved location at 4.6, 4.9 m",
          "~/SkyTrack/runs/10062026-152739/artifacts/images/front-rgb/000002.jpg",
        ],
      ],
    },
    {
      title: "Produced by",
      rows: [
        ["Action", "Save rescue location 1"],
        ["Time span", "+64.0 s – 64.5 s · action duration 0.5 s"],
        ["Model", "yolo-person 2.1.0 · This computer (simulation)"],
        [
          "Invocations",
          "5 total · 2 with results · 2 zero · 1 failed (CUDA out of memory)",
        ],
        ["Mean / p95 duration", "459 ms / 655 ms"],
      ],
    },
    {
      title: "Issues",
      rows: [
        [
          "Error",
          "ACTION_TIMEOUT · Approach person 2 timed out at 78.2 s; action server did not respond within 10 s",
        ],
        [
          "Error",
          "MODEL_INVOCATION_FAILED · CUDA out of memory (requested 512 MiB) at 58.2 s on 000006.jpg",
        ],
      ],
    },
    {
      title: "Image information",
      rows: [
        ["Selected image", "000002.jpg · first image · JPEG · 213 KB"],
        ["Created / modified", "Oct 06, 2026 - 15:28:01"],
        ["Dimensions", "1280 × 720 · RGB · sRGB IEC61966-2.1"],
        ["Device", "Gazebo · x500 mono camera (simulated)"],
        ["Creator", "SkyTrack"],
        ["Location metadata", "Omitted from this preview"],
      ],
    },
    {
      title: "Lineage and identifiers",
      rows: [
        [
          "Lineage",
          "000002.jpg (art_image_0002, observed, +22.0 s) → 000002.json (art_detection_0002, person 0.91) → rescue_locations.txt (art_rescue_locations)",
        ],
        [
          "Unsaved detection",
          "000004.jpg → art_detection_0004 · person 0.84 · detected, not saved",
        ],
        ["Output SHA-256", "4d66a36e…7338 · Verified"],
        [
          "Action / model IDs",
          "action_report_person_01 (mission.report_location) · model_person SHA-256 8d10aa3f…e2c7 · inv_0001 … inv_0005 (inv_0005 failed: CUDA_OOM)",
        ],
        [
          "Frame and pose",
          "world_ned · 000002.jpg capture pose x 8.0 m, y 1.5 m, z 2.5 m",
        ],
        [
          "Flight",
          "28.5 m path · 2.5 m maximum altitude · no touchdown (last position 5.6, 5.1 m)",
        ],
      ],
    },
  ],
};

export const searchImageSet: InsightOutput = {
  id: "search-image-set",
  name: "Captured image set",
  status: "Partial",
  summary: "5 of 6 images · JPEG · 1280 × 720 · 1 file not written",
  preview: {
    src: failedSearchImage,
    alt: "Search image 000001.jpg",
    caption: "Search image · 000001.jpg",
  },
  details: [
    {
      title: "Summary",
      rows: [
        [
          "Integrity",
          "5 verified · 1 unavailable · 5 local · 1 file not written",
        ],
        [
          "Detection result",
          "2 person detections across 5 local images · one saved, one detected but not saved",
        ],
      ],
    },
    {
      title: "Files",
      rows: [
        [
          "000001.jpg",
          "211 KB (211,300 B) · +12.0 s · 0 detections",
          "~/SkyTrack/runs/10062026-152739/artifacts/images/front-rgb/000001.jpg",
        ],
        [
          "000002.jpg",
          "213 KB (212,600 B) · +22.0 s · 1 saved detection",
          "~/SkyTrack/runs/10062026-152739/artifacts/images/front-rgb/000002.jpg",
        ],
        [
          "000004.jpg",
          "215 KB (215,200 B) · +40.0 s · detected, not saved",
          "~/SkyTrack/runs/10062026-152739/artifacts/images/front-rgb/000004.jpg",
        ],
        [
          "000005.jpg",
          "File not written · disk write error at 49.0 s",
          "~/SkyTrack/runs/10062026-152739/artifacts/images/front-rgb/000005.jpg",
        ],
        [
          "000006.jpg",
          "218 KB (217,800 B) · model invocation failed at 58.2 s",
          "~/SkyTrack/runs/10062026-152739/artifacts/images/front-rgb/000006.jpg",
        ],
      ],
    },
    {
      title: "Produced by",
      rows: [
        ["Action", "Capture search images · Partial"],
        ["Time span", "+12.0 s – 58.0 s · action duration 46.0 s"],
        ["Expected output", "5 of 6 expected images · WRITE_FAILED on image 5"],
      ],
    },
    {
      title: "Issues",
      rows: [
        [
          "Warning",
          "ARTIFACT_NOT_WRITTEN · Image 5 was not written (disk write error) at 49.0 s",
        ],
        [
          "Error",
          "MODEL_INVOCATION_FAILED · CUDA out of memory (requested 512 MiB) at 58.2 s on 000006.jpg",
        ],
      ],
    },
    {
      title: "Image information",
      rows: [
        ["Selected image", "000005.jpg · JPEG · file unavailable"],
        ["Created / modified", "— · content created Oct 06, 2026 - 15:28:28"],
        ["Dimensions", "1280 × 720 · RGB · sRGB IEC61966-2.1"],
        ["Device", "Gazebo · x500 mono camera (simulated)"],
        ["Creator", "SkyTrack"],
        ["Location metadata", "Omitted from this preview"],
      ],
    },
    {
      title: "Lineage and identifiers",
      rows: [
        [
          "Lineage",
          "5 local images (art_image_0001 … 0004, art_image_0006) plus art_image_0005 not written → detection files → rescue_locations.txt",
        ],
        [
          "Detection links",
          "000002.jpg → person 0.91, saved · 000004.jpg → person 0.84, detected but not saved",
        ],
        [
          "Image hashes",
          "5a1f211d…e156 · image 000005 unavailable · 5 images verified",
        ],
        [
          "Payload / frame / pose",
          "front_rgb_camera · world_ned · 000005.jpg capture pose x 6.5 m, y 3.5 m, z 2.5 m",
        ],
      ],
    },
  ],
};

export { rescueLocationsReal } from "./mission-insights-output-real";
import okSourceImage from "./sample-data/ok/img_0003.jpg";
import okSurveyImage from "./sample-data/ok/img_0001.jpg";
import failedRescueImage from "./sample-data/fail/img_0002.jpg";
import failedSearchImage from "./sample-data/fail/img_0001.jpg";
import constructionReference from "./sample-data/demo/construction-map-reference.jpg?url";
import floodReference from "./sample-data/demo/flood-impact-reference.jpg?url";
import bridgeReference from "./sample-data/demo/bridge-inspection-reference.jpg?url";
import erosionReference from "./sample-data/demo/erosion-reference.jpg?url";
