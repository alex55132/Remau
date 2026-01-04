<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import ReceiverAudioPlayer from './components/Receiver/ReceiverAudioPlayer.svelte'
  import ReceiverControlDash from './components/Receiver/ReceiverControlDash.svelte'
  import ReceiverStatus from './components/Receiver/ReceiverStatus.svelte'
  import { AudioManager } from './lib/AudioManager'
  import { WebRTCHelper } from './lib/WebrtcHelper'

  let webrtcHelper = $state<WebRTCHelper | null>(null)
  let remoteStream = $state<MediaStream | null>(null)
  let virtualMicStream = $state<MediaStream | null>(null)

  let connectionStatus = $state<string>('Desconectado')
  let error = $state<string | null>(null)
  let isVirtualMicActive = $state<boolean>(false)

  // Dispositivos de salida
  let outputDevices = $state<MediaDeviceInfo[]>([])
  let selectedOutputDeviceId = $state<string>('default')
  let audioElement = $state<HTMLAudioElement | null>(null)

  // Para enviar audio de dispositivo de salida/loopback de vuelta
  let inputDevices = $state<MediaDeviceInfo[]>([])
  let selectedLoopbackDeviceId = $state<string>('')
  let localAudioStream = $state<MediaStream | null>(null)
  let isSendingAudio = $state<boolean>(false)

  async function startSendingAudio(): Promise<void> {
    if (!selectedLoopbackDeviceId) {
      error = 'Please select a loopback/output device'
      return
    }

    if (!webrtcHelper || !webrtcHelper.isConnected()) {
      error = 'You must connect to the sender first'
      return
    }

    try {
      error = null

      // Capture audio from the selected loopback/output device
      // This requires a virtual audio device like Stereo Mix (Windows), BlackHole (macOS), or PulseAudio loopback (Linux)
      localAudioStream = await AudioManager.getConfiguredUserMedia({
        selectedDeviceId: selectedLoopbackDeviceId
      })

      // Add the stream to the peer connection using simple-peer
      webrtcHelper.addStream(localAudioStream)
      console.log('🎤 Receiver: Loopback audio stream added to peer connection')

      isSendingAudio = true
      console.log('🎤 Receiver: Sending system audio to sender')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      error = `Error capturing system audio: ${errorMessage}`
      console.error('Error:', err)
      stopSendingAudio()
    }
  }

  async function loadOutputDevices(): Promise<void> {
    try {
      // Request permissions first
      await AudioManager.getConfiguredUserMedia({
        useDefault: true
      })

      const devices = await navigator.mediaDevices.enumerateDevices()
      outputDevices = devices.filter((device) => device.kind === 'audiooutput')
      inputDevices = devices.filter((device) => device.kind === 'audioinput')

      console.log('Output devices available:', outputDevices)
      console.log('Input devices available (for loopback):', inputDevices)

      // For receiver: select first real input device (avoid virtual cables)
      if (inputDevices.length > 0 && !selectedLoopbackDeviceId) {
        // Look for real microphone devices (not virtual cables)
        const realInputDevice = inputDevices.find(
          (d) =>
            !d.label.toLowerCase().includes('cable') &&
            !d.label.toLowerCase().includes('stereo mix') &&
            !d.label.toLowerCase().includes('voicemeeter') &&
            !d.label.toLowerCase().includes('blackhole')
        )
        selectedLoopbackDeviceId = realInputDevice?.deviceId || inputDevices[0].deviceId
        console.log(
          '✅ Auto-selected input device:',
          realInputDevice?.label || inputDevices[0].label
        )
      }

      // For receiver: Always use system default output device (not virtual cables)
      if (outputDevices.length > 0 && selectedOutputDeviceId === 'default') {
        // Try to find the actual default/system device (avoid virtual cables)
        const systemDefaultDevice = outputDevices.find((d) => d.deviceId === 'default')
        if (systemDefaultDevice) {
          selectedOutputDeviceId = 'default'
          console.log('✅ Using system default output device')
        } else {
          // If no "default", find first non-virtual device
          const realDevice = outputDevices.find(
            (d) =>
              !d.label.toLowerCase().includes('cable') &&
              !d.label.toLowerCase().includes('voicemeeter') &&
              !d.label.toLowerCase().includes('blackhole')
          )
          selectedOutputDeviceId = realDevice?.deviceId || outputDevices[0].deviceId
        }
      }
    } catch (err) {
      console.error('Error cargando dispositivos de salida:', err)
    }
  }

  async function changeOutputDevice(): Promise<void> {
    if (!audioElement) return

    try {
      // setSinkId permite cambiar el dispositivo de salida
      if (typeof audioElement.setSinkId === 'function') {
        await audioElement.setSinkId(selectedOutputDeviceId)
        console.log('Dispositivo de salida cambiado a:', selectedOutputDeviceId)
      } else {
        console.warn('setSinkId no está soportado en este navegador')
      }
    } catch (err) {
      console.error('Error cambiando dispositivo de salida:', err)
      error = err instanceof Error ? err.message : 'Error al cambiar dispositivo'
    }
  }

  function stopSendingAudio(): void {
    // Remove the stream from peer connection if it exists
    if (localAudioStream && webrtcHelper) {
      try {
        webrtcHelper.removeStream(localAudioStream)
      } catch (err) {
        console.warn('Error removing stream:', err)
      }
    }

    if (localAudioStream) {
      localAudioStream.getTracks().forEach((track) => track.stop())
      localAudioStream = null
    }

    isSendingAudio = false
    console.log('🎤 Receiver: Stopped sending system audio')
  }

  onMount(async () => {
    // Cargar dispositivos de salida
    loadOutputDevices()
  })

  onDestroy(() => {
    stopSendingAudio()
  })
