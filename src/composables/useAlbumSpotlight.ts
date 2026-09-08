import { ref, type Ref } from 'vue'

type AlbumSpotlightStatus = 'ready' | 'loading' | 'error'

interface AlbumSpotlightState {
  selected: number
  displayed: number
  status: AlbumSpotlightStatus
}

type AlbumPreload = (index: number, signal: AbortSignal) => Promise<boolean>

export function useAlbumSpotlight(total: number, preload: AlbumPreload) {
  const state: Ref<AlbumSpotlightState> = ref({
    selected: 0,
    displayed: 0,
    status: 'ready'
  })
  const successfulSelections = new Set<number>()
  let requestToken = 0
  let activeController: AbortController | null = null

  async function select(index: number) {
    const nextIndex = Math.min(Math.max(index, 0), Math.max(total - 1, 0))
    if (nextIndex === state.value.selected && state.value.status !== 'error') return

    const token = ++requestToken
    activeController?.abort()
    const controller = new AbortController()
    activeController = controller
    state.value = {
      ...state.value,
      selected: nextIndex,
      status: 'loading'
    }

    let loaded = successfulSelections.has(nextIndex)
    if (!loaded) {
      try {
        loaded = await preload(nextIndex, controller.signal)
      } catch {
        loaded = false
      }
    }
    // Only the newest selection may commit displayed/status after image decoding settles.
    if (token !== requestToken || controller.signal.aborted) return

    if (loaded) successfulSelections.add(nextIndex)
    if (activeController === controller) activeController = null

    state.value = {
      ...state.value,
      displayed: loaded ? nextIndex : state.value.displayed,
      status: loaded ? 'ready' : 'error'
    }
  }

  function cancel() {
    requestToken += 1
    activeController?.abort()
    activeController = null
  }

  return { state, select, cancel }
}
