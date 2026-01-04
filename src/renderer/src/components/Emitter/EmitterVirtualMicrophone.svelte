<script lang="ts">
  import { onDestroy } from 'svelte'
  import { WebRTCHelper } from '../../lib/WebrtcHelper'

  type Props = {
    virtualMicStream: MediaStream | null
    isWebRTCStreaming: boolean
    signalingURL: string | null
    error: string | null
    receiverAudioStream: MediaStream | null
    isPlayingReceiverAudio: boolean
    receiverAudioElement: HTMLAudioElement | null
    selectedReceiverOutputDeviceId: string
    changeReceiverOutputDevice: () => Promise<void>
  }

  let {
    virtualMicStream,
    isWebRTCStreaming,
    signalingURL,
    error = $bindable(),
    receiverAudioStream = $bindable(),
    isPlayingReceiverAudio = $bindable(),
    receiverAudioElement = $bindable(),
    selectedReceiverOutputDeviceId = $bindable(),
    changeReceiverOutputDevice
  }: Props = $props()

  let webrtcHelper = $state<WebRTCHelper | null>(null)

  async function startWebRTCStreaming(): Promise<void> {
    if (!virtualMicStream) {
      error = 'Primero debes iniciar la emision como microfono'
      return
    }

    try {
      error = null

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
    await stopWebRTCStreaming()
  })
</script>

<div class="border border-gray-200 rounded-lg p-6 space-y-4">
  <div>
    <h3 class="text-base font-semibold text-gray-900">Virtual Microphone Stream</h3>
    <p class="text-sm text-gray-600 mt-1">Your live audio is available as a virtual microphone</p>
  </div>

  <!-- Stream Status -->
  <div class="bg-green-50 border border-green-200 rounded-md p-4 space-y-2">
    <p class="text-sm font-medium text-green-900">Virtual stream active</p>
    <p class="text-xs text-gray-700">
      ID: {virtualMicStream.id}
    </p>
  </div>

  <!-- WebRTC Streaming Section -->
  <div class="pt-6 border-t border-gray-200 space-y-4">
    <div class="flex items-center justify-between">
      <h4 class="text-base font-semibold text-gray-900">WebRTC Streaming</h4>
      <span class="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded">
        Low Latency
      </span>
    </div>
    {#if isWebRTCStreaming && signalingURL}
      <div class="space-y-4">
        <!-- Status -->
        <div class="bg-green-50 border border-green-200 rounded-md p-3">
          <p class="text-sm font-medium text-green-900">WebRTC streaming active</p>
        </div>
      </div>
    {/if}

    <!-- Stream Control Button -->
    <div>
      {#if !isWebRTCStreaming}
        <button
          class="w-full px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
          onclick={startWebRTCStreaming}
        >
          Start WebRTC Streaming
        </button>
      {:else}
        <button
          class="w-full px-6 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md font-medium transition-colors"
          onclick={stopWebRTCStreaming}
        >
          Stop Streaming
        </button>
      {/if}
    </div>
  </div>
</div>
