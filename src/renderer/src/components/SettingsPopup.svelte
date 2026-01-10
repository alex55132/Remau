<script lang="ts">
  import { onMount } from 'svelte'
  import {
    extractTurnServersFromIceServers,
    validateAndSaveTurnServers,
    type TurnServerData
  } from '../lib/IceServersService'

  type DriverCheckResult =
    | {
        success: true
        driver: { name: string; installed: boolean; platform: string }
        downloadUrl: string
        instructions: string[]
      }
    | { success: false; error: string }

  let {
    show = $bindable(false),
    driverData
  }: { show: boolean; driverData: DriverCheckResult | null } = $props()

  let turnServers = $state<TurnServerData[]>([{ url: '', username: '', password: '' }])
  let iceServersError = $state<string | null>(null)
  let serverErrors = $state<Record<number, string>>({})

  onMount(() => {
    try {
      const servers = extractTurnServersFromIceServers()
      turnServers = servers.length > 0 ? servers : [{ url: '', username: '', password: '' }]
    } catch (err) {
      console.warn('Error loading ICE servers:', err)
      turnServers = [{ url: '', username: '', password: '' }]
    }
  })

  function validateAndSave(): void {
    iceServersError = null
    serverErrors = {}

    const result = validateAndSaveTurnServers(turnServers)
    serverErrors = result.validationErrors
    iceServersError = result.saveError
  }

  function handleUrlChange(index: number, value: string): void {
    turnServers = turnServers.map((server, i) => (i === index ? { ...server, url: value } : server))

    // Clear error for this server when user starts typing
    if (serverErrors[index]) {
      const newErrors = { ...serverErrors }
      delete newErrors[index]
      serverErrors = newErrors
    }

    validateAndSave()

    // Auto-add new input if this is the last one and it's not empty
    if (index === turnServers.length - 1 && value.trim() !== '') {
      turnServers = [...turnServers, { url: '', username: '', password: '' }]
    }
  }

  function handleUsernameChange(index: number, value: string): void {
    turnServers = turnServers.map((server, i) =>
      i === index ? { ...server, username: value } : server
    )
    validateAndSave()
  }

  function handlePasswordChange(index: number, value: string): void {
    turnServers = turnServers.map((server, i) =>
      i === index ? { ...server, password: value } : server
    )
    validateAndSave()
  }

  function removeServer(index: number): void {
    if (turnServers.length > 1) {
      turnServers = turnServers.filter((_, i) => i !== index)
      // Reindex errors
      const newErrors: Record<number, string> = {}
      Object.entries(serverErrors).forEach(([key, error]) => {
        const oldIndex = Number(key)
        if (oldIndex < index) {
          newErrors[oldIndex] = error
        } else if (oldIndex > index) {
          newErrors[oldIndex - 1] = error
        }
      })
      serverErrors = newErrors
    } else {
      // If it's the last one, just clear it
      turnServers[0] = { url: '', username: '', password: '' }
      serverErrors = {}
    }

    validateAndSave()
  }
</script>

