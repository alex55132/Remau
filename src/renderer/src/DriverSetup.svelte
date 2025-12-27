<script lang="ts">
  import { onMount } from 'svelte'

  let driverInfo: any = null
  let loading = true
  let installing = false
  let error: string | null = null
  let successMessage: string | null = null

  async function checkDriver() {
    try {
      loading = true
      error = null
      const result = await window.api.driver.check()

      if (result.success) {
        driverInfo = result
      } else {
        error = result.error || 'Error al verificar el driver'
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Error desconocido'
    } finally {
      loading = false
    }
  }

  async function installDriver() {
    try {
      installing = true
      error = null
      successMessage = null

      const result = await window.api.driver.install()

      if (result.success) {
        successMessage = result.message
        // Recargar información del driver
        await checkDriver()
      } else {
        error = result.message
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Error al instalar el driver'
    } finally {
      installing = false
    }
  }

  async function openDownloadPage() {
    try {
      await window.api.driver.openDownload()
    } catch (err) {
      error = err instanceof Error ? err.message : 'Error al abrir la página'
    }
  }

  onMount(() => {
    checkDriver()
  })
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center p-8">
  <div class="w-full max-w-4xl">
    <div class="bg-white rounded-lg shadow border border-gray-200">
      <!-- Header -->
      <div class="border-b border-gray-200 px-8 py-6">
        <h2 class="text-2xl font-semibold text-gray-900">Virtual Audio Configuration</h2>
        <p class="text-sm text-gray-600 mt-1">Manage virtual audio drivers for streaming</p>
      </div>

      <div class="p-8 space-y-6">
        {#if loading}
          <div class="flex flex-col items-center justify-center py-12">
            <div
              class="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mb-4"
            ></div>
            <p class="text-sm text-gray-600">Checking audio drivers...</p>
          </div>
        {:else if driverInfo}
          <div class="space-y-6">
            <!-- Status Card -->
            <div class="border border-gray-200 rounded-lg p-6 space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-xl font-semibold text-gray-900">{driverInfo.driver.name}</h3>
                  <p class="text-sm text-gray-600 mt-1">
                    <span class="font-medium">Platform:</span>
                    {driverInfo.driver.platform}
                  </p>
                </div>
                {#if driverInfo.driver.installed}
                  <div class="px-4 py-2 bg-green-50 border border-green-500 rounded-md">
                    <span class="text-green-900 font-medium text-sm">Installed</span>
                  </div>
                {:else}
                  <div class="px-4 py-2 bg-red-50 border border-red-500 rounded-md">
                    <span class="text-red-900 font-medium text-sm">Not Installed</span>
                  </div>
                {/if}
              </div>

              {#if driverInfo.driver.installed}
                <div class="bg-green-50 border border-green-200 rounded-md p-4 space-y-2">
                  <p class="text-sm font-medium text-green-900">Driver Installed Successfully</p>
                  <p class="text-xs text-gray-700">
                    The virtual audio driver is ready. You can select it in the device selector to
                    route audio to other applications.
                  </p>
                </div>
              {:else}
                <div class="bg-blue-50 border border-blue-200 rounded-md p-4 space-y-2 mb-4">
                  <p class="text-sm font-medium text-blue-900">Driver Not Installed</p>
                  <p class="text-xs text-gray-700">
                    To use audio with other applications (Discord, OBS, etc.), you need to install a
                    virtual audio driver.
                  </p>
                </div>

                <!-- Installation Section -->
                <div class="border border-gray-200 rounded-lg p-6 space-y-4">
                  <h4 class="text-base font-semibold text-gray-900">Installation Options</h4>

                  {#if driverInfo.driver.platform === 'Linux'}
                    <button
                      class="w-full px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      on:click={installDriver}
                      disabled={installing}
                    >
                      {installing ? 'Configuring...' : 'Configure PulseAudio Loopback'}
                    </button>
                    <p class="text-xs text-gray-600 text-center">
                      Audio loopback will be automatically configured on your system
                    </p>
                  {:else}
                    <button
                      class="w-full px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
                      on:click={openDownloadPage}
                    >
                      Download {driverInfo.driver.name}
                    </button>
                    <p class="text-xs text-gray-600 text-center">
                      The official page will open. The installer is free and safe.
                    </p>
                  {/if}
                </div>
              {/if}
            </div>

            <!-- Instructions -->
            {#if driverInfo.instructions && driverInfo.instructions.length > 0}
              <div class="border border-gray-200 rounded-lg p-6 space-y-4">
                <h4 class="text-base font-semibold text-gray-900">Installation Instructions</h4>
                <ol class="space-y-3">
                  {#each driverInfo.instructions as instruction, index}
                    <li class="flex items-start gap-3 text-sm text-gray-700">
                      <span
                        class="flex-shrink-0 w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-semibold"
                        >{index + 1}</span
                      >
                      <span class="pt-0.5">{instruction}</span>
                    </li>
                  {/each}
                </ol>
              </div>
            {/if}

            <!-- Error Message -->
            {#if error}
              <div class="bg-red-50 border border-red-200 rounded-lg p-4 space-y-1">
                <p class="text-sm font-medium text-red-900">Error</p>
                <p class="text-sm text-red-800">{error}</p>
              </div>
            {/if}

            <!-- Success Message -->
            {#if successMessage}
              <div class="bg-green-50 border border-green-200 rounded-lg p-4 space-y-1">
                <p class="text-sm font-medium text-green-900">Success</p>
                <p class="text-sm text-green-800">{successMessage}</p>
              </div>
            {/if}

            <!-- Help Card -->
            <div class="border border-gray-200 rounded-lg p-6 space-y-4">
              <h4 class="text-base font-semibold text-gray-900">What is a virtual audio driver?</h4>
              <div class="space-y-3 text-sm text-gray-700">
                <p>
                  A virtual audio driver creates an internal audio "cable" in your system. The audio
                  played by this application can be captured by other applications as if it were a
                  real microphone.
                </p>
                <div class="bg-gray-50 border border-gray-200 rounded-md p-4 space-y-2">
                  <p class="font-medium text-gray-900">Use Cases:</p>
                  <ul class="space-y-1.5 ml-4 list-disc text-gray-700">
                    <li>Use audio in Discord as your voice</li>
                    <li>Stream audio in OBS</li>
                    <li>Record with Audacity</li>
                    <li>Any application that uses a microphone</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
