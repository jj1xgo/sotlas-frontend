import api from './api.js'
import basemapatStyle from '../assets/basemapat.json'
import caltopoStyle from '../assets/caltopo.json'
import norkartStyle from '../assets/norkart.json'
import swisstopoStyle from '../assets/swisstopo.json'
import swisstopoAerialStyle from '../assets/swisstopo_aerial.json'
import swisstopoRasterStyle from '../assets/swisstopo_raster.json'
import toposvalbardStyle from '../assets/toposvalbard.json'
import partialSnowcoverDots from '../assets/partial-snowcover-dots.png'

export default {
  mixins: [api],
  mounted () {
    this.initialMapOptions = { ...this.mapOptions }
    this.updateMapTilerApiKey()
  },
  computed: {
    mapLanguage () {
      // Primary language subtag, e.g. 'ja' from 'ja-JP', 'en' from 'en-US'
      return navigator.language.split('-')[0]
    },
    mapStyle () {
      if (!this.mapTilerApiKey) {
        return null
      }

      // Cloud styles: return UUID string so MapLibre GL fetches them internally.
      // Language is applied post-load via applyLanguageToMap() in updateLayers().
      if (this.mapType === 'maptiler_outdoor') {
        if (this.$store.state.altitudeUnits === 'ft') {
          return 'dc9edd90-1320-4fa4-98ba-ad2d4efe5998'
        } else {
          return '3a0840d2-674e-4630-a70e-8fdb111259b9'
        }
      } else if (this.mapType === 'maptiler_winter') {
        if (this.$store.state.altitudeUnits === 'ft') {
          return 'f5400991-e3f4-4734-a941-6be8d26381e7'
        } else {
          return '5e862436-7ea7-4102-8b56-d35df3a11c07'
        }
      }

      // Local styles: deep clone and patch (no post-load flash)
      let style = JSON.parse(JSON.stringify(this.mapTypes[this.mapType].style))

      // Show/hide layers according to map options for initial render to save time
      style.layers.forEach(layer => {
        if (layer.metadata && layer.metadata['sotlas-map-option'] && this.initialMapOptions) {
          if (this.initialMapOptions[layer.metadata['sotlas-map-option']]) {
            layer.layout.visibility = 'visible'
          } else {
            layer.layout.visibility = 'none'
          }
        }
      })

      // Patch MapTiler key
      Object.values(style.sources).forEach(source => {
        if (source.url) {
          source.url = source.url.replace('{key}', this.mapTilerApiKey)
        }
      })
      style.glyphs = style.glyphs.replace('{key}', this.mapTilerApiKey)

      // Patch units for SOTLAS summit labels
      if (this.$store.state.altitudeUnits === 'ft') {
        style.layers.forEach(layer => {
          if (layer.id === 'summits_names') {
            layer.layout['text-field'] = ['concat', ['get', 'name'], '\n', ['get', 'code'], '\n', ['to-string', ['round', ['*', ['get', 'alt'], 3.28084]]], ' ft']
          } else if (layer.id === 'summits_inactive_names') {
            layer.layout['text-field'] = ['concat', ['get', 'name'], '\n', ['get', 'code'], '\n', ['to-string', ['round', ['*', ['get', 'alt'], 3.28084]]], ' ft\n(inactive)']
          }
        })
      }

      return this.applyLanguageToStyle(style)
    },
    mapType () {
      let mapType = this.$store.state.mapType
      if (!this.mapTypes[mapType]) {
        mapType = 'maptiler_outdoor'
      }
      return mapType
    },
    mapTilerApiKey () {
      return this.$store.state.mapTilerApiKey
    },
    mapUnits () {
      if (this.$store.state.altitudeUnits === 'ft') {
        return 'imperial'
      } else {
        return 'metric'
      }
    }
  },
  methods: {
    updateMapTilerApiKey () {
      if (this.$store.state.mapTilerApiKey || this.$store.state.mapTilerApiKeyLoading) {
        return
      }

      // If we are logged in via SSO, then there's no need for Turnstile
      if ((this.$keycloak && this.$keycloak.authenticated) || this.$store.state.turnstileToken) {
        this.$store.commit('setMapTilerApiKeyLoading', true)
        this.loadMapTilerApiKey(this.$store.state.turnstileToken)
          .then(response => {
            this.$store.commit('setMapTilerApiKey', response.mapTilerApiKey)
            if (this.$store.state.turnstileToken) {
              this.$store.commit('setTurnstileToken', null)
            }
            this.$store.commit('setMapTilerApiKeyLoading', false)
          })
          .catch(error => {
            console.error(error)
            this.mapTilerApiKeyFailed = true
            this.$store.commit('setMapTilerApiKeyLoading', false)
          })
      }
    },
    updateLayers (map) {
      if (!map) {
        return
      }

      // Show/hide layers according to map options
      map.getStyle().layers.forEach(layer => {
        if (layer.metadata && layer.metadata['sotlas-map-option']) {
          if (this.mapOptions[layer.metadata['sotlas-map-option']]) {
            map.setLayoutProperty(layer.id, 'visibility', 'visible')
          } else {
            map.setLayoutProperty(layer.id, 'visibility', 'none')
          }
        }
      })

      // For cloud styles, apply language patches via setLayoutProperty
      // (local styles are pre-patched in the mapStyle computed)
      const isCloudStyle = (this.mapType === 'maptiler_outdoor' || this.mapType === 'maptiler_winter')
      if (isCloudStyle) {
        this.applyLanguageToMap(map)
      }

      if (this.mapTypes[this.mapType].snow_depth) {
        if (this.mapOptions['snow_depth']) {
          if (!map.getSource('snowcover')) {
            map.addSource('snowcover', {
              type: 'geojson',
              data: 'https://snow-maps-hs.slf.ch/public/hs/map/HS1D-v2/current/geojson'
            })
            let snowcoverPattern = new Image()
            snowcoverPattern.src = partialSnowcoverDots
            snowcoverPattern.onload = () => {
              map.addImage('partial-snowcover-pattern', snowcoverPattern, {
                pixelRatio: 2
              })
              map.addLayer({
                id: 'snowcover-partial-background',
                type: 'fill',
                source: 'snowcover',
                filter: ['all', ['get', 'partialSnowCover'], ['==', ['get', 'value'], 1]],
                layout: {
                  'fill-sort-key': ['get', 'zIndex']
                },
                paint: {
                  'fill-color': ['get', 'fill'],
                  'fill-opacity': 1.0
                }
              }, 'scree_z17')
              map.addLayer({
                id: 'snowcover-partial',
                type: 'fill',
                source: 'snowcover',
                filter: ['all', ['get', 'partialSnowCover'], ['==', ['get', 'value'], 1]],
                layout: {
                  'fill-sort-key': ['get', 'zIndex']
                },
                paint: {
                  'fill-pattern': 'partial-snowcover-pattern',
                  'fill-opacity': 0.2
                }
              }, 'scree_z17')
              map.addLayer({
                id: 'snowcover',
                type: 'fill',
                source: 'snowcover',
                filter: ['any', ['!', ['get', 'partialSnowCover']], ['>', ['get', 'value'], 1]],
                layout: {
                  'fill-sort-key': ['get', 'zIndex']
                },
                paint: {
                  'fill-color': ['get', 'fill'],
                  'fill-opacity': 1.0
                }
              }, 'scree_z17')
            }
          } else {
            map.setLayoutProperty('snowcover-partial-background', 'visibility', 'visible')
            map.setLayoutProperty('snowcover-partial', 'visibility', 'visible')
            map.setLayoutProperty('snowcover', 'visibility', 'visible')
          }
          map.setLayoutProperty('water_polygon', 'visibility', 'none')
        } else {
          if (map.getLayer('snowcover')) {
            map.setLayoutProperty('snowcover-partial-background', 'visibility', 'none')
            map.setLayoutProperty('snowcover-partial', 'visibility', 'none')
            map.setLayoutProperty('snowcover', 'visibility', 'none')
          }
          if (map.getLayer('water_polygon')) {
            map.setLayoutProperty('water_polygon', 'visibility', 'visible')
          }
        }
      }
    },
    applyLanguageToMap (map) {
      const lang = this.mapLanguage
      map.getStyle().layers.forEach(layer => {
        if (!layer.layout || layer.layout['text-field'] === undefined) return
        if (layer.id && layer.id.startsWith('summit')) return
        if (layer.metadata && layer.metadata['sotlas-map-option']) return

        const textField = layer.layout['text-field']
        let patched
        if (typeof textField === 'string') {
          if (textField === '{name}' || textField === 'name') {
            patched = ['coalesce', ['get', `name:${lang}`], ['get', 'name']]
          }
        } else if (Array.isArray(textField)) {
          patched = this.patchLanguageExpression(textField, lang)
        }

        if (patched !== undefined && patched !== textField) {
          map.setLayoutProperty(layer.id, 'text-field', patched)
        }
      })
    },
    applyLanguageToStyle (style) {
      const lang = this.mapLanguage
      style.layers.forEach(layer => {
        if (!layer.layout || layer.layout['text-field'] === undefined) return
        if (layer.id && layer.id.startsWith('summit')) return
        if (layer.metadata && layer.metadata['sotlas-map-option']) return

        const textField = layer.layout['text-field']
        if (typeof textField === 'string') {
          if (textField === '{name}' || textField === 'name') {
            layer.layout['text-field'] = ['coalesce', ['get', `name:${lang}`], ['get', 'name']]
          }
        } else if (Array.isArray(textField)) {
          layer.layout['text-field'] = this.patchLanguageExpression(textField, lang)
        }
      })
      return style
    },
    patchLanguageExpression (expr, lang) {
      if (!Array.isArray(expr)) return expr

      // ["get", "name"] or ["get", "name:latin"] or ["get", "name:nonlatin"]
      // → ["coalesce", ["get", "name:XX"], ["get", "name"]]
      if (expr[0] === 'get' && expr.length === 2) {
        const field = expr[1]
        if (field === 'name' || field === 'name:latin' || field === 'name:nonlatin') {
          return ['coalesce', ['get', `name:${lang}`], ['get', 'name']]
        }
        return expr
      }

      const isNameGet = (e) => Array.isArray(e) && e.length === 2 && e[0] === 'get' &&
        typeof e[1] === 'string' &&
        (e[1] === 'name' || e[1] === 'name_int' || e[1].startsWith('name:'))

      // ["concat", ...]: collapse when it joins >=2 name references with no
      // structural non-name fields. Prevents the same name being rendered
      // twice (e.g. latin + nonlatin → "東京\n東京").
      if (expr[0] === 'concat') {
        let nameRefs = 0
        let otherNonStrings = 0
        for (let i = 1; i < expr.length; i++) {
          const arg = expr[i]
          if (isNameGet(arg)) {
            nameRefs++
          } else if (Array.isArray(arg)) {
            otherNonStrings++
          }
        }
        if (nameRefs >= 2 && otherNonStrings === 0) {
          return ['coalesce', ['get', `name:${lang}`], ['get', 'name']]
        }
      }

      // ["coalesce", ...]: if any arg references a name field (anywhere in
      // the list, not just first), replace the whole expression so the
      // user's language wins over name_int / name:latin / etc.
      if (expr[0] === 'coalesce') {
        for (let i = 1; i < expr.length; i++) {
          if (isNameGet(expr[i])) {
            return ['coalesce', ['get', `name:${lang}`], ['get', 'name']]
          }
        }
      }

      // Recurse into nested expressions
      return expr.map(item => Array.isArray(item) ? this.patchLanguageExpression(item, lang) : item)
    }
  },
  watch: {
    '$store.state.turnstileToken': {
      handler () {
        this.updateMapTilerApiKey()
      }
    }
  },
  data () {
    return {
      mapTypes: {
        'maptiler_outdoor': {
          name: 'MapTiler Outdoor',
          difficulty: true,
          contours: true,
          hillshading: true
        },
        'maptiler_winter': {
          name: 'MapTiler Winter',
          contours: true,
          hillshading: true
        },
        'swisstopo': {
          name: 'swisstopo (Vector)',
          difficulty: true,
          contours: true,
          hillshading: true,
          skiing: true,
          snowshoe: true,
          slope_classes: true,
          wildlife: true,
          snow_depth: true,
          style: swisstopoStyle
        },
        'swisstopo_raster': {
          name: 'swisstopo (Raster)',
          difficulty: true,
          skiing: true,
          snowshoe: true,
          slope_classes: true,
          wildlife: true,
          style: swisstopoRasterStyle
        },
        'swisstopo_aerial': {
          name: 'swisstopo (Aerial)',
          difficulty: true,
          skiing: true,
          snowshoe: true,
          slope_classes: true,
          wildlife: true,
          style: swisstopoAerialStyle
        },
        'basemapat': {
          name: 'basemap.at',
          style: basemapatStyle
        },
        'caltopo': {
          name: 'CalTopo',
          style: caltopoStyle
        },
        'toposvalbard': {
          name: 'TopoSvalbard',
          style: toposvalbardStyle
        },
        'norkart': {
          name: 'Kartverket.no',
          slope_classes: true,
          style: norkartStyle
        }
      },
      initialMapOptions: null,
      mapTilerApiKeyFailed: false
    }
  }
}
