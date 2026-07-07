<template>
  <div>
    <MglGeojsonLayer
      v-for="band in bands"
      :key="band"
      :sourceId="'terminator_' + band"
      :source="sources[band]"
      :layerId="'terminator_' + band"
      :layer="terminatorLayer"
      before="summits_selected"
    />
  </div>
</template>

<script>
import { MglGeojsonLayer } from 'vue-mapbox'
import { nightPolygon, DEPRESSION_ANGLES } from '../utils/terminator.js'
import nowticker from '../mixins/nowticker.js'

const BANDS = Object.keys(DEPRESSION_ANGLES)

export default {
  name: 'MapTerminator',
  components: {
    MglGeojsonLayer
  },
  mixins: [nowticker],
  data () {
    return {
      bands: BANDS,
      terminatorLayer: {
        type: 'fill',
        paint: {
          'fill-color': 'rgb(0, 0, 30)',
          'fill-opacity': 0.09,
          // ポリゴンは経度±180°で極点まわりに折り返して閉じるため、その2辺は地理的に
          // 同一の子午線上で重なる。fill-outline-colorを既定(fill-colorと同色)のままにすると
          // このアウトライン同士が重なって縦線状に見えてしまうため、透明にして無効化する。
          'fill-outline-color': 'rgba(0, 0, 0, 0)'
        }
      }
    }
  },
  computed: {
    sources () {
      const date = this.now.toDate()
      const sources = {}
      for (const band of this.bands) {
        sources[band] = {
          type: 'geojson',
          data: nightPolygon(date, DEPRESSION_ANGLES[band])
        }
      }
      return sources
    }
  }
}
</script>
