<script lang="ts">
  import { onMount } from 'svelte'
  import type { MediaDevice } from '../../types/MediaDevice'
  import EmitterAudioReceiver from './components/Emitter/EmitterAudioReceiver.svelte'
  import EmitterDeviceSelector from './components/Emitter/EmitterDeviceSelector.svelte'
  import EmitterStreamingControls from './components/Emitter/EmitterStreamingControls.svelte'

  let outputDevices = $state<MediaDevice[]>([])
  let selectedDeviceId = $state<string>('')

  let error = $state<string | null>(null)

  // Estados de streaming en vivo
  let isStreaming = $state<boolean>(false)

  // Estados para recibir audio del receptor
  let receiverAudioStream = $state<MediaStream | null>(null)
  let receiverAudioElement = $state<HTMLAudioElement | null>(null)
  let selectedReceiverOutputDeviceId = $state<string>('default')
  let isPlayingReceiverAudio = $state<boolean>(false)

  // Signaling URL configuration
  const STORAGE_KEY = 'signaling_url'
  let signalingURL = $state<string>('http://localhost:8080')
  let showSignalingURLInput = $state<boolean>(false)

  async function changeReceiverOutputDevice(): Promise<void> {
    if (!receiverAudioElement) return

    try {
      // setSinkId allows changing the output device
      if (typeof receiverAudioElement.setSinkId === 'function') {
        await receiverAudioElement.setSinkId(selectedReceiverOutputDeviceId)
        console.log('Receiver audio output device changed to:', selectedReceiverOutputDeviceId)
      } else {
        console.warn('setSinkId not supported in this browser')
      }
    } catch (err) {
      console.error('Error changing receiver audio output device:', err)
      error = err instanceof Error ? err.message : 'Error changing device'
    }
  }

  onMount(() => {
    // Load signaling URL from localStorage
    const savedURL = localStorage.getItem(STORAGE_KEY)
    if (savedURL) {
      signalingURL = savedURL
    }
  })

  function handleSignalingURLChange(): void {
    localStorage.setItem(STORAGE_KEY, signalingURL)
  }
</script>

<div
  class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4 sm:p-8 relative overflow-hidden"
>
  <!-- Background decorative elements -->
  <div class="absolute inset-0 overflow-hidden pointer-events-none">
    <div class="absolute -top-40 -right-40 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
    <div
      class="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl"
    ></div>
  </div>

  <div class="w-full max-w-7xl relative z-10">
    <div
      class="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden"
    >
      <!-- Header Section with Gradient -->
      <div class="relative bg-gradient-to-r from-blue-600 to-indigo-600 px-6 sm:px-8 py-6 sm:py-8">
        <div class="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
        <div class="relative">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              </div>
              <div>
                <h2 class="text-2xl sm:text-3xl font-bold text-white">Audio Emitter</h2>
                <p class="text-blue-100 text-xs sm:text-sm mt-1">
                  Capture, process and stream audio in real-time
                </p>
              </div>
            </div>

            <!-- Status Indicator -->
            <div class="flex items-center gap-3">
              {#if isStreaming}
                <div
                  class="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg"
                >
                  <span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <span class="text-white text-sm font-medium">Live</span>
                </div>
              {:else}
                <div
                  class="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg"
                >
                  <span class="w-2 h-2 bg-slate-300 rounded-full"></span>
                  <span class="text-blue-100 text-sm font-medium">Ready</span>
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>

      <!-- Error Display (if any) -->
      {#if error}
        <div class="mx-6 sm:mx-8 mt-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div class="flex-1">
              <p class="text-sm font-medium text-red-800">{error}</p>
            </div>
            <button
              onclick={() => (error = null)}
              class="text-red-500 hover:text-red-700 transition-colors"
              aria-label="Dismiss error"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      {/if}

      <div class="p-6 sm:p-8">
        <!-- Main Content Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left Column: Device Selection & Streaming Controls -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Signaling URL Configuration -->
            <div
              class="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div class="p-4 space-y-3">
                <div class="flex items-center justify-between">
                  <span class="block text-sm font-medium text-gray-700">
                    Signaling Server URL
                  </span>
                  <button
                    onclick={() => (showSignalingURLInput = !showSignalingURLInput)}
                    class="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {showSignalingURLInput ? 'Hide' : 'Configure'}
                  </button>
                </div>
                {#if showSignalingURLInput}
                  <div class="space-y-2">
                    <label
                      for="emitter-signaling-url"
                      class="block text-sm font-medium text-gray-700 sr-only"
                    >
                      Signaling Server URL
                    </label>
                    <input
                      id="emitter-signaling-url"
                      type="text"
                      bind:value={signalingURL}
                      oninput={handleSignalingURLChange}
                      placeholder="http://localhost:8080"
                      class="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p class="text-xs text-gray-500">
                      WebSocket signaling server URL (e.g., http://localhost:8080 or
                      ws://example.com:8080)
                    </p>
                  </div>
                {:else}
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-gray-600 font-mono">{signalingURL}</span>
                  </div>
                {/if}
              </div>
            </div>

            <!-- Device Selector Card -->
            <div
              class="bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 {isStreaming
                ? 'opacity-75'
                : ''}"
            >
              <EmitterDeviceSelector
                bind:selectedDeviceId
                {isStreaming}
                bind:outputDevices
                bind:error
                bind:selectedReceiverOutputDeviceId
              />
            </div>

            <!-- Streaming Controls Card - Primary Action -->
            <div
              class="bg-gradient-to-br from-white to-blue-50/50 rounded-xl border-2 {isStreaming
                ? 'border-blue-300 shadow-lg'
                : 'border-slate-200'} shadow-sm hover:shadow-md transition-all duration-300"
            >
              <EmitterStreamingControls
                {selectedDeviceId}
                bind:isStreaming
                bind:error
                bind:receiverAudioStream
                bind:isPlayingReceiverAudio
                bind:receiverAudioElement
                bind:selectedReceiverOutputDeviceId
                {signalingURL}
                {changeReceiverOutputDevice}
              />
            </div>
          </div>

          <!-- Right Column: Receiver Audio (when available) -->
          <div class="lg:col-span-1">
            {#if receiverAudioStream}
              <div
                class="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden sticky top-6"
              >
                <div class="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3">
                  <h3 class="text-white font-semibold flex items-center gap-2 text-sm sm:text-base">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                      />
                    </svg>
                    Incoming Audio
                  </h3>
                </div>
                <div class="p-4">
                  <EmitterAudioReceiver
                    bind:receiverAudioStream
                    bind:receiverAudioElement
                    bind:isPlayingReceiverAudio
                    bind:error
                    bind:selectedReceiverOutputDeviceId
                    bind:outputDevices
                    {changeReceiverOutputDevice}
                  />
                </div>
              </div>
            {:else}
              <!-- Placeholder when no receiver audio -->
              <div
                class="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 p-6 text-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-12 h-12 text-slate-400 mx-auto mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
                <p class="text-sm text-slate-500 font-medium">No incoming audio</p>
                <p class="text-xs text-slate-400 mt-1">Start streaming to receive audio</p>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
