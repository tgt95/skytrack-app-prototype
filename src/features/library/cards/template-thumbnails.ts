import industrialFacility from '../../../assets/images/mission-templates/01KVXDNW99F9GVHZS9V2NAD2C0.jpg'
import heritageSite from '../../../assets/images/mission-templates/01KVXDP7Y462HK17QF1H1B1RP3.jpg'
import heritageFlight from '../../../assets/images/mission-templates/01KVXDPJTGF257Q8RZZF5X3SD5.jpg'
import canyonTerrain from '../../../assets/images/mission-templates/01KVXDPZ9ZWVHQR016FF8AZ20T.jpg'
import lidarSurvey from '../../../assets/images/mission-templates/01KVXDQJVRXBFNX6WC4P44GKQN.jpg'

const TEMPLATE_THUMBNAILS: Record<string, string> = {
  t1: lidarSurvey,
  t2: canyonTerrain,
  t3: heritageFlight,
  t4: heritageSite,
  t5: industrialFacility,
  t6: industrialFacility,
  t7: industrialFacility,
  t8: industrialFacility,
  t9: lidarSurvey,
  t10: heritageFlight
}

export function getTemplateThumbnail(templateId: string): string | undefined {
  return TEMPLATE_THUMBNAILS[templateId]
}
