// Injection keys shared across src/mapgl components, mirroring the
// @indoorequal/vue-maplibre-gl contract (mapSymbol resolves right after map
// creation, before 'load', so MapDraw.vue can addControl() early).
export const mapSymbol = Symbol('map')
export const isLoadedSymbol = Symbol('isLoaded')
export const isInitializedSymbol = Symbol('isInitialized')
export const markerSymbol = Symbol('marker')
export const sourceIdSymbol = Symbol('sourceId')
export const sourceRefSymbol = Symbol('sourceRef')
export const sourceLayerRegistrySymbol = Symbol('sourceLayerRegistry')

// Tracks per-layer unmount handlers for a source, so a source can remove its
// child layers before removing itself. Needed because Vue runs a parent's
// beforeUnmount before its children's, which would otherwise try to remove a
// layer whose source is already gone.
export class SourceLayerRegistry {
  constructor () {
    this.unmountHandlers = new Map()
  }

  registerUnmountHandler (id, handler) {
    this.unmountHandlers.set(id, handler)
  }

  unregisterUnmountHandler (id) {
    this.unmountHandlers.delete(id)
  }

  unmount () {
    this.unmountHandlers.forEach(handler => handler())
  }
}
