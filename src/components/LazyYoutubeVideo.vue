<template>
  <div class="lazy-youtube" @click="playing = true">
    <iframe v-if="playing" :src="src + '?autoplay=1'" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="y-video" />
    <div v-else class="y-video-preview" :style="{ backgroundImage: 'url(' + previewImageUrl + ')' }">
      <div class="y-video-play-button" />
    </div>
  </div>
</template>

<script>
// Minimal Vue 3-native replacement for vue-lazy-youtube-video (Vue 2-only,
// imports a removed Vue default export and can't run under Vue 3).
export default {
  name: 'LazyYoutubeVideo',
  props: {
    src: String,
    previewImageSize: {
      type: String,
      default: 'hqdefault'
    }
  },
  data () {
    return {
      playing: false
    }
  },
  computed: {
    videoId () {
      let matches = /\/embed\/([\w-]+)/.exec(this.src)
      return matches ? matches[1] : null
    },
    previewImageUrl () {
      return 'https://i.ytimg.com/vi/' + this.videoId + '/' + this.previewImageSize + '.jpg'
    }
  }
}
</script>

<style scoped>
.lazy-youtube {
  position: relative;
  cursor: pointer;
}
.y-video {
  width: 100%;
  height: 100%;
  aspect-ratio: 16 / 9;
}
.y-video-preview {
  width: 100%;
  aspect-ratio: 16 / 9;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
}
.y-video-play-button {
  width: 68px;
  height: 48px;
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 10px;
  position: relative;
}
.y-video-play-button::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 54%;
  transform: translate(-50%, -50%);
  border-style: solid;
  border-width: 12px 0 12px 20px;
  border-color: transparent transparent transparent #fff;
}
</style>
