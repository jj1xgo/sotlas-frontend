import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
// import Buefy from 'buefy'
// import vueDebounce from 'vue2-debounce'
// import VueClipboard from 'vue-clipboard2'
import MatchMedia from './matchmedia'
import VueKeyCloak from '@dsb-norge/vue-keycloak-js'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faCheck, faCheckCircle, faInfoCircle, faExclamationTriangle, faExclamationCircle, faArrowUp, faPlus, faCheckDouble,
  faAngleRight, faAngleLeft, faAngleDown, faAngleUp, faEye, faEyeSlash, faCaretUp, faUpload, faLink, faHistory, faThList, faImages,
  faQuoteRight, faSearch, faMountains, faUser, faClock, faChevronCircleUp, faChevronCircleDown, faChartBar, faFileDownload,
  faExchange, faGlobe, faCalendarDay, faTrashAlt, faEdit, faClone, faCheckCircle as farCheckCircle, faArrowsH, faArrowsAlt,
  faSnowflake, faWindowMinimize, faWindowMaximize, faWindowClose, faExpandArrows, faLocation, faCalendarCheck, faComment, faSpinner,
  faBookUser, faTimesCircle } from '@fortawesome/pro-regular-svg-icons'
import { faMap, faCheckCircle as fasCheckCircle, faChevronCircleDown as fasChevronCircleDown, faChevronCircleUp as fasChevronCircleUp,
  faParking, faSquare, faBus, faHiking, faCircle, faCamera, faCameraHome, faVolume, faVolumeMute, faCog, faCaretDown as fasCaretDown,
  faLocationArrow as fasLocationArrow, faInfoCircle as fasInfoCircle,
  faFlag, faEnvelope, faLayerGroup, faCity, faBuilding, faHome, faLandmark, faMapMarkerAlt, faUser as fasUser, faMountains as fasMountains,
  faLocation as fasLocation, faWater, faTree, faRoad } from '@fortawesome/pro-solid-svg-icons'
import { faWikipediaW, faGoogle, faGithub } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon, FontAwesomeLayers } from '@fortawesome/vue-fontawesome'
import '@/assets/global.css'
import store from './store'
import axios from 'axios'

library.add(faCheck, faCheckCircle, faInfoCircle, faExclamationTriangle, faExclamationCircle, faArrowUp, faPlus, faCheckDouble,
  faAngleRight, faAngleLeft, faAngleDown, faAngleUp, faEye, faEyeSlash, faCaretUp, faUpload, faLink, faHistory, faThList, faImages,
  faQuoteRight, faSearch, faMountains, faUser, faClock, faChevronCircleUp, faChevronCircleDown, faMap, faChartBar, faFileDownload,
  faExchange, faGlobe, faCalendarDay, faTrashAlt, faEdit, faClone, farCheckCircle, faArrowsH, faArrowsAlt,
  faSnowflake, faWindowMinimize, faWindowMaximize, faWindowClose, faExpandArrows, faLocation, faCalendarCheck, faComment, faSpinner,
  faBookUser, faTimesCircle)
library.add(faMap, fasCheckCircle, fasChevronCircleDown, fasChevronCircleUp, faParking, faSquare, faBus, faHiking, faCircle, faCamera,
  faCameraHome, faVolume, faVolumeMute, faCog, fasCaretDown, fasLocationArrow, fasInfoCircle,
  faFlag, faEnvelope, faLayerGroup, faCity, faBuilding, faHome, faLandmark, faMapMarkerAlt, fasUser, fasMountains,
  fasLocation, faWater, faTree, faRoad)
library.add(faWikipediaW, faGoogle, faGithub)

const app = createApp(App)
app.component('font-awesome-icon', FontAwesomeIcon)
app.component('font-awesome-layers', FontAwesomeLayers)
// vue2-debounce and vue-clipboard2 are Vue 2-only (v-debounce/v-clipboard directives
// are temporarily unavailable, silently no-op in templates) until replaced (Phase 4).
// app.use(vueDebounce)
// app.use(VueClipboard)
// Buefy 0.8's install() writes to Vue.prototype (Vue 2-only; Vue 3 apps have no
// .prototype), so app.use(Buefy, ...) throws immediately and prevents any page
// from rendering. Disabled until the Buefy 3 upgrade (Phase 2); <b-*> components
// render as unstyled/unrecognized elements in the meantime.
// app.use(Buefy, {
//   defaultIconComponent: 'font-awesome-icon',
//   defaultIconPack: 'far'
// })
app.use(MatchMedia)
app.use(store)
app.use(router)

let mounted = false

if (window.performance && performance.navigation.type === 1) {
  // Store last reload timestamp so user reloads can be detected despite SSO redirect
  sessionStorage.setItem('lastReload', new Date().getTime())
}

if (sessionStorage.getItem('wantSso') || localStorage.getItem('wantSso')) {
  app.use(VueKeyCloak, {
    config: {
      realm: 'SOTA',
      url: 'https://sso.sota.org.uk/auth',
      clientId: 'sotlas'
    },
    init: {
      onLoad: 'check-sso',
      checkLoginIframe: false
    },
    onReady: keycloak => {
      if (sessionStorage.getItem('wantSsoLogin')) {
        sessionStorage.removeItem('wantSsoLogin')
        keycloak.login()
      } else {
        mountApp()
      }
    },
    onInitError: error => {
      console.error('Keycloak error: ' + error)
      mountApp()
    },
    autoUpdateToken: false
  })
} else {
  mountApp()
}

// Axios error handling
let lastError = null
axios.interceptors.response.use(response => {
  return response
}, error => {
  if (!error.config.ignoreError && (!lastError || new Date().getTime() - lastError > 9000) && (!error.response || error.response.status !== 404) && mounted) {
    // SnackbarProgrammatic.open doesn't work with Webpack 5
    // See https://github.com/buefy/buefy/issues/2299
    // $buefy is unavailable until the Buefy 3 upgrade (Phase 2, see app.use(Buefy) above).
    app.config.globalProperties.$buefy?.snackbar.open({
      duration: 9000,
      message: 'Network or server error while loading data, try again later',
      type: 'is-danger',
      position: 'is-bottom-left',
      queue: false
    })

    lastError = new Date().getTime()
  }

  return Promise.reject(error)
})

function mountApp () {
  app.mount('#app')
  mounted = true
}
