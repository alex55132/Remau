<script lang="ts">
  type Props = {
    error: string | null
    connectionStatus: string
  }

  let { connectionStatus, error = $bindable() }: Props = $props()
</script>

<!-- Status Badge -->
<div>
  <div class="flex items-center justify-between">
    <span class="text-sm font-medium text-gray-700">Connection Status</span>
    <div class="flex items-center gap-2">
      {#if connectionStatus.includes('Conectado')}
        <span class="h-2 w-2 rounded-full bg-green-500"></span>
        <span class="text-sm font-medium text-green-700">Connected</span>
      {:else if connectionStatus.includes('Conectando')}
        <span
          class="animate-spin inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full"
        ></span>
        <span class="text-sm font-medium text-blue-700">Connecting</span>
      {:else if connectionStatus === 'Error' || connectionStatus.includes('Error')}
        <span class="h-2 w-2 rounded-full bg-red-500"></span>
        <span class="text-sm font-medium text-red-700">Error</span>
      {:else}
        <span class="h-2 w-2 rounded-full bg-gray-400"></span>
        <span class="text-sm font-medium text-gray-600">{connectionStatus}</span>
      {/if}
    </div>
  </div>
</div>

<!-- Error Display -->
{#if error}
  <div class="bg-red-50 border border-red-200 rounded-lg p-4">
    <p class="text-sm text-red-800">{error}</p>
  </div>
{/if}
