import { reactive } from 'vue'

// Minimal Vue 3-native replacement for vue-match-media (Vue 2-only, scheduled for
// full removal in the Vue 3 migration's dependency cleanup phase). Provides the
// same $mq.{mobile,desktop,widescreen,fullhd} reactive booleans used across the app.
const queries = {
  mobile: '(max-width: 768px)',
  desktop: '(min-width: 1024px)',
  widescreen: '(min-width: 1216px)',
  fullhd: '(min-width: 1408px)'
}

export default {
  install (app) {
    const mq = reactive({})
    for (const key in queries) {
      const mql = window.matchMedia(queries[key])
      mq[key] = mql.matches
      mql.addEventListener('change', e => { mq[key] = e.matches })
    }
    app.config.globalProperties.$mq = mq
  }
}
