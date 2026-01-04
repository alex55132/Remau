<script lang="ts">
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
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center p-8">
  <div class="w-full max-w-6xl">
    <div class="bg-white rounded-lg shadow border border-gray-200">
      <!-- Header Section -->
      <div class="border-b border-gray-200 px-8 py-6">
        <h2 class="text-2xl font-semibold text-gray-900">Audio Recorder</h2>
        <p class="text-sm text-gray-600 mt-1">Capture, process and stream audio in real-time</p>
      </div>

      <div class="p-8 space-y-8">
        <EmitterDeviceSelector
          bind:selectedDeviceId
          {isStreaming}
          bind:outputDevices
          bind:error
          bind:selectedReceiverOutputDeviceId
        />

        <EmitterStreamingControls
          {selectedDeviceId}
          bind:isStreaming
          bind:error
          bind:receiverAudioStream
          bind:isPlayingReceiverAudio
          bind:receiverAudioElement
          bind:selectedReceiverOutputDeviceId
          {changeReceiverOutputDevice}
        />

        <!-- Receiver Audio Section -->
        {#if receiverAudioStream}
          <EmitterAudioReceiver
            bind:receiverAudioStream
            bind:receiverAudioElement
            bind:isPlayingReceiverAudio
            bind:error
            bind:selectedReceiverOutputDeviceId
            bind:outputDevices
            {changeReceiverOutputDevice}
          />
        {/if}
      </div>
    </div>
  </div>
</div>
