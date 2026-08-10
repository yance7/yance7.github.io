<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref } from 'vue'
import { albums } from '../data'
import type { Album } from '../data/types'
import { albumCoverFallback, albumCoverSrcset, albumCoverWebp } from '../utils/albumMedia'
import SectionHeading from './SectionHeading.vue'

const total = albums.length
const selectedIndex = ref(0)
const gridElement = ref<HTMLElement | null>(null)
const tileElements = ref<Array<HTMLButtonElement | null>>([])
let tiltFrame: number | null = null

const selectedAlbum = computed<Album>(() => albums[selectedIndex.value]!)
const wallStyle = computed(() => ({
  '--album-primary': selectedAlbum.value.palette[0],
  '--album-secondary': selectedAlbum.value.palette[1]
}))
const selectedPosition = computed(() => `${formatIndex(selectedIndex.value)} / ${String(total).padStart(2, '0')}`)
const liveAnnouncement = computed(() => (
  `已选择 ${selectedAlbum.value.artist}，《${selectedAlbum.value.title}》，${selectedAlbum.value.year} 年，${formatLabel(selectedAlbum.value)}`
))

function formatIndex(index: number) {
  return String(index + 1).padStart(2, '0')
}

function formatLabel(album: Album) {
  return album.format === 'ep' ? 'EP' : 'ALBUM'
}

function setTileRef(element: unknown, index: number) {
  tileElements.value[index] = element as HTMLButtonElement | null
}

function preloadSpotlight(album: Album) {
  const image = new Image()
  image.decoding = 'async'
  image.src = albumCoverWebp(album.cover, 1200)
}

function selectAlbum(index: number, moveFocus = false) {
  const nextIndex = Math.min(Math.max(index, 0), total - 1)
  if (nextIndex !== selectedIndex.value) {
    selectedIndex.value = nextIndex
    preloadSpotlight(albums[nextIndex]!)
  }
  if (moveFocus) nextTick(() => tileElements.value[nextIndex]?.focus())
}

function moveAlbum(step: number) {
  const nextIndex = (selectedIndex.value + step + total) % total
  selectAlbum(nextIndex)
}

function gridColumnCount() {
  if (!gridElement.value) return 1
  const columns = window.getComputedStyle(gridElement.value).gridTemplateColumns
  return Math.max(columns.trim().split(/\s+/).filter(Boolean).length, 1)
}

function onTileKeydown(event: KeyboardEvent, index: number) {
  let nextIndex: number | null = null
  if (event.key === 'ArrowLeft') nextIndex = index - 1
  else if (event.key === 'ArrowRight') nextIndex = index + 1
  else if (event.key === 'ArrowUp') nextIndex = index - gridColumnCount()
  else if (event.key === 'ArrowDown') nextIndex = index + gridColumnCount()
  else if (event.key === 'Home') nextIndex = 0
  else if (event.key === 'End') nextIndex = total - 1
  else if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
    event.preventDefault()
    selectAlbum(index)
    return
  }

  if (nextIndex === null) return
  event.preventDefault()
  selectAlbum(Math.min(Math.max(nextIndex, 0), total - 1), true)
}

function tiltSleeve(event: PointerEvent) {
  if (
    event.pointerType === 'touch'
    || !window.matchMedia('(pointer: fine)').matches
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) return

  const sleeve = event.currentTarget as HTMLElement
  const bounds = sleeve.getBoundingClientRect()
  const horizontal = Math.min(Math.max(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -1), 1)
  const vertical = Math.min(Math.max(((event.clientY - bounds.top) / bounds.height) * 2 - 1, -1), 1)

  if (tiltFrame !== null) window.cancelAnimationFrame(tiltFrame)
  tiltFrame = window.requestAnimationFrame(() => {
    sleeve.style.setProperty('--tilt-x', `${(-vertical * 3).toFixed(2)}deg`)
    sleeve.style.setProperty('--tilt-y', `${(horizontal * 3).toFixed(2)}deg`)
    tiltFrame = null
  })
}

function resetSleeve(event: PointerEvent) {
  if (tiltFrame !== null) {
    window.cancelAnimationFrame(tiltFrame)
    tiltFrame = null
  }
  const sleeve = event.currentTarget as HTMLElement
  sleeve.style.removeProperty('--tilt-x')
  sleeve.style.removeProperty('--tilt-y')
}

onUnmounted(() => {
  if (tiltFrame !== null) window.cancelAnimationFrame(tiltFrame)
})
</script>

