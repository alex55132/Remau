<script lang="ts">
  import { onDestroy } from 'svelte'
  import { AudioManager } from '../../lib/AudioManager'

  type Props = {
    selectedDeviceId: string
    isStreaming: boolean
    error: string | null
    audioStream: MediaStream | null
    virtualMicStream: MediaStream | null
  }
  let {
    selectedDeviceId,
    isStreaming,
    error = $bindable(),
    audioStream = $bindable(),
    virtualMicStream = $bindable()
  }: Props = $props()

  async function startStreaming(): Promise<void> {
    try {
      if (!selectedDeviceId) {
        error = 'Please select an audio device'
        return
      }

      error = null

      // Capture audio from the selected device
      try {
        audioStream = await AudioManager.getConfiguredUserMedia({
          isExact: true,
          selectedDeviceId
        })
      } catch (exactError) {
        console.warn('Exact device failed, trying ideal:', exactError)
        try {
          audioStream = await AudioManager.getConfiguredUserMedia({
            isExact: false,
            selectedDeviceId
          })
        } catch (idealError) {
          console.warn('Ideal device failed, using default:', idealError)
          audioStream = await AudioManager.getConfiguredUserMedia({
            useDefault: true,
            selectedDeviceId
          })
        }
      }

      // Use the live audio stream directly as virtual microphone
      virtualMicStream = audioStream
      isStreaming = true
      console.log('Live streaming started')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error starting stream:', err)

      if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
        error = 'Permission denied. Please allow microphone access in system settings.'
      } else if (errorMessage.includes('not found') || errorMessage.includes('NotFound')) {
        error = 'Device not found. Please select another device.'
      } else if (errorMessage.includes('not allowed') || errorMessage.includes('NotAllowed')) {
        error = 'Access not allowed. Check microphone permissions.'
      } else {
        error = `Error starting stream: ${errorMessage}`
      }

      stopStreaming()
    }
  }

  function stopStreaming(): void {
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop())
      audioStream = null
    }
    virtualMicStream = null
    isStreaming = false
    console.log('Live streaming stopped')
  }

  onDestroy(() => {
    stopStreaming()
  })
</script>

<!-- Live Streaming -->
<div class="border border-gray-200 rounded-lg p-6 space-y-4">
  <div>
    <h3 class="text-base font-semibold text-gray-900">Live Audio Stream</h3>
    <p class="text-sm text-gray-600 mt-1">
      Capture and stream audio from your selected device in real-time
    </p>
  </div>
  {#if !isStreaming}
    <div class="flex justify-start">
      <button
        class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={startStreaming}
        disabled={!selectedDeviceId}
      >
        Start Streaming
      </button>
    </div>
  {:else}
    <div class="space-y-4">
      <!-- Streaming Status -->
      <div class="flex items-center gap-3">
        <span class="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
        <span class="text-sm font-medium text-gray-700">Live Streaming</span>
      </div>
      <!-- Control Button -->
      <div class="flex gap-3">
        <button
          class="px-6 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md font-medium transition-colors"
          onclick={stopStreaming}
        >
          Stop Streaming
        </button>
      </div>
    </div>
  {/if}
</div>