</script>

<div class="min-h-screen min-w-screen bg-gray-50 p-8">
  <div class="max-w-5xl mx-auto">
    <!-- Main Card -->
    <div class="bg-white rounded-lg shadow border border-gray-200">
      <!-- Header -->
      <div class="border-b border-gray-200 px-8 py-6">
        <h1 class="text-2xl font-semibold text-gray-900">Audio Receiver</h1>
        <p class="text-sm text-gray-600 mt-1">Receive and play audio in real-time</p>
      </div>

      <div class="p-8 space-y-8">
        <ReceiverStatus bind:error {connectionStatus} />

        <!-- Control Buttons -->
        <ReceiverControlDash
          bind:virtualMicStream
          bind:isVirtualMicActive
          bind:remoteStream
          bind:webrtcHelper
          bind:error
          {stopSendingAudio}
          {changeOutputDevice}
          bind:connectionStatus
        />

        <!-- Audio Player Section -->
        {#if remoteStream}
          <ReceiverAudioPlayer
            bind:selectedOutputDeviceId
            bind:outputDevices
            bind:audioElement
            bind:remoteStream
            {changeOutputDevice}
          />
        {/if}

        <!-- Send System Audio Section -->
        {#if connectionStatus.includes('Conectado')}
          <div class="border border-gray-200 rounded-lg p-6 space-y-4">
            <div>
              <h3 class="text-base font-semibold text-gray-900">Send System Audio to Sender</h3>
              <p class="text-sm text-gray-600 mt-1">
                Capture and send audio from a loopback device that mirrors your output audio
              </p>
            </div>

            <!-- Info Box -->
            <div class="bg-amber-50 border border-amber-200 rounded-md p-4 space-y-2">
              <p class="text-sm font-medium text-amber-900">How to capture output audio:</p>
              <ul class="text-xs text-amber-800 space-y-1 list-disc list-inside">
                <li>
                  <strong>Windows:</strong> Enable "Stereo Mix" in sound settings or install VB-Audio
                  Cable
                </li>
                <li><strong>macOS:</strong> Install BlackHole audio driver</li>
                <li><strong>Linux:</strong> Configure PulseAudio loopback module</li>
              </ul>
              <p class="text-xs text-amber-700 mt-2">
                These tools create virtual INPUT devices that capture your system's OUTPUT audio.
              </p>
            </div>

            <!-- Loopback Device Selector -->
            {#if inputDevices.length > 0}
              <div class="space-y-3">
                <label for="loopbackDevice" class="block text-sm font-medium text-gray-700">
                  Select Loopback Device (Input that captures output)
                </label>
                <select
                  id="loopbackDevice"
                  bind:value={selectedLoopbackDeviceId}
                  disabled={isSendingAudio}
                  class="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {#each inputDevices as device (device.deviceId)}
                    <option value={device.deviceId}>
                      {device.label || `Device ${device.deviceId.substring(0, 8)}`}
                    </option>
                  {/each}
                </select>
                <p class="text-xs text-gray-600">
                  Use a virtual cable to capture the system audio.
                </p>
              </div>
            {/if}

            <!-- Send Control Buttons -->
            <div class="flex items-center gap-3">
              {#if !isSendingAudio}
                <button
                  class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onclick={startSendingAudio}
                  disabled={!selectedLoopbackDeviceId}
                >
                  Start Sending System Audio
                </button>
              {:else}
                <div class="flex items-center gap-3 w-full">
                  <div class="flex-1 bg-green-50 border border-green-200 rounded-md px-4 py-2.5">
                    <p class="text-sm font-medium text-green-800">Sending system audio to sender</p>
                  </div>
                  <button
                    class="px-6 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md font-medium transition-colors"
                    onclick={stopSendingAudio}
                  >
                    Stop
                  </button>
                </div>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Virtual Microphone Status -->
        {#if isVirtualMicActive && virtualMicStream}
          <div class="border border-gray-200 rounded-lg p-6 space-y-4">
            <div>
              <h3 class="text-base font-semibold text-gray-900">Virtual Microphone Active</h3>
              <p class="text-sm text-gray-600 mt-1">
                Received audio is being routed to virtual microphone cable
              </p>
            </div>
            <div class="bg-green-50 border border-green-200 rounded-md p-4 space-y-2">
              <p class="text-sm font-medium text-green-900">✓ Virtual mic stream active</p>
              <div class="space-y-2 mt-3">
                <div class="text-xs text-gray-700">
                  <span class="font-medium">Stream ID:</span>
                  {virtualMicStream.id}
                </div>
                <div class="text-xs text-gray-700">
                  <span class="font-medium">Audio Tracks:</span>
                  <span class="ml-2">{virtualMicStream.getAudioTracks().length}</span>
                </div>
              </div>
              <div class="pt-2 mt-2 border-t border-green-200">
                <p class="text-xs text-gray-600">
                  <strong>How to use:</strong> In your recording software or app, select your virtual
                  audio cable (e.g., VB-Cable Input, CABLE Output) as the microphone/input device to capture
                  this audio.
                </p>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