<template>
  <section class="album-wall-section content" aria-label="专辑收藏墙">
    <SectionHeading
      no="02"
      label="ALBUM FREQUENCIES"
      title="二十四张唱片，"
      accent="八种声音坐标。"
      copy="把熟悉的封面排进同一面墙，在一次次选择里重访华语流行的不同年代。"
    />

    <div class="album-wall" :style="wallStyle">
      <div class="album-stage-layout">
        <div class="album-spotlight">
          <div class="album-spotlight-head">
            <span class="album-kicker">NOW SPINNING</span>
            <span class="album-index">{{ selectedPosition }}</span>
          </div>

          <Transition name="album-switch" mode="out-in">
            <div :key="selectedAlbum.id" class="album-spotlight-body">
              <div
                class="album-sleeve"
                @pointermove="tiltSleeve"
                @pointerleave="resetSleeve"
                @pointercancel="resetSleeve"
              >
                <div class="album-vinyl" aria-hidden="true">
                  <span></span>
                </div>
                <picture class="album-cover-frame">
                  <source
                    :srcset="albumCoverSrcset(selectedAlbum.cover)"
                    sizes="(min-width: 1180px) 36vw, (min-width: 768px) 42vw, 82vw"
                    type="image/webp"
                  >
                  <img
                    :src="albumCoverFallback(selectedAlbum.cover)"
                    :alt="`${selectedAlbum.artist}《${selectedAlbum.title}》专辑封面`"
                    width="1200"
                    height="1200"
                    loading="eager"
                    :fetchpriority="selectedIndex === 0 ? 'high' : 'auto'"
                    decoding="async"
                  >
                </picture>
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
                  <div class="album-nav" aria-label="专辑切换控制">
                    <button type="button" aria-label="上一张专辑" @click="moveAlbum(-1)">
                      <span aria-hidden="true">←</span>
                    </button>
                    <button type="button" aria-label="下一张专辑" @click="moveAlbum(1)">
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
          </Transition>
        </div>

        <div
          ref="gridElement"
          class="album-grid"
          role="listbox"
          aria-label="选择一张专辑"
        >
          <button
            v-for="(album, index) in albums"
            :id="`album-option-${album.id}`"
            :key="album.id"
            :ref="(element) => setTileRef(element, index)"
            class="album-tile"
            :class="{ selected: selectedIndex === index }"
            type="button"
            role="option"
            :aria-label="`${album.artist}《${album.title}》，${album.year} 年，${formatLabel(album)}`"
            :aria-selected="selectedIndex === index"
            :data-album-id="album.id"
            :tabindex="selectedIndex === index ? 0 : -1"
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
            <span v-if="selectedIndex === index" class="album-tile-selected" aria-hidden="true">NOW</span>
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
  --stage-surface: #0b0c10;
  --stage-panel: rgba(19, 22, 29, .88);
  --stage-text: #f5f3ee;
  --stage-muted: rgba(245, 243, 238, .68);
  --stage-line: rgba(245, 243, 238, .18);
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
  box-shadow: 0 30px 80px rgba(2, 6, 12, .18);
  transition: background-color 520ms ease, border-color 520ms ease, color 520ms ease;
}

.album-wall::before {
  position: absolute;
  inset: 0;
  z-index: -1;
  background-image:
    linear-gradient(rgba(255, 255, 255, .025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, .025) 1px, transparent 1px);
  background-size: 42px 42px;
  content: '';
  pointer-events: none;
}

:global([data-theme='light']) .album-wall {
  --stage-surface: #f5f3ee;
  --stage-panel: rgba(255, 255, 255, .72);
  --stage-text: #17191d;
  --stage-muted: #5d6067;
  --stage-line: rgba(34, 31, 27, .18);
  background:
    radial-gradient(circle at 17% 18%, color-mix(in srgb, var(--album-primary) 13%, transparent), transparent 36%),
    radial-gradient(circle at 82% 76%, color-mix(in srgb, var(--album-secondary) 11%, transparent), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, .7), transparent 56%),
    var(--stage-surface);
  box-shadow: 0 28px 70px rgba(68, 53, 33, .12);
}

:global([data-theme='dark']) .album-wall {
  --stage-surface: #0b1016;
  --stage-panel: rgba(13, 17, 24, .82);
  --stage-text: #f5f3ee;
  --stage-muted: rgba(245, 243, 238, .68);
  --stage-line: rgba(212, 165, 78, .22);
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
  box-shadow: inset 0 1px rgba(255, 255, 255, .08);
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
  color: #4ed7d1;
  font-weight: 700;
}

