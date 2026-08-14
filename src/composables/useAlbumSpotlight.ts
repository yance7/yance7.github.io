import { ref, type Ref } from 'vue'

type AlbumSpotlightStatus = 'ready' | 'loading' | 'error'

interface AlbumSpotlightState {
  selected: number
  displayed: number
  status: AlbumSpotlightStatus
}

export function useAlbumSpotlight(total: number, preload: (index: number) => Promise<boolean>) {
  const state: Ref<AlbumSpotlightState> = ref({
    selected: 0,
    displayed: 0,
    status: 'ready'
  })
  let requestToken = 0

  async function select(index: number) {
    const nextIndex = Math.min(Math.max(index, 0), Math.max(total - 1, 0))
    if (nextIndex === state.value.selected && state.value.status !== 'error') return

    const token = ++requestToken
    state.value = {
      ...state.value,
      selected: nextIndex,
      status: 'loading'
    }

    let loaded: boolean
    try {
      loaded = await preload(nextIndex)
    } catch {
      loaded = false
    }
    if (token !== requestToken) return

    state.value = {
      ...state.value,
      displayed: nextIndex,
      status: loaded ? 'ready' : 'error'
    }
  }

  return { state, select }
}
