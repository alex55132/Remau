<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import ReceiverAudioPlayer from './components/Receiver/ReceiverAudioPlayer.svelte'
  import ReceiverControlDash from './components/Receiver/ReceiverControlDash.svelte'
  import { AudioManager } from './lib/AudioManager'
  import { WebRTCHelper } from './lib/WebrtcHelper'

  let webrtcHelper = $state<WebRTCHelper | null>(null)
  let remoteStream = $state<MediaStream | null>(null)
  let virtualMicStream = $state<MediaStream | null>(null)

  let connectionStatus = $state<string>('Desconectado')
  let error = $state<string | null>(null)
  let isVirtualMicActive = $state<boolean>(false)
  let isConnecting = $state<boolean>(false)

  // Functions to be assigned by ReceiverControlDash
  let connectFn: (() => Promise<void>) | null = $state(null)
  let disconnectFn: (() => void) | null = $state(null)

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

<div
  class="min-h-screen min-w-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 p-4 sm:p-6 lg:p-8 relative overflow-hidden"
>
  <!-- Background decorative elements -->
  <div class="absolute inset-0 overflow-hidden pointer-events-none">
    <div class="absolute -top-40 -right-40 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl"></div>
    <div class="absolute -bottom-40 -left-40 w-96 h-96 bg-pink-400/10 rounded-full blur-3xl"></div>
  </div>

  <div class="w-full relative z-10">
    <div
      class="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden w-full"
    >
      <!-- Header Section with Gradient -->
      <div class="relative bg-gradient-to-r from-purple-600 to-pink-600 px-6 sm:px-8 py-6 sm:py-8">
        <div class="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
        <div class="relative">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                </svg>
              </div>
              <div>
                <h1 class="text-2xl sm:text-3xl font-bold text-white">Audio Receiver</h1>
                <p class="text-purple-100 text-xs sm:text-sm mt-1">
                  Receive and play audio in real-time
                </p>
              </div>
            </div>

            <!-- Status Indicator with Connect/Disconnect Button -->
            <div class="flex items-center gap-3">
              {#if connectionStatus.includes('Conectado')}
                <div
                  class="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg"
                >
                  <span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <span class="text-white text-sm font-medium">Connected</span>
                </div>
                {#if disconnectFn}
                  <button
                    onclick={disconnectFn}
                    class="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-white text-sm font-medium transition-colors"
                    aria-label="Disconnect"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Disconnect
                  </button>
                {/if}
              {:else if connectionStatus === 'Conectando...' || isConnecting}
                <div
                  class="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg"
                >
                  <span
                    class="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full"
                  ></span>
                  <span class="text-white text-sm font-medium">Connecting...</span>
                </div>
              {:else}
                <div
                  class="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg"
                >
                  <span class="w-2 h-2 bg-slate-300 rounded-full"></span>
                  <span class="text-purple-100 text-sm font-medium">Disconnected</span>
                </div>
                {#if connectFn}
                  <button
                    onclick={connectFn}
                    disabled={isConnecting}
                    class="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Connect"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    {connectionStatus === 'Error' || connectionStatus.includes('Error')
                      ? 'Retry'
                      : 'Connect'}
                  </button>
                {/if}
              {/if}
            </div>
          </div>
        </div>
      </div>

      <!-- Error Display (if any) -->
      {#if error}
        <div class="mx-6 sm:mx-8 mt-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div class="flex-1">
              <p class="text-sm font-medium text-red-800">{error}</p>
            </div>
            <button
              onclick={() => (error = null)}
              class="text-red-500 hover:text-red-700 transition-colors"
              aria-label="Dismiss error"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      {/if}

      <div class="p-6 sm:p-8">
        <!-- Main Content Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left Column: Main Controls -->
          <div class="lg:col-span-2 space-y-6">
            <!-- ReceiverControlDash handles connection logic (no UI) -->
            <ReceiverControlDash
              bind:virtualMicStream
              bind:isVirtualMicActive
              bind:remoteStream
              bind:webrtcHelper
              bind:error
              {stopSendingAudio}
              {changeOutputDevice}
              bind:connectionStatus
              bind:isConnecting
              onConnect={(fn) => (connectFn = fn)}
              onDisconnect={(fn) => (disconnectFn = fn)}
            />

            <!-- Audio Player Section -->
            {#if remoteStream}
              <div
                class="bg-gradient-to-br from-white to-blue-50/50 rounded-xl border-2 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <ReceiverAudioPlayer
                  bind:selectedOutputDeviceId
                  bind:outputDevices
                  bind:audioElement
                  bind:remoteStream
                  {changeOutputDevice}
                />
              </div>
            {/if}
          </div>

          <div class="lg:col-span-1 space-y-6">
            <!-- Virtual Microphone Status -->
            {#if isVirtualMicActive && virtualMicStream}
              <div
                class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden sticky top-6"
              >
                <div class="bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-3">
                  <h3 class="text-white font-semibold flex items-center gap-2 text-sm sm:text-base">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                      />
                    </svg>
                    Virtual Microphone
                  </h3>
                </div>
                <div class="p-4 space-y-4">
                  <div class="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                    <div class="flex items-center gap-2">
                      <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      <p class="text-sm font-medium text-green-900">Virtual mic stream active</p>
                    </div>
                    <div class="space-y-2 pt-2 border-t border-green-200">
                      <div class="text-xs text-gray-700">
                        <span class="font-medium">Stream ID:</span>
                        <span class="ml-2 font-mono text-xs break-all">{virtualMicStream.id}</span>
                      </div>
                      <div class="text-xs text-gray-700">
                        <span class="font-medium">Audio Tracks:</span>
                        <span class="ml-2">{virtualMicStream.getAudioTracks().length}</span>
                      </div>
                    </div>
                    <div class="pt-2 mt-2 border-t border-green-200">
                      <p class="text-xs text-gray-600">
                        <strong>How to use:</strong> In your recording software or app, select your virtual
                        audio cable (e.g., VB-Cable Input, CABLE Output) as the microphone/input device
                        to capture this audio.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            {:else}
              <!-- Placeholder when no virtual mic -->
              <div
                class="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 p-6 text-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-12 h-12 text-slate-400 mx-auto mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
                <p class="text-sm text-slate-500 font-medium">Virtual mic inactive</p>
                <p class="text-xs text-slate-400 mt-1">Connect to enable virtual microphone</p>
              </div>
            {/if}

            <!-- Send System Audio Section -->
            {#if connectionStatus.includes('Conectado')}
              <div
                class="bg-gradient-to-br from-white to-amber-50/50 rounded-xl border-2 border-amber-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
              >
                <div class="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3">
                  <h3 class="text-white font-semibold flex items-center gap-2 text-sm sm:text-base">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                      />
                    </svg>
                    Send System Audio to Sender
                  </h3>
                </div>
                <div class="p-4 space-y-4">
                  <p class="text-sm text-gray-600">
                    Capture and send audio from a loopback device that mirrors your output audio
                  </p>

                  <!-- Info Box -->
                  <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
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
                      These tools create virtual INPUT devices that capture your system's OUTPUT
                      audio.
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
                        class="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
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
                        class="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        onclick={startSendingAudio}
                        disabled={!selectedLoopbackDeviceId}
                      >
                        Start Sending System Audio
                      </button>
                    {:else}
                      <div class="flex items-center gap-3 w-full">
                        <div
                          class="flex-1 bg-green-50 border border-green-200 rounded-md px-4 py-2.5"
                        >
                          <p class="text-sm font-medium text-green-800">
                            Sending system audio to sender
                          </p>
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
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
