<script lang="ts">
  type Props = {
    outputDevices: MediaDeviceInfo[]
    selectedOutputDeviceId: string
    audioElement: HTMLAudioElement | null
    remoteStream: MediaStream | null
    changeOutputDevice: () => Promise<void>
  }

  let {
    selectedOutputDeviceId = $bindable(),
    outputDevices = $bindable(),
    audioElement = $bindable(),
    remoteStream = $bindable(),
    changeOutputDevice
  }: Props = $props()
</script>

<div class="border border-gray-200 rounded-lg p-6 space-y-4">
  <h3 class="text-base font-semibold text-gray-900">Audio Playback</h3>

  <!-- Output Device Selector -->
  {#if outputDevices.length > 0}
    <div class="space-y-3">
      <label for="outputDevice" class="block text-sm font-medium text-gray-700">
        Output Device
      </label>
      <select
        id="outputDevice"
        bind:value={selectedOutputDeviceId}
        onchange={changeOutputDevice}
        class="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="default">Default</option>
        {#each outputDevices as device (device.deviceId)}
          <option value={device.deviceId}>
            {device.label || `Device ${device.deviceId.substring(0, 8)}`}
          </option>
        {/each}
      </select>

      <p class="text-xs text-gray-600">
        For Discord/OBS, select a virtual audio device (CABLE Input, VoiceMeeter, etc.)
      </p>

      {#if selectedOutputDeviceId !== 'default'}
        <div class="bg-green-50 border border-green-200 rounded-md p-3">
          <p class="text-xs text-green-800">
            Currently using: {outputDevices.find((d) => d.deviceId === selectedOutputDeviceId)
              ?.label || 'Selected device'}
          </p>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Audio Player -->
  <div>
    <audio
      id="audioPlayer"
      bind:this={audioElement}
      srcObject={remoteStream}
      autoplay
      controls
      class="w-full"
    ></audio>
  </div>
</div>
