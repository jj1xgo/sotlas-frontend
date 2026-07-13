import { defineComponent, h, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Popup } from '@maptiler/sdk'
import { mapSymbol, markerSymbol } from './keys.js'

// Mirrors @indoorequal/vue-maplibre-gl's popup.component.ts: the default
// slot is rendered into a plain div immediately, and once mounted the DOM
// node is handed to maplibre via setDOMContent(). maplibre physically moves
// the node into the popup container, but it stays under Vue's vnode tree,
// so reactivity inside the slot keeps working.
export default defineComponent({
  name: 'MglPopup',
  emits: ['open', 'close'],
  props: {
    coordinates: { type: [Object, Array], default: undefined },
    closeButton: { type: Boolean, default: true },
    closeOnClick: { type: Boolean, default: true },
    focusAfterOpen: { type: Boolean, default: true },
    anchor: { type: String, default: undefined },
    offset: { type: [Number, Object, Array], default: undefined },
    maxWidth: { type: String, default: '240px' }
  },
  setup (props, { slots, emit }) {
    const map = inject(mapSymbol)
    const marker = inject(markerSymbol, undefined)
    const root = ref()

    const popup = new Popup(props)

    if (marker && marker.value) {
      marker.value.setPopup(popup)
    } else if (props.coordinates && map) {
      popup.setLngLat(props.coordinates).addTo(map.value)
    }

    popup.on('open', () => emit('open'))
    popup.on('close', () => emit('close'))

    watch(() => props.coordinates, v => {
      if (v) popup.setLngLat(v)
    }, { deep: true })
    watch(() => props.offset, v => popup.setOffset(v))
    watch(() => props.maxWidth, v => popup.setMaxWidth(v))

    onMounted(() => {
      if (root.value) popup.setDOMContent(root.value)
    })

    onBeforeUnmount(() => popup.remove())

    return () => h('div', { ref: root }, slots.default ? slots.default() : undefined)
  }
})
