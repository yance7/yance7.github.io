<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref } from 'vue'
import { getLocalizedAlbumSection, getLocalizedAlbums } from '../data/locales'
import { useLocale } from '../i18n'
import type { Album } from '../data/types'
import { albumCoverFallback, albumCoverSrcset, albumCoverWebp } from '../utils/albumMedia'
import { getAlbumNavigationIndex } from '../utils/albumNavigation'
import { loadImage } from '../utils/imagePreload'
import { useAlbumSpotlight } from '../composables/useAlbumSpotlight'
import SectionHeading from './SectionHeading.vue'

const { locale, messages } = useLocale()
const albums = getLocalizedAlbums(locale.value)
const section = getLocalizedAlbumSection(locale.value)
const total = albums.length
const spotlightSizes = '(min-width: 1180px) 36vw, (min-width: 768px) 42vw, 82vw'
const gridElement = ref<HTMLElement | null>(null)
const tileElements = ref<Array<HTMLButtonElement | null>>([])
let tiltFrame: number | null = null
let tiltElement: HTMLElement | null = null
let tiltClientX = 0
let tiltClientY = 0

const selectedAlbum = computed<Album>(() => albums[spotlight.state.value.selected]!)
const spotlightAlbum = computed<Album>(() => albums[spotlight.state.value.displayed]!)
const wallStyle = computed(() => ({
  '--album-primary': selectedAlbum.value.palette[0],
  '--album-secondary': selectedAlbum.value.palette[1]
}))
const selectedPosition = computed(() => `${formatIndex(spotlight.state.value.selected)} / ${String(total).padStart(2, '0')}`)
const liveAnnouncement = computed(() => (
  `${messages.value.albums.selected}: ${selectedAlbum.value.artist}, ${selectedAlbum.value.title}, ${selectedAlbum.value.year}, ${formatLabel(selectedAlbum.value)}`
))

function formatIndex(index: number) {
  return String(index + 1).padStart(2, '0')
}

function formatLabel(album: Album) {
  return album.format === 'ep' ? messages.value.albums.ep : messages.value.albums.album
}

function setTileRef(element: unknown, index: number) {
  tileElements.value[index] = element instanceof HTMLButtonElement ? element : null
}

function preloadImage(options: { src: string; srcset?: string; sizes?: string }) {
  return loadImage(options)
}

async function preloadSpotlight(album: Album) {
  return preloadImage({
    src: albumCoverFallback(album.cover),
    srcset: albumCoverSrcset(album.cover),
    sizes: spotlightSizes
  })
}

const spotlight = useAlbumSpotlight(total, (index) => preloadSpotlight(albums[index]!))
const spotlightState = spotlight.state

function selectAlbum(index: number, moveFocus = false) {
  const nextIndex = Math.min(Math.max(index, 0), total - 1)
  void spotlight.select(nextIndex)
  if (moveFocus) nextTick(() => tileElements.value[nextIndex]?.focus())
}

function moveAlbum(step: number) {
  const nextIndex = (spotlight.state.value.selected + step + total) % total
  selectAlbum(nextIndex)
}

function gridColumnCount() {
  if (!gridElement.value) return 1
  const columns = window.getComputedStyle(gridElement.value).gridTemplateColumns
  return Math.max(columns.trim().split(/\s+/).filter(Boolean).length, 1)
}

function onTileKeydown(event: KeyboardEvent, index: number) {
  if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
    event.preventDefault()
    selectAlbum(index)
    return
  }

  const nextIndex = getAlbumNavigationIndex({
    key: event.key,
    index,
    total,
    columns: gridColumnCount()
  })
  if (nextIndex === null) return
  event.preventDefault()
  selectAlbum(nextIndex, true)
}

