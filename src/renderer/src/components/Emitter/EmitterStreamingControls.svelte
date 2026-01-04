<script lang="ts">
  import { onDestroy } from 'svelte'
  import { AudioManager } from '../../lib/AudioManager'
  import { WebRTCHelper } from '../../lib/WebrtcHelper'

  type Props = {
    selectedDeviceId: string
    isStreaming: boolean
    error: string | null
    receiverAudioStream: MediaStream | null
    isPlayingReceiverAudio: boolean
    receiverAudioElement: HTMLAudioElement | null
    selectedReceiverOutputDeviceId: string
    changeReceiverOutputDevice: () => Promise<void>
  }

  let {
    selectedDeviceId,
    isStreaming = $bindable(),
    error = $bindable(),
    receiverAudioStream = $bindable(),
    isPlayingReceiverAudio = $bindable(),
    receiverAudioElement = $bindable(),
    selectedReceiverOutputDeviceId = $bindable(),
    changeReceiverOutputDevice
  }: Props = $props()

  // Internal state - only used within this component
  let audioStream = $state<MediaStream | null>(null)
  let virtualMicStream = $state<MediaStream | null>(null)
  let isWebRTCStreaming = $state<boolean>(false)
  let signalingURL = $state<string | null>(null)
  let webrtcHelper = $state<WebRTCHelper | null>(null)

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

      // Automatically start WebRTC streaming after audio capture
      await startWebRTCStreaming()
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

      await stopStreaming()
    }
  }

  async function stopStreaming(): Promise<void> {
    await stopWebRTCStreaming()

    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop())
      audioStream = null
    }
    virtualMicStream = null
    isStreaming = false
    console.log('Live streaming stopped')
  }

  async function startWebRTCStreaming(): Promise<void> {
    if (!virtualMicStream) {
      error = 'Virtual microphone stream is not available'
      return
    }

    try {
      // Crear helper WebRTC (emisor, iniciador)
      // El helper manejará automáticamente el inicio del servidor
      webrtcHelper = new WebRTCHelper('http://localhost:8080', true, {
        onStream: (stream) => {
          console.log('🎙️ Emisor: Stream recibido del receptor!')
          receiverAudioStream = stream
          isPlayingReceiverAudio = false

          // Apply the selected output device after a short delay
          setTimeout(() => {
            if (receiverAudioElement && selectedReceiverOutputDeviceId !== 'default') {
              changeReceiverOutputDevice()
            }
          }, 500)
        },
        onConnect: () => {
          console.log('🎙️ Emisor: Conexión establecida')
        },
        onDisconnect: () => {
          console.log('🎙️ Emisor: Desconectado')
        },
        onError: (err) => {
          console.error('🎙️ Emisor - Error:', err)
          error = err.message
        }
      })

      // Validar que el stream tenga tracks activos antes de conectar
      const tracks = virtualMicStream.getAudioTracks()
      if (tracks.length === 0) {
        throw new Error('Virtual microphone stream has no audio tracks')
      }

      // Verificar que los tracks estén activos
      const activeTracks = tracks.filter((track) => track.readyState === 'live')
      if (activeTracks.length === 0) {
        throw new Error('Virtual microphone stream has no active tracks')
      }

      console.log(
        '🎙️ Emisor: Conectando con stream:',
        virtualMicStream.id,
        activeTracks.length,
        'tracks activos'
      )
      activeTracks.forEach((track) => {
        console.log(
          `  - Track: ${track.id}, enabled: ${track.enabled}, label: ${track.label || 'no label'}`
        )
      })

      // Conectar con el stream virtual
      await webrtcHelper.connect(virtualMicStream)
      signalingURL = 'http://localhost:8080'
      isWebRTCStreaming = true
      console.log('🎙️ Emisor: WebRTC streaming iniciado')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      error = `Error al iniciar streaming WebRTC: ${errorMessage}`
      console.error('Error:', err)
      await stopWebRTCStreaming()
    }
  }

  async function stopWebRTCStreaming(): Promise<void> {
    try {
      if (webrtcHelper) {
        webrtcHelper.disconnect()
        webrtcHelper = null
      }

      if (receiverAudioStream) {
        receiverAudioStream.getTracks().forEach((track) => track.stop())
        receiverAudioStream = null
      }

      isPlayingReceiverAudio = false

      if (isWebRTCStreaming) {
        await window.api.webrtc.stop()
        isWebRTCStreaming = false
        signalingURL = null
      }
    } catch (err) {
      console.error('Error al detener streaming WebRTC:', err)
    }
  }

  onDestroy(async () => {
    await stopStreaming()
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
      <div class="space-y-2">
        <div class="flex items-center gap-3">
          <span class="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
          <span class="text-sm font-medium text-gray-700">Live Streaming</span>
        </div>
        {#if isWebRTCStreaming && signalingURL}
          <div class="flex items-center gap-3 ml-5">
            <span class="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            <span class="text-sm font-medium text-gray-700">WebRTC Connected</span>
            <span class="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded">
              Low Latency
            </span>
          </div>
        {/if}
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