:global([data-theme='light']) .album-kicker {
  color: #256d69;
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

.album-sleeve {
  --tilt-x: 0deg;
  --tilt-y: 0deg;
  position: relative;
  width: calc(100% - 20px);
  max-width: 420px;
  aspect-ratio: 1;
  transform: perspective(900px) rotateX(var(--tilt-x)) rotateY(var(--tilt-y));
  transform-style: preserve-3d;
  transition: transform 180ms ease-out;
  will-change: transform;
}

.album-cover-frame {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: block;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, .22);
  border-radius: 4px;
  background: #17191d;
  box-shadow: 0 24px 42px rgba(0, 0, 0, .32), 0 3px 9px rgba(0, 0, 0, .2);
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
  border: 1px solid rgba(255, 255, 255, .16);
  border-radius: 50%;
  background:
    radial-gradient(circle, #d4a54e 0 3.8%, #17191d 4.1% 9%, transparent 9.4%),
    repeating-radial-gradient(circle, #22252a 0 1px, #0b0c10 2px 4px);
  box-shadow: 12px 16px 30px rgba(0, 0, 0, .38);
  transform: translateX(14px) rotate(3deg);
  animation: vinyl-cue 420ms ease-out both;
}

.album-vinyl::after {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: conic-gradient(from 30deg, transparent, rgba(255, 255, 255, .09), transparent 18%, transparent 56%, rgba(78, 215, 209, .08), transparent 72%);
  content: '';
}

.album-vinyl span {
  position: absolute;
  inset: 43%;
  z-index: 1;
  border-radius: 50%;
  background: #0b0c10;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, .16);
}

@keyframes vinyl-cue {
  0% { transform: translateX(0) rotate(-3deg); }
  64% { transform: translateX(18px) rotate(5deg); }
  100% { transform: translateX(14px) rotate(3deg); }
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
  color: #0b0c10;
  background: #d4a54e;
  font-family: var(--mono);
  font-size: .7rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-decoration: none;
  text-transform: uppercase;
}

.album-nav button:hover,
.album-nav button:focus-visible {
  border-color: #4ed7d1;
  background: rgba(78, 215, 209, .12);
}

.album-link:hover,
.album-link:focus-visible {
  background: #e5bd70;
}

.album-nav button:focus-visible,
.album-link:focus-visible,
.album-tile:focus-visible {
  outline: 3px solid #4ed7d1;
  outline-offset: 3px;
}

.album-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  align-content: start;
  gap: clamp(8px, 1vw, 13px);
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
  color: #f5f3ee;
  background: #17191d;
  box-shadow: 0 8px 18px rgba(0, 0, 0, .16);
  cursor: pointer;
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}

.album-tile picture,
.album-tile img {
  display: block;
  width: 100%;
  height: 100%;
}

.album-tile img {
  object-fit: cover;
  transition: filter 180ms ease;
}

.album-tile-meta {
  position: absolute;
  inset: auto 0 0;
  z-index: 2;
  display: grid;
  gap: 2px;
  padding: 18px 8px 7px;
  background: linear-gradient(transparent, rgba(4, 6, 10, .92));
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 180ms ease, transform 180ms ease;
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
  color: rgba(245, 243, 238, .72);
  font-family: var(--mono);
  font-size: .53rem;
}

.album-tile-selected {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 3;
  padding: 4px 6px;
  border: 1px solid rgba(255, 255, 255, .72);
  border-radius: 999px;
  color: #0b0c10;
  background: #d4a54e;
  font-family: var(--mono);
  font-size: .5rem;
  font-weight: 700;
  letter-spacing: .08em;
}

.album-tile.selected {
  border-color: #d4a54e;
  box-shadow: 0 0 0 2px #d4a54e, 0 12px 24px rgba(0, 0, 0, .28);
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
  transition: opacity 240ms ease, transform 240ms ease;
}

.album-switch-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(.985);
}

.album-switch-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(.99);
}

@media (hover: hover) and (pointer: fine) {
  .album-tile:hover {
    border-color: rgba(78, 215, 209, .72);
    box-shadow: 0 12px 24px rgba(0, 0, 0, .25);
    transform: translateY(-3px);
  }

  .album-tile:hover .album-tile-meta {
    opacity: 1;
    transform: none;
  }
}

@media (min-width: 1180px) {
  .album-stage-layout {
    grid-template-columns: minmax(0, 42fr) minmax(0, 58fr);
    gap: clamp(28px, 3vw, 48px);
  }

  .album-spotlight-body {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (min-width: 768px) and (max-width: 1179px) {
  .album-spotlight-body {
    grid-template-columns: minmax(220px, .85fr) minmax(0, 1fr);
  }
}

@media (max-width: 899px) {
  .album-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .album-stage-layout {
    gap: 24px;
    padding: 18px;
  }

  .album-spotlight-body {
    grid-template-columns: minmax(0, 1fr);
  }

  .album-sleeve {
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
  .album-switch-enter-active,
  .album-switch-leave-active {
    animation: none !important;
    transition: none !important;
  }

  .album-sleeve,
  .album-tile,
  .album-tile-meta,
  .album-switch-enter-from,
  .album-switch-leave-to {
    transform: none !important;
  }

  .album-vinyl {
    transform: translateX(14px) rotate(3deg);
  }
}
</style>
