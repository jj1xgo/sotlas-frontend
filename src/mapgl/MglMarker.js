import { defineComponent, h, inject, onBeforeUnmount, onMounted, provide, ref, shallowRef, watch } from 'vue'
import { Marker } from '@maptiler/sdk'
import { mapSymbol, markerSymbol } from './keys.js'

// Mirrors @indoorequal/vue-maplibre-gl's marker.component.ts: the default
// slot (used for a nested MglPopup) is only rendered once the marker is
// mounted, so markerSymbol has already resolved by the time the popup's
// setup() runs and calls marker.setPopup().
export default defineComponent({
  name: 'MglMarker',
  props: {
    coordinates: { type: [Object, Array], required: true }
  },
  setup (props, { slots }) {
    const map = inject(mapSymbol)
    const marker = shallowRef()
    const markerRoot = ref()
    const isMounted = ref(false)

    provide(markerSymbol, marker)

    onMounted(() => {
      const opts = {}
      if (slots.marker) opts.element = markerRoot.value
      marker.value = new Marker(opts)
      marker.value.setLngLat(props.coordinates).addTo(map.value)
      isMounted.value = true
    })

    watch(() => props.coordinates, v => marker.value?.setLngLat(v), { deep: true })

    onBeforeUnmount(() => marker.value?.remove())

    return () => [
      h('div', slots.default && isMounted.value ? slots.default() : undefined),
      h('div', { ref: markerRoot }, slots.marker ? slots.marker() : undefined)
    ]
  }
})
