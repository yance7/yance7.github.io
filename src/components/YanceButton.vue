<script setup lang="ts">
import { computed } from 'vue'

export type YanceButtonVariant = 'primary' | 'secondary' | 'ghost' | 'quiet' | 'archive'
export type YanceButtonSize = 'sm' | 'md' | 'lg' | 'icon'

interface Props {
  href?: string
  target?: '_self' | '_blank'
  rel?: string
  type?: 'button' | 'submit' | 'reset'
  variant?: YanceButtonVariant
  size?: YanceButtonSize
  disabled?: boolean
  ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'button',
  variant: 'secondary',
  size: 'md',
  disabled: false
})

const tag = computed(() => props.href ? 'a' : 'button')

function preventDisabledLink(event: MouseEvent) {
  if (props.disabled && props.href) event.preventDefault()
}
</script>

<template>
  <component
    :is="tag"
    class="y-button"
    :class="[`y-button--${variant}`, `y-button--${size}`]"
    :href="href"
    :target="target"
    :rel="rel"
    :type="href ? undefined : type"
    :disabled="href ? undefined : disabled"
    :aria-label="ariaLabel"
    :aria-disabled="href && disabled ? 'true' : undefined"
    :tabindex="href && disabled ? -1 : undefined"
    @click="preventDisabledLink"
  >
    <span v-if="$slots.leading" class="y-button__leading" aria-hidden="true">
      <slot name="leading" />
    </span>
    <span class="y-button__label"><slot /></span>
    <span v-if="$slots.trailing" class="y-button__trailing" aria-hidden="true">
      <slot name="trailing" />
    </span>
  </component>
</template>
