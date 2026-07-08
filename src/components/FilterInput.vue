<template>
  <b-input :model-value="modelValue" ref="filter" :placeholder="placeholder" type="search" icon-pack="far" icon="search" :class="{ filter: true, invalid }" :size="size" rounded @update:model-value="updateValue" />
</template>

<script>
export default {
  name: 'FilterInput',
  props: {
    modelValue: String,
    size: String,
    placeholder: {
      type: String,
      default: 'Filter'
    },
    isRegex: Boolean
  },
  emits: ['update:modelValue'],
  computed: {
    invalid () {
      if (!this.isRegex) {
        return false
      }

      try {
        RegExp(this.modelValue)
        return false
      } catch (e) {
        return true
      }
    }
  },
  methods: {
    updateValue (value) {
      this.$emit('update:modelValue', value)
    },
    focus () {
      this.$refs.filter.focus()
    }
  }
}
</script>

<style scoped>
.filter {
  max-width: 20em;
}
.filter.invalid :deep(input) {
  background-color: #ffeeee;
}
</style>