function tiltSleeve(event: PointerEvent) {
  if (
    event.pointerType === 'touch'
    || !window.matchMedia('(hover: hover) and (pointer: fine)').matches
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) return

  tiltElement = event.currentTarget as HTMLElement
  tiltClientX = event.clientX
  tiltClientY = event.clientY
  if (tiltFrame !== null) return
  tiltFrame = window.requestAnimationFrame(() => {
    const sleeve = tiltElement
    tiltFrame = null
    if (!sleeve) return

    // Read geometry once, then write CSS variables in the same frame for the latest pointer event.
    const bounds = sleeve.getBoundingClientRect()
    const horizontal = Math.min(Math.max(((tiltClientX - bounds.left) / bounds.width) * 2 - 1, -1), 1)
    const vertical = Math.min(Math.max(((tiltClientY - bounds.top) / bounds.height) * 2 - 1, -1), 1)
    sleeve.style.setProperty('--tilt-x', `${(-vertical * 3).toFixed(2)}deg`)
    sleeve.style.setProperty('--tilt-y', `${(horizontal * 3).toFixed(2)}deg`)
  })
}

function resetSleeve(event: PointerEvent) {
  if (tiltFrame !== null) {
    window.cancelAnimationFrame(tiltFrame)
    tiltFrame = null
  }
  const sleeve = event.currentTarget as HTMLElement
  if (tiltElement === sleeve) tiltElement = null
  sleeve.style.removeProperty('--tilt-x')
  sleeve.style.removeProperty('--tilt-y')
}

onUnmounted(() => {
  if (tiltFrame !== null) window.cancelAnimationFrame(tiltFrame)
  tiltElement = null
})
</script>

<template>
  <section id="album-frequencies" class="album-wall-section content" :aria-label="messages.albums.collection">
    <SectionHeading
      no="02"
      :label="section.label"
      :title="`${total} ${section.title}`"
      :accent="section.accent"
      :copy="section.copy"
    />

    <div class="album-wall" :style="wallStyle" v-reveal>
      <div class="album-stage-layout">
        <div class="album-spotlight">
          <div class="album-spotlight-head">
            <span class="album-kicker">{{ messages.albums.nowSpinning }}</span>
            <span class="album-index">{{ selectedPosition }}</span>
          </div>

          <div class="album-spotlight-body">
            <div
              class="album-visual-slot"
              :aria-busy="spotlightState.status === 'loading'"
              :data-spotlight-state="spotlightState.status"
            >
              <div
                class="album-sleeve"
                @pointermove="tiltSleeve"
                @pointerleave="resetSleeve"
                @pointercancel="resetSleeve"
              >
                <div class="album-vinyl" aria-hidden="true">
                  <span></span>
                </div>
                <Transition name="album-switch">
                  <picture :key="spotlightAlbum.id" class="album-cover-frame">
                    <source
                      :srcset="albumCoverSrcset(spotlightAlbum.cover)"
                      :sizes="spotlightSizes"
                      type="image/webp"
                    >
                    <img
                      :src="albumCoverFallback(spotlightAlbum.cover)"
                      :alt="`${spotlightAlbum.artist} ${spotlightAlbum.title} ${messages.albums.album} ${messages.lightbox.posterAlt}`"
                      width="1200"
                      height="1200"
                      loading="eager"
                      :fetchpriority="spotlightState.displayed === 0 ? 'high' : 'auto'"
                      decoding="async"
                    >
                  </picture>
                </Transition>
              </div>
            </div>

            <div class="album-details">
              <p class="album-artist">{{ selectedAlbum.artist }}</p>
              <h3 class="album-title">{{ selectedAlbum.title }}</h3>
              <p class="album-meta">
                <span>{{ selectedAlbum.year }}</span>
                <span aria-hidden="true">·</span>
                <span>{{ formatLabel(selectedAlbum) }}</span>
              </p>

              <div class="album-actions">
                <div class="album-nav" :aria-label="messages.albums.navigation">
                  <button type="button" :aria-label="messages.albums.previous" @click="moveAlbum(-1)">
                    <span aria-hidden="true">←</span>
                  </button>
                  <button type="button" :aria-label="messages.albums.next" @click="moveAlbum(1)">
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
                <a
                  class="album-link"
                  :href="selectedAlbum.appleMusicUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>Apple Music</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div
          ref="gridElement"
          class="album-grid"
          role="listbox"
          :aria-label="messages.albums.select"
        >
          <button
            v-for="(album, index) in albums"
            :id="`album-option-${album.id}`"
            :key="album.id"
            :ref="(element) => setTileRef(element, index)"
            class="album-tile"
            :class="{ selected: spotlightState.selected === index }"
            type="button"
            role="option"
            :aria-label="`${album.title} ${album.artist} · ${album.year}, ${formatLabel(album)}`"
            :aria-selected="spotlightState.selected === index"
            :aria-setsize="total"
            :aria-posinset="index + 1"
            :data-album-id="album.id"
            :tabindex="spotlightState.selected === index ? 0 : -1"
            @click="selectAlbum(index)"
            @keydown="onTileKeydown($event, index)"
          >
            <picture>
              <source :srcset="albumCoverWebp(album.cover, 640)" type="image/webp">
              <img
                :src="albumCoverFallback(album.cover)"
                alt=""
                width="640"
                height="640"
                loading="lazy"
                decoding="async"
              >
            </picture>
            <span class="album-tile-meta" aria-hidden="true">
              <strong>{{ album.title }}</strong>
              <small>{{ album.artist }} · {{ album.year }}</small>
            </span>
            <span v-if="spotlightState.selected === index" class="album-tile-selected" aria-hidden="true">{{ messages.albums.selected }}</span>
          </button>
        </div>
      </div>

      <p class="album-live" aria-live="polite" aria-atomic="true">{{ liveAnnouncement }}</p>
    </div>
  </section>
