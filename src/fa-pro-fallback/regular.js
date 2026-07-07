// Fallback for @fortawesome/pro-regular-svg-icons, used via vite.config.mjs
// alias when NPM_FONTAWESOME_TOKEN is not set (see README.md "FontAwesome Pro").
//
// - Icons with a free-regular equivalent are re-exported as-is.
// - Icons only available in free-solid are relabelled with prefix 'far' so
//   library.add() still registers them under the ['far', '<name>'] key that
//   templates use; they render as the solid glyph instead of the outline one.
// - The 8 icons with no free equivalent at all are relabelled from the
//   closest free-solid analogue (kept under their original iconName).
import {
  faCheckCircle, faEye, faEyeSlash, faImages, faUser, faClock, faChartBar,
  faTrashAlt, faEdit, faClone, faSnowflake, faWindowMinimize, faWindowMaximize,
  faWindowClose, faCalendarCheck, faComment, faTimesCircle
} from '@fortawesome/free-regular-svg-icons'
import {
  faCheck as fasCheck, faInfoCircle as fasInfoCircle, faExclamationTriangle as fasExclamationTriangle,
  faExclamationCircle as fasExclamationCircle, faArrowUp as fasArrowUp, faPlus as fasPlus,
  faCheckDouble as fasCheckDouble, faAngleRight as fasAngleRight, faAngleLeft as fasAngleLeft,
  faAngleDown as fasAngleDown, faAngleUp as fasAngleUp, faCaretUp as fasCaretUp, faUpload as fasUpload,
  faLink as fasLink, faHistory as fasHistory, faThList as fasThList, faQuoteRight as fasQuoteRight,
  faSearch as fasSearch, faChevronCircleUp as fasChevronCircleUp, faChevronCircleDown as fasChevronCircleDown,
  faFileDownload as fasFileDownload, faGlobe as fasGlobe, faCalendarDay as fasCalendarDay,
  faArrowsAlt as fasArrowsAlt, faSpinner as fasSpinner,
  faMountain, faExchangeAlt, faArrowsAltH, faExpandArrowsAlt, faLocationArrow, faAddressBook
} from '@fortawesome/free-solid-svg-icons'

const relabel = (definition, prefix, iconName) => ({ ...definition, prefix, iconName })
const asFar = (definition) => relabel(definition, 'far', definition.iconName)

export {
  faCheckCircle, faEye, faEyeSlash, faImages, faUser, faClock, faChartBar,
  faTrashAlt, faEdit, faClone, faSnowflake, faWindowMinimize, faWindowMaximize,
  faWindowClose, faCalendarCheck, faComment, faTimesCircle
}

export const faCheck = asFar(fasCheck)
export const faInfoCircle = asFar(fasInfoCircle)
export const faExclamationTriangle = asFar(fasExclamationTriangle)
export const faExclamationCircle = asFar(fasExclamationCircle)
export const faArrowUp = asFar(fasArrowUp)
export const faPlus = asFar(fasPlus)
export const faCheckDouble = asFar(fasCheckDouble)
export const faAngleRight = asFar(fasAngleRight)
export const faAngleLeft = asFar(fasAngleLeft)
export const faAngleDown = asFar(fasAngleDown)
export const faAngleUp = asFar(fasAngleUp)
export const faCaretUp = asFar(fasCaretUp)
export const faUpload = asFar(fasUpload)
export const faLink = asFar(fasLink)
export const faHistory = asFar(fasHistory)
export const faThList = asFar(fasThList)
export const faQuoteRight = asFar(fasQuoteRight)
export const faSearch = asFar(fasSearch)
export const faChevronCircleUp = asFar(fasChevronCircleUp)
export const faChevronCircleDown = asFar(fasChevronCircleDown)
export const faFileDownload = asFar(fasFileDownload)
export const faGlobe = asFar(fasGlobe)
export const faCalendarDay = asFar(fasCalendarDay)
export const faArrowsAlt = asFar(fasArrowsAlt)
export const faSpinner = asFar(fasSpinner)

// No free equivalent at all — relabelled closest-match substitute.
export const faMountains = relabel(faMountain, 'far', 'mountains')
export const faExchange = relabel(faExchangeAlt, 'far', 'exchange')
export const faArrowsH = relabel(faArrowsAltH, 'far', 'arrows-h')
export const faExpandArrows = relabel(faExpandArrowsAlt, 'far', 'expand-arrows')
export const faLocation = relabel(faLocationArrow, 'far', 'location')
export const faBookUser = relabel(faAddressBook, 'far', 'book-user')
