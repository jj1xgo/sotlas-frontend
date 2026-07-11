import { defineComponent, inject, onBeforeUnmount, watch } from 'vue'
import { AttributionControl, GeolocateControl, NavigationControl, ScaleControl } from '@maptiler/sdk'
import { isInitializedSymbol, mapSymbol } from './keys.js'

// @indoorequal/vue-maplibre-gl's useControl only evaluates props once at
// creation (no prop watcher besides position), which is why SOTLAS had to
// work around AttributionControl's compact mode with a `:key="$mq.mobile"`
// remount. Here we watch the full props object and remove+recreate the
// control on any change, so callers don't need that workaround.
function useControl (createControl, props) {
  const map = inject(mapSymbol)
  const isInitialized = inject(isInitializedSymbol)
  let control

  function add () {
    control = createControl()
    map.value.addControl(control, props.position)
  }

  function remove () {
    if (isInitialized.value && control) {
      map.value.removeControl(control)
    }
  }

  add()

  watch(() => ({ ...props }), () => {
    remove()
    add()
  }, { deep: true })

  onBeforeUnmount(remove)
}

export const MglNavigationControl = defineComponent({
  name: 'MglNavigationControl',
  props: {
    position: { type: String, default: undefined },
    showCompass: { type: Boolean, default: true }
  },
  setup (props) {
    useControl(() => new NavigationControl({ showCompass: props.showCompass }), props)
  },
  render () {
    return null
  }
})

export const MglGeolocateControl = defineComponent({
  name: 'MglGeolocateControl',
  props: {
    position: { type: String, default: 'top-right' },
    positionOptions: { type: Object, default: () => ({ enableHighAccuracy: false, timeout: 6000 }) },
    fitBoundsOptions: { type: Object, default: () => ({ maxZoom: 15 }) },
    trackUserLocation: { type: Boolean, default: false }
  },
  setup (props) {
    useControl(() => new GeolocateControl({
      positionOptions: props.positionOptions,
      fitBoundsOptions: props.fitBoundsOptions,
      trackUserLocation: props.trackUserLocation
    }), props)
  },
  render () {
    return null
  }
})

export const MglScaleControl = defineComponent({
  name: 'MglScaleControl',
  props: {
    position: { type: String, default: undefined },
    unit: { type: String, default: 'metric' }
  },
  setup (props) {
    useControl(() => new ScaleControl({ unit: props.unit }), props)
  },
  render () {
    return null
  }
})

export const MglAttributionControl = defineComponent({
  name: 'MglAttributionControl',
  props: {
    position: { type: String, default: undefined },
    compact: { type: Boolean, default: undefined }
  },
  setup (props) {
    useControl(() => new AttributionControl({ compact: props.compact }), props)
  },
  render () {
    return null
  }
})
