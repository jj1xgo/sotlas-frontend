// Fallback for @fortawesome/pro-solid-svg-icons, used via vite.config.mjs
// alias when NPM_FONTAWESOME_TOKEN is not set (see README.md "FontAwesome Pro").
//
// All pro-solid icons used by this app have a same-style free-solid
// equivalent except the 4 relabelled below, which have no free equivalent at
// all and use the closest free-solid analogue under the original iconName.
import {
  faMap, faCheckCircle, faChevronCircleDown, faChevronCircleUp, faParking,
  faSquare, faBus, faHiking, faCircle, faCamera, faVolumeMute, faCog,
  faCaretDown, faLocationArrow, faInfoCircle, faFlag, faEnvelope, faLayerGroup,
  faCity, faBuilding, faHome, faLandmark, faMapMarkerAlt, faUser, faWater,
  faTree, faRoad,
  faMountain, faLocationArrow as faLocationArrowForLocation, faVideo, faVolumeUp
} from '@fortawesome/free-solid-svg-icons'

const relabel = (definition, prefix, iconName) => ({ ...definition, prefix, iconName })

export {
  faMap, faCheckCircle, faChevronCircleDown, faChevronCircleUp, faParking,
  faSquare, faBus, faHiking, faCircle, faCamera, faVolumeMute, faCog,
  faCaretDown, faLocationArrow, faInfoCircle, faFlag, faEnvelope, faLayerGroup,
  faCity, faBuilding, faHome, faLandmark, faMapMarkerAlt, faUser, faWater,
  faTree, faRoad
}

// No free equivalent at all — relabelled closest-match substitute.
export const faMountains = relabel(faMountain, 'fas', 'mountains')
export const faLocation = relabel(faLocationArrowForLocation, 'fas', 'location')
export const faCameraHome = relabel(faVideo, 'fas', 'camera-home')
export const faVolume = relabel(faVolumeUp, 'fas', 'volume')
