<script lang="ts">
  import type { MediaDevice } from '../../../../types/MediaDevice'

  type Props = {
    receiverAudioStream: MediaStream | null
    receiverAudioElement: HTMLAudioElement | null
    isPlayingReceiverAudio: boolean
    error: string | null
    selectedReceiverOutputDeviceId: string
    outputDevices: MediaDevice[]
    changeReceiverOutputDevice: () => Promise<void>
  }

  let {
    receiverAudioStream = $bindable(),
    receiverAudioElement = $bindable(),
    isPlayingReceiverAudio = $bindable(),
    error = $bindable(),
    selectedReceiverOutputDeviceId = $bindable(),
    outputDevices = $bindable(),
    changeReceiverOutputDevice
  }: Props = $props()

  function toggleReceiverAudioPlayback(): void {
    if (!receiverAudioElement) return

    if (isPlayingReceiverAudio) {
      receiverAudioElement.pause()
      receiverAudioElement.muted = true
      isPlayingReceiverAudio = false
      console.log('Receiver audio playback stopped')
    } else {
      receiverAudioElement.muted = false
      receiverAudioElement.play().catch((err) => {
        console.error('Error playing receiver audio:', err)
        error = err instanceof Error ? err.message : 'Error playing audio'
      })
      isPlayingReceiverAudio = true
      console.log('Receiver audio playback started')
    }
  }
</script>

<div class="border border-gray-200 rounded-lg p-6 space-y-4">
  <div>
    <h4 class="text-base font-semibold text-gray-900">Audio from Receiver</h4>
    <p class="text-sm text-gray-600 mt-1">Playing system audio sent from the receiver</p>
  </div>

  <!-- Playback Control -->
  <div class="flex items-center gap-3">
    {#if !isPlayingReceiverAudio}
      <button
        class="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors"
        onclick={toggleReceiverAudioPlayback}
      >
        Start Listening
      </button>
      <div class="text-sm text-gray-600">Click to hear audio from receiver</div>
    {:else}
      <button
        class="px-6 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md font-medium transition-colors"
        onclick={toggleReceiverAudioPlayback}
      >
        Stop Listening
      </button>
      <div class="flex-1 bg-green-50 border border-green-200 rounded-md px-4 py-2.5">
        <p class="text-sm font-medium text-green-800">Playing receiver audio</p>
      </div>
    {/if}
  </div>

  <!-- Output Device Selector for Receiver Audio -->
  {#if outputDevices.length > 0}
    <div class="space-y-3">
      <label for="receiverOutputDevice" class="block text-sm font-medium text-gray-700">
        Output Device
      </label>
      <select
        id="receiverOutputDevice"
        bind:value={selectedReceiverOutputDeviceId}
        onchange={changeReceiverOutputDevice}
        disabled={isPlayingReceiverAudio}
        class="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="default">Default</option>
        {#each outputDevices as device (device.deviceId)}
          <option value={device.deviceId}>
            {device.label || `Device ${device.deviceId.substring(0, 8)}`}
          </option>
        {/each}
      </select>
      <p class="text-xs text-gray-600">
        Select which device should play the audio received from the receiver
      </p>
    </div>
  {/if}

  <!-- Hidden Audio Player (controlled programmatically) -->
  <audio bind:this={receiverAudioElement} srcObject={receiverAudioStream} muted class="hidden"
  ></audio>
</div>
