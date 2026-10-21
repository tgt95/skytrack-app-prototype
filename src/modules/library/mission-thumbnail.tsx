import missionThumbnailSvg from '../../assets/img-empty-thumbnail-4_3.svg?raw'

export default function MissionThumbnail({ className = 'ms-lib-thumbimg' }: { className?: string }) {
  return <span className={className} aria-hidden='true' dangerouslySetInnerHTML={{ __html: missionThumbnailSvg }} />
}