{#if show}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="acknowledgment-title"
    onclick={() => {
      if (window.getSelection()?.toString().length === 0) {
        show = false
      }
    }}
    onkeydown={(e) => e.key === 'Escape' && (show = false)}
    tabindex="-1"
  >
    <!-- Dark overlay background -->
    <div class="absolute inset-0 bg-black opacity-50"></div>

    <!-- Popup content -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[calc(100vh-2rem)] flex flex-col select-text"
      onclick={(e) => e.stopPropagation()}
      onmousedown={(e) => e.stopPropagation()}
    >
      <div class="flex items-start justify-between p-6 pb-4 flex-shrink-0">
        <h3 id="acknowledgment-title" class="text-xl font-semibold text-gray-900">
          Acknowledgments
        </h3>
        <button
          class="text-gray-400 hover:text-gray-600 transition-colors"
          onclick={() => (show = false)}
          aria-label="Close popup"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <div class="px-6 pb-6 overflow-y-auto flex-1">
        <div class="text-gray-700 space-y-4">
          <!-- Acknowledgments Section -->
          <div class="space-y-3">
            <p>
              Thank you for using Remau! In order to work, Remau makes use of virtual audio drivers
              that are installed directly with the installation.
            </p>
            <ul class="list-disc list-inside space-y-2 ml-2">
              <li class="bg-blue-50 border-l-4 border-blue-500 pl-3 py-2 rounded-r-md -ml-2">
                <strong class="text-blue-700">BlackHole</strong>
                <span class="text-blue-600"> - A virtual audio driver for macOS</span>
                {#if driverData && driverData.success && driverData.driver.platform === 'macOS'}
                  <div class="ml-2 text-sm text-gray-600 mt-1">
                    <span class="font-semibold">Status:</span>
                    {#if driverData.driver.installed}
                      <span class="text-green-600">Installed</span>
                    {:else}
                      <span class="text-red-600"
                        >Not installed (Use brew install --cask blackhole-2ch)</span
                      >
                    {/if}
                  </div>
                {/if}
              </li>
              <li class="bg-blue-50 border-l-4 border-blue-500 pl-3 py-2 rounded-r-md -ml-2">
                <span class="text-blue-700"
                  >VB-Cable (www.vb-cable.com) - A virtual audio cable for Windows.</span
                >
                {#if driverData && driverData.success && driverData.driver.platform === 'Windows'}
                  <div class="ml-2 text-sm text-gray-600 mt-1">
                    <span class="font-semibold">Status:</span>
                    {#if driverData.driver.installed}
                      <span class="text-green-600">Installed</span>
                    {:else}
                      <span class="text-red-600">Not installed</span>
                    {/if}
                  </div>
                {/if}
                <div class="ml-2 text-sm text-gray-600 mt-1">
                  VB-Cable is donationware, so feel free to donate to them if you find their
                  software useful.
                </div>
              </li>
            </ul>
            <p class="text-sm text-gray-600 mt-4">
              These tools enable the virtual audio routing capabilities of this application but they
              are not mandatory if you want to use other devices.
            </p>
          </div>

          <!-- ICE Servers Configuration Section -->
          <div class="border-t border-gray-200 pt-4 mt-4">
            <h4 class="text-lg font-semibold text-gray-900 mb-3">Advanced Configuration</h4>
            <p class="text-xs text-gray-500 mt-2 mb-2">
              Only use these configuration if you know what you're doing!
            </p>
            <div class="space-y-3">
              <div>
                <label for="ice-servers-label" class="block text-sm font-medium text-gray-700 mb-2">
                  WebRTC TURN Servers
                </label>
                <div class="space-y-3">
                  {#each turnServers as server, index (index)}
                    <div class="space-y-2 p-3 border border-gray-200 rounded-md">
                      <div class="flex items-center gap-2">
                        <input
                          type="text"
                          value={server.url}
                          oninput={(e) => handleUrlChange(index, e.currentTarget.value)}
                          placeholder="turn:turn.example.com:3478"
                          class="flex-1 px-3 py-2 bg-white border {serverErrors[index]
                            ? 'border-red-500'
                            : 'border-gray-300'} rounded-md text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onclick={() => removeServer(index)}
                          class="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          aria-label="Remove server"
                          title="Remove server"
                        >
                          <svg
                            class="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                      {#if serverErrors[index]}
                        <p class="text-sm text-red-600">{serverErrors[index]}</p>
                      {/if}
                      <div class="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={server.username}
                          oninput={(e) => handleUsernameChange(index, e.currentTarget.value)}
                          placeholder="Username"
                          class="px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                          type="password"
                          value={server.password}
                          oninput={(e) => handlePasswordChange(index, e.currentTarget.value)}
                          placeholder="Password"
                          class="px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  {/each}
                </div>
                {#if iceServersError}
                  <p class="text-sm text-red-600 mt-2">{iceServersError}</p>
                {:else}
                  <p class="text-xs text-gray-500 mt-2">
                    Configure TURN servers for WebRTC. Only TURN servers are supported. STUN servers
                    are not allowed. A new field will appear when you fill one. Example:
                    turn:turn.example.com:3478
                  </p>
                {/if}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
