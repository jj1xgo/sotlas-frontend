// Minimal replacement for vue-native-websocket (Vue 2-only, relies on Vue.use/Vue.mixin).
// The app never used the plugin surface ($socket/$connect/sockets component option) —
// only the SOCKET_* mutation convention on the store, so this reproduces just that:
// connect, forward events as SOCKET_* commits, and auto-reconnect on close.
export function connectWebSocket (url, store, { reconnectionDelay = 1000 } = {}) {
  let reconnectionCount = 0

  function connect () {
    const ws = new WebSocket(url)
    // Matches the `format: 'json'` option of vue-native-websocket; SOCKET_ONOPEN
    // and setRbnFilter call sendObj() on the WebSocket instance itself.
    ws.sendObj = (obj) => ws.send(JSON.stringify(obj))

    ws.onopen = (event) => {
      reconnectionCount = 0
      store.commit('SOCKET_ONOPEN', event)
    }
    ws.onerror = (event) => {
      store.commit('SOCKET_ONERROR', event)
    }
    ws.onmessage = (event) => {
      store.commit('SOCKET_ONMESSAGE', JSON.parse(event.data))
    }
    ws.onclose = (event) => {
      store.commit('SOCKET_ONCLOSE', event)
      // Reconnect unconditionally, same as the original reconnection:true/reconnectionAttempts:Infinity.
      reconnectionCount++
      setTimeout(() => {
        store.commit('SOCKET_RECONNECT', reconnectionCount)
        connect()
      }, reconnectionDelay)
    }
  }

  connect()
}
