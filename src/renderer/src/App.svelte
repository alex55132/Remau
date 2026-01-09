<script lang="ts">
  import Emitter from './Emitter.svelte'
  import Receiver from './Receiver.svelte'
  import SettingsPopup from './components/SettingsPopup.svelte'

  type Mode = 'receiver' | 'emitter'
  let selectedMode = $state<Mode | null>(null)
  let showSettingsPopup = $state(false)

  type DriverCheckResult =
    | {
        success: true
        driver: { name: string; installed: boolean; platform: string }
        downloadUrl: string
        instructions: string[]
      }
    | { success: false; error: string }

  let driverData = $state<DriverCheckResult | null>(null)

  $effect(() => {
    window.api.driver.check().then((result: DriverCheckResult) => {
      driverData = result
    })
  })
</script>

{#if selectedMode === null}
  <div class="min-h-screen min-w-screen bg-gray-50 flex items-center justify-center p-8 relative">
    <button
      class="absolute top-4 right-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
      onclick={() => (showSettingsPopup = true)}
      title="Settings"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </button>
    <div class="w-full max-w-2xl mx-auto">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-3">Remau</h1>
        <p class="text-gray-600">Choose a mode to continue</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Emitter Button -->
        <button
          class="bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-500 rounded-xl p-8 transition-all duration-200 shadow-sm hover:shadow-lg group"
          onclick={() => (selectedMode = 'emitter')}
        >
          <div class="flex flex-col items-center text-center">
            <div
              class="w-16 h-16 bg-blue-100 group-hover:bg-blue-600 rounded-xl flex items-center justify-center mb-4 transition-colors"
            >
              <svg
                class="w-8 h-8 text-blue-600 group-hover:text-white transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">Emitter</h3>
            <p class="text-sm text-gray-600">Capture and stream audio</p>
          </div>
        </button>

        <!-- Receiver Button -->
        <button
          class="bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-green-500 rounded-xl p-8 transition-all duration-200 shadow-sm hover:shadow-lg group"
          onclick={() => (selectedMode = 'receiver')}
        >
          <div class="flex flex-col items-center text-center">
            <div
              class="w-16 h-16 bg-green-100 group-hover:bg-green-600 rounded-xl flex items-center justify-center mb-4 transition-colors"
            >
              <svg
                class="w-8 h-8 text-green-600 group-hover:text-white transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">Receiver</h3>
            <p class="text-sm text-gray-600">Receive and play audio</p>
          </div>
        </button>
      </div>
    </div>
  </div>
{:else}
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <div class="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
      <div
        class="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0"
      >
        <div>
          <h2 class="text-lg sm:text-xl font-semibold text-gray-900 capitalize">{selectedMode}</h2>
        </div>
        <div class="flex items-center gap-3 w-full sm:w-auto">
          <button
            class="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
            onclick={() => (showSettingsPopup = true)}
            title="Settings"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
          <button
            class="w-full sm:w-auto px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            onclick={() => (selectedMode = null)}
          >
            Change Mode
          </button>
        </div>
      </div>
    </div>

    <div class="flex-1 flex items-start justify-center">
      {#if selectedMode === 'emitter'}
        <Emitter />
      {:else if selectedMode === 'receiver'}
        <Receiver />
      {/if}
    </div>
  </div>
{/if}

<SettingsPopup bind:show={showSettingsPopup} {driverData} />