</template>

<style scoped>
.album-wall-section {
  overflow: clip;
}

.album-wall {
  --stage-surface: var(--album-stage-surface);
  --stage-panel: var(--album-stage-panel);
  --stage-text: var(--album-stage-text);
  --stage-muted: var(--album-stage-muted);
  --stage-line: var(--album-stage-line);
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border: 1px solid var(--stage-line);
  border-radius: 28px;
  color: var(--stage-text);
  background:
    radial-gradient(circle at 17% 18%, color-mix(in srgb, var(--album-primary) 34%, transparent), transparent 34%),
    radial-gradient(circle at 82% 76%, color-mix(in srgb, var(--album-secondary) 24%, transparent), transparent 32%),
    var(--stage-surface);
  box-shadow: var(--album-stage-shadow);
  transition: background-color var(--dur-slow) var(--ease-soft), border-color var(--dur-slow) var(--ease-soft), color var(--dur-slow) var(--ease-soft);
}

.album-wall.reveal {
  transition:
    opacity var(--dur-base) var(--ease-out),
    transform var(--reveal-duration) var(--ease-out),
    background-color var(--dur-slow) var(--ease-soft),
    border-color var(--dur-slow) var(--ease-soft),
    color var(--dur-slow) var(--ease-soft);
}

.album-wall::before {
  position: absolute;
  inset: 0;
  z-index: -1;
  background-image:
    linear-gradient(var(--album-stage-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--album-stage-grid) 1px, transparent 1px);
  background-size: 42px 42px;
  content: '';
  pointer-events: none;
}

html[data-theme='light'] .album-wall {
  --stage-surface: var(--album-stage-surface);
  --stage-panel: var(--album-stage-panel);
  --stage-text: var(--album-stage-text);
  --stage-muted: var(--album-stage-muted);
  --stage-line: var(--album-stage-line);
  background:
    radial-gradient(circle at 17% 18%, color-mix(in srgb, var(--album-primary) 13%, transparent), transparent 36%),
    radial-gradient(circle at 82% 76%, color-mix(in srgb, var(--album-secondary) 11%, transparent), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, .7), transparent 56%),
    var(--stage-surface);
  box-shadow: var(--album-stage-shadow);
}

html[data-theme='dark'] .album-wall {
  --stage-surface: var(--album-stage-surface);
  --stage-panel: var(--album-stage-panel);
  --stage-text: var(--album-stage-text);
  --stage-muted: var(--album-stage-muted);
  --stage-line: var(--album-stage-line);
}

.album-stage-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 34px;
  padding: clamp(22px, 3.2vw, 44px);
}

.album-spotlight,
.album-grid,
.album-spotlight-body,
.album-visual-slot,
.album-details {
  min-width: 0;
}

