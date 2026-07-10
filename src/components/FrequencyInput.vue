<template>
  <b-input class="freqinput" :model-value="modelValue" :disabled="disabled" type="number" inputmode="decimal" placeholder="MHz" lang="en_EN" step="any" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" required @update:model-value="updateValue" />
</template>

<script>
export default {
  props: {
    modelValue: String,
    disabled: Boolean
  },
  emits: ['update:modelValue'],
  methods: {
    updateValue (value) {
      this.$emit('update:modelValue', value)
    }
  }
}
</script>

<style scoped>
.freqinput :deep(input) {
  width: 10em;
}
</style>
