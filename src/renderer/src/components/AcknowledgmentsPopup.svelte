<script lang="ts">
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
</script>

{#if show}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="acknowledgment-title"
    onclick={() => (show = false)}
    onkeydown={(e) => e.key === 'Escape' && (show = false)}
    tabindex="-1"
  >
    <!-- Dark overlay background -->
    <div class="absolute inset-0 bg-black opacity-50"></div>

    <!-- Popup content -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="flex items-start justify-between mb-4">
        <h3 id="acknowledgment-title" class="text-xl font-semibold text-gray-900">
          Acknowledgments
        </h3>
        <button
          class="text-gray-400 hover:text-gray-600 transition-colors"
          onclick={() => (show = false)}
          aria-label="Close acknowledgment popup"
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
      <div class="text-gray-700 space-y-3">
        <p>
          Thank you for using Remau! In order to work, Remau makes use of virtual audio drivers that
          are installed directly with the installation.
        </p>
        <ul class="list-disc list-inside space-y-2 ml-2">
          <li>
            <strong>BlackHole</strong> - A virtual audio driver for macOS
          </li>
          <li>
            <strong>VB-Cable&nbsp;</strong>(www.vb-cable.com) - A virtual audio cable for Windows.
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
            <div class="mt-2">
              <span>
                VB-Cable is donationware, so feel free to donate to them if you find their software
                useful.
              </span>
            </div>
          </li>
        </ul>
        <p class="text-sm text-gray-600 mt-4">
          These tools enable the virtual audio routing capabilities of this application but they are
          not mandatory if you want to use other devices.
        </p>
      </div>
    </div>
  </div>
{/if}