.album-spotlight {
  display: flex;
  flex-direction: column;
  padding: clamp(18px, 2.2vw, 30px);
  border: 1px solid var(--stage-line);
  border-radius: 22px;
  background: var(--stage-panel);
  box-shadow: inset 0 1px var(--album-stage-inset);
}

.album-spotlight-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 22px;
  padding-bottom: 13px;
  border-bottom: 1px solid var(--stage-line);
  font-family: var(--mono);
  font-size: .68rem;
  letter-spacing: .14em;
}

.album-kicker {
  color: var(--album-kicker);
  font-weight: 700;
}

html[data-theme='light'] .album-kicker {
  color: var(--album-kicker);
}

.album-index {
  color: var(--stage-muted);
  font-variant-numeric: tabular-nums;
}

.album-spotlight-body {
  display: grid;
  align-items: center;
  gap: clamp(24px, 3vw, 38px);
}

.album-visual-slot {
  position: relative;
  width: calc(100% - 20px);
  max-width: 420px;
  aspect-ratio: 1;
}

.album-visual-slot::after {
  position: absolute;
  inset: 3%;
  z-index: 4;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  content: '';
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--dur-fast), border-color var(--dur-fast), box-shadow var(--dur-base);
}

.album-visual-slot[data-spotlight-state='loading']::after {
  border-color: color-mix(in srgb, var(--aqua) 38%, transparent);
  background:
    linear-gradient(90deg, transparent, color-mix(in srgb, var(--aqua) 78%, transparent), transparent) top / 100% 1px no-repeat,
    linear-gradient(90deg, transparent, color-mix(in srgb, var(--gold) 68%, transparent), transparent) bottom / 100% 1px no-repeat;
  animation: album-loading-pulse 1.2s ease-in-out infinite;
  opacity: 1;
}

.album-visual-slot[data-spotlight-state='error']::after {
  border-color: color-mix(in srgb, var(--danger) 72%, transparent);
  box-shadow: 0 0 18px color-mix(in srgb, var(--danger) 22%, transparent);
  opacity: .9;
}

@keyframes album-loading-pulse {
  0%, 100% { box-shadow: 0 0 0 color-mix(in srgb, var(--aqua) 0%, transparent); }
  50% { box-shadow: 0 0 18px color-mix(in srgb, var(--aqua) 22%, transparent); }
}

.album-sleeve {
  --tilt-x: 0deg;
  --tilt-y: 0deg;
  position: absolute;
  inset: 0;
  transform: perspective(900px) rotateX(var(--tilt-x)) rotateY(var(--tilt-y));
  transform-style: preserve-3d;
  transition: transform var(--dur-fast) var(--ease-out);
  will-change: transform;
}

.album-cover-frame {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: block;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--album-cover-ink) 20%, transparent);
  border-radius: 4px;
  background: var(--album-cover-surface);
  box-shadow: var(--album-cover-shadow);
  transform: translateZ(10px);
}

.album-cover-frame img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.album-vinyl {
  position: absolute;
  inset: 5% -8% 5% 14%;
  z-index: 1;
  overflow: hidden;
  border: 1px solid var(--album-cover-line);
  border-radius: 50%;
  background:
    radial-gradient(circle, var(--album-cover-accent) 0 3.8%, var(--album-cover-surface) 4.1% 9%, transparent 9.4%),
    repeating-radial-gradient(circle, var(--album-cover-groove) 0 1px, var(--album-cover-deep) 2px 4px);
  box-shadow: var(--shadow-2);
  transform: translateX(14px) rotate(3deg);
}

.album-vinyl::after {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: conic-gradient(from 30deg, transparent, var(--album-cover-sheen), transparent 18%, transparent 56%, color-mix(in srgb, var(--aqua) 8%, transparent), transparent 72%);
  content: '';
}

.album-vinyl span {
  position: absolute;
  inset: 43%;
  z-index: 1;
  border-radius: 50%;
  background: var(--album-cover-deep);
  box-shadow: 0 0 0 1px var(--album-cover-line);
}

.album-details {
  align-self: end;
  padding-top: 2px;
}

