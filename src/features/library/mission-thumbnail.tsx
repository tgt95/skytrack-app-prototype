import missionThumbnailSvg from "../../assets/img-empty-thumbnail-4_3.svg?raw";

const thumbnailSvg = missionThumbnailSvg.replace(
  "<svg ",
  '<svg class="w-full h-full block rounded-[inherit]" ',
);

export default function MissionThumbnail() {
  return (
    <span
      className="block w-full h-full rounded-[inherit]"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: thumbnailSvg }}
    />
  );
}
