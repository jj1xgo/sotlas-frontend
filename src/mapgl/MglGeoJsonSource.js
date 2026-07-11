import { defineComponent, inject, onBeforeUnmount, provide, shallowRef, watch } from 'vue'
import { isLoadedSymbol, mapSymbol, sourceIdSymbol, sourceLayerRegistrySymbol, sourceRefSymbol, SourceLayerRegistry } from './keys.js'

// Re-adds the source on every 'style.load' (i.e. after MglMap#setStyle),
// since setStyle wipes all sources/layers. Layers watch `source` (provided
// via sourceRefSymbol) and re-addLayer whenever it points to a fresh
// GeoJSONSource instance. See src/mapgl/README.md.
export default defineComponent({
  name: 'MglGeoJsonSource',
  props: {
    sourceId: { type: String, required: true },
    data: { type: [Object, String], required: true }
  },
  setup (props, { slots }) {
    const map = inject(mapSymbol)
    const isLoaded = inject(isLoadedSymbol)
    const source = shallowRef()
    const registry = new SourceLayerRegistry()

    provide(sourceIdSymbol, props.sourceId)
    provide(sourceRefSymbol, source)
    provide(sourceLayerRegistrySymbol, registry)

    function addSource () {
      if (!isLoaded.value) return
      map.value.addSource(props.sourceId, { type: 'geojson', data: props.data })
      source.value = map.value.getSource(props.sourceId)
    }

    watch(isLoaded, addSource, { immediate: true })
    map.value.on('style.load', addSource)

    watch(() => props.data, data => {
      source.value?.setData(data)
    })

    onBeforeUnmount(() => {
      map.value.off('style.load', addSource)
      if (isLoaded.value) {
        registry.unmount()
        if (map.value.getSource(props.sourceId)) {
          map.value.removeSource(props.sourceId)
        }
      }
    })

    return () => source.value && slots.default ? slots.default() : null
  }
})