.album-artist,
.album-meta {
  margin: 0;
  color: var(--stage-muted);
  font-family: var(--mono);
  font-size: .72rem;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.album-title {
  margin: 8px 0 12px;
  color: var(--stage-text);
  font-family: var(--serif);
  font-size: clamp(2rem, 4.2vw, 4rem);
  font-weight: 700;
  line-height: 1.04;
  overflow-wrap: anywhere;
}

.album-meta {
  display: flex;
  gap: 8px;
  align-items: center;
}

.album-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
}

.album-nav {
  display: flex;
  gap: 8px;
}

.album-nav button,
.album-link {
  min-width: 44px;
  min-height: 44px;
  border: 1px solid var(--stage-line);
  border-radius: 999px;
  transition: transform var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-soft), border-color var(--dur-fast), box-shadow var(--dur-fast);
}

.album-nav button {
  display: grid;
  place-items: center;
  padding: 0;
  color: var(--stage-text);
  background: transparent;
  cursor: pointer;
}

.album-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 0 18px;
  color: var(--album-selected-ink);
  background: var(--album-selected-fill);
  font-family: var(--mono);
  font-size: .7rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-decoration: none;
  text-transform: uppercase;
}

.album-nav button:hover,
.album-nav button:focus-visible {
  border-color: var(--album-hover-border);
  background: var(--album-hover-surface);
  box-shadow: var(--interactive-shadow);
  transform: translateY(var(--motion-control-lift));
}

.album-link:hover,
.album-link:focus-visible {
  background: var(--album-action-hover);
  box-shadow: var(--interactive-shadow);
  transform: translateY(var(--motion-control-lift));
}

.album-nav button:active,
.album-link:active { transform: translateY(1px) scale(var(--motion-press-scale)); }

@media (hover: none), (pointer: coarse) {
  .album-nav button:hover {
    border-color: var(--stage-line);
    background: transparent;
    box-shadow: none;
    transform: none;
  }
  .album-link:hover {
    border-color: var(--album-selected-fill);
    background: var(--album-selected-fill);
    box-shadow: none;
    transform: none;
  }
}

.album-nav button:focus-visible,
.album-link:focus-visible,
.album-tile:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 3px;
  box-shadow: 0 0 0 4px var(--stage-surface);
}

.album-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  align-content: start;
  gap: clamp(8px, 1vw, 13px);
  content-visibility: auto;
  contain-intrinsic-size: auto 1400px;
}

.album-tile {
  position: relative;
  display: block;
  min-width: 0;
  aspect-ratio: 1;
  overflow: hidden;
  padding: 0;
  border: 1px solid var(--stage-line);
  border-radius: 8px;
  color: var(--album-cover-ink);
  background: var(--album-cover-surface);
  box-shadow: var(--shadow-1);
  cursor: pointer;
  transition: transform var(--dur-fast) var(--ease-out), border-color var(--dur-fast), box-shadow var(--dur-fast);
}

.album-tile picture,
.album-tile img {
  display: block;
  width: 100%;
  height: 100%;
}

.album-tile img {
  object-fit: cover;
  transition: filter var(--dur-fast), transform var(--dur-fast) var(--ease-out);
}

.album-tile-meta {
  position: absolute;
  inset: auto 0 0;
  z-index: 2;
  display: grid;
  gap: 2px;
  padding: 18px 8px 7px;
  background: linear-gradient(transparent, var(--album-cover-meta));
  opacity: 0;
  transform: translateY(4px);
  transition: opacity var(--dur-fast), transform var(--dur-fast) var(--ease-out);
  text-align: left;
}

.album-tile-meta strong,
.album-tile-meta small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.album-tile-meta strong {
  font-family: var(--serif);
  font-size: .72rem;
}

.album-tile-meta small {
  color: var(--album-cover-muted);
  font-family: var(--mono);
  font-size: .53rem;
}

.album-tile-selected {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 3;
  padding: 4px 6px;
  border: 1px solid color-mix(in srgb, var(--album-cover-ink) 72%, transparent);
  border-radius: 999px;
  color: var(--album-selected-ink);
  background: var(--album-selected-fill);
  font-family: var(--mono);
  font-size: .5rem;
  font-weight: 700;
  letter-spacing: .08em;
}

