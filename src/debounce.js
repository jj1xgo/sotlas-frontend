// Minimal replacement for vue2-debounce's `debounce` export (Vue 2-only package).
// Framework-agnostic: setTimeout/clearTimeout only, no Vue APIs involved.
export function debounce (fn, wait) {
  let timer = null
  function debounced (...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), wait)
  }
  debounced.cancel = () => clearTimeout(timer)
  return debounced
}