.album-tile.selected {
  border-color: var(--album-selected-fill);
  box-shadow: 0 0 0 2px var(--album-selected-fill), var(--shadow-2);
}

.album-tile.selected:focus-visible {
  box-shadow: var(--focus-ring), 0 0 0 2px var(--album-selected-fill), var(--shadow-2);
}

.album-tile.selected .album-tile-meta {
  opacity: 1;
  transform: none;
}

.album-live {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  margin: -1px;
  padding: 0;
  border: 0;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

.album-switch-enter-active,
.album-switch-leave-active {
  transition: opacity var(--dur-fast) var(--ease-out);
}

.album-switch-enter-from {
  opacity: 0;
}

.album-switch-leave-to {
  opacity: 0;
}

@media (hover: hover) and (pointer: fine) {
  .album-tile:hover {
    border-color: var(--album-hover-border);
    box-shadow: var(--interactive-shadow);
    transform: translateY(-3px);
  }

  .album-tile:hover img { transform: scale(1.03); }

  .album-tile:hover .album-tile-meta {
    opacity: 1;
    transform: none;
  }
}

@media (hover: none), (pointer: coarse) {
  .album-tile:hover {
    border-color: var(--stage-line);
    box-shadow: var(--shadow-1);
    transform: none;
  }

  .album-tile:hover img { transform: none; }
}

@media (min-width: 1180px) {
  .album-grid { contain-intrinsic-size: auto 680px; }

  .album-stage-layout {
    grid-template-columns: minmax(0, 42fr) minmax(0, 58fr);
    gap: clamp(28px, 3vw, 48px);
  }

  .album-spotlight-body {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (min-width: 768px) and (max-width: 1179px) {
  .album-grid { contain-intrinsic-size: auto 1760px; }

  .album-spotlight-body {
    grid-template-columns: minmax(220px, .85fr) minmax(0, 1fr);
  }
}

@media (max-width: 899px) {
  .album-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (min-width: 900px) and (max-width: 1179px) {
  .album-grid { contain-intrinsic-size: auto 1000px; }
}

@media (max-width: 767px) {
  .album-stage-layout {
    gap: 24px;
    padding: 18px;
  }

  .album-spotlight-body {
    grid-template-columns: minmax(0, 1fr);
  }

  .album-visual-slot {
    justify-self: center;
  }
}

@media (max-width: 480px) {
  .album-wall {
    border-radius: 20px;
  }

  .album-stage-layout {
    gap: 18px;
    padding: 12px;
  }

  .album-spotlight {
    padding: 14px;
    border-radius: 16px;
  }

  .album-spotlight-head {
    margin-bottom: 16px;
  }

  .album-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
    contain-intrinsic-size: auto 1500px;
  }

  .album-actions {
    align-items: stretch;
  }

  .album-link {
    flex: 1;
  }

  .album-tile {
    border-radius: 5px;
  }

  .album-tile-meta {
    padding: 14px 5px 5px;
  }

  .album-tile-meta strong {
    font-size: .62rem;
  }

  .album-tile-meta small {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .album-wall,
  .album-sleeve,
  .album-vinyl,
  .album-tile,
  .album-tile img,
  .album-tile-meta,
  .album-nav button,
  .album-link,
  .album-switch-enter-active,
  .album-switch-leave-active {
    animation: none !important;
    transition: none !important;
  }

  .album-sleeve,
  .album-tile,
  .album-tile-meta,
  .album-nav button:hover,
  .album-nav button:focus-visible,
  .album-link:hover,
  .album-link:focus-visible,
  .album-switch-enter-from,
  .album-switch-leave-to {
    transform: none !important;
  }

  .album-vinyl {
    transform: translateX(14px) rotate(3deg);
  }
  .album-visual-slot::after { animation: none !important; }
}

@media (forced-colors: active) {
  .album-tile.selected {
    border-color: Highlight;
    outline: 2px solid Highlight;
    outline-offset: 2px;
  }
  .album-tile:focus-visible,
  .album-nav button:focus-visible,
  .album-link:focus-visible { outline-color: Highlight; }
  .album-visual-slot[data-spotlight-state='error']::after { border-color: Mark; }
}
</style>
