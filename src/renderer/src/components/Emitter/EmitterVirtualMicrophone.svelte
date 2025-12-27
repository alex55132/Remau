<script lang="ts">
  import { onDestroy } from 'svelte'

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

  let peerConnection = $state<RTCPeerConnection | null>(null)
  let signalingSocket = $state<WebSocket | null>(null)

  async function startWebRTCStreaming(): Promise<void> {
    if (!virtualMicStream) {
      error = 'Primero debes iniciar la emision como microfono'
      return
    }

    try {
      error = null

      // Iniciar servidor de se?alizaci?n
      const result = await window.api.webrtc.start()
      if (!result.success) {
        error = result.error || 'Error al iniciar el servidor de se?alizaci?n'
        return
      }

      signalingURL = result.url || null

      // Crear RTCPeerConnection
      // Para localhost, no necesitamos STUN servers
      const configuration = {
        iceServers: [],
        iceCandidatePoolSize: 10
      }

      peerConnection = new RTCPeerConnection(configuration)

      console.log('??? Emisor: Peer connection creado')

      // Agregar el stream virtual como track de audio
      const audioTracks = virtualMicStream.getAudioTracks()
      if (audioTracks.length > 0) {
        peerConnection.addTrack(audioTracks[0], virtualMicStream)
        console.log('Track de audio agregado al peer connection')
      }

      // Manejar tracks entrantes del receptor
      peerConnection.ontrack = (event) => {
        console.log('🎙️ Emisor: Track recibido del receptor!')
        console.log('Event streams:', event.streams)
        console.log('Event tracks:', event.track)
        receiverAudioStream = event.streams[0]
        isPlayingReceiverAudio = false
        console.log('🎙️ Emisor: Stream del receptor disponible:', receiverAudioStream)
        console.log('🎙️ UI section should now be visible!')

        // Apply the selected output device after a short delay
        setTimeout(() => {
          if (receiverAudioElement && selectedReceiverOutputDeviceId !== 'default') {
            changeReceiverOutputDevice()
          }
        }, 500)
      }

      // Manejar ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && signalingSocket) {
          signalingSocket.send(
            JSON.stringify({
              type: 'ice-candidate',
              data: event.candidate
            })
          )
        }
      }

      // Manejar cambios de estado de conexi?n
      peerConnection.onconnectionstatechange = () => {
        console.log('Estado de conexi?n WebRTC:', peerConnection?.connectionState)
        if (peerConnection?.connectionState === 'failed') {
          error = 'Error en la conexi?n WebRTC'
        }
      }

      // Conectar al servidor de se?alizaci?n
      if (!signalingURL) {
        throw new Error('URL de se?alizaci?n no disponible')
      }

      signalingSocket = new WebSocket(signalingURL)

      let receiverReady = false

      signalingSocket.onopen = () => {
        console.log('??? Emisor conectado al servidor de se?alizaci?n')
        console.log('??? Esperando mensaje "ready" del receptor...')
      }

      signalingSocket.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log('??? Emisor - Mensaje recibido:', message.type)

          if (message.type === 'ready') {
            if (!receiverReady) {
              console.log('??? Emisor: ? Receptor est? listo!')
              receiverReady = true

              // Ahora que el receptor est? listo, crear y enviar offer
              console.log('??? Creando offer...')
              const offer = await peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false
              })

              console.log('??? Offer creado:', offer.type)
              console.log('??? SDP:', offer.sdp?.substring(0, 100) + '...')
              await peerConnection.setLocalDescription(offer)
              console.log('??? Local description establecida')

              const offerMessage = JSON.stringify({
                type: 'offer',
                data: offer
              })

              console.log('??? Enviando offer al servidor de se?alizaci?n...')
              console.log('??? Tama?o del mensaje:', offerMessage.length, 'bytes')

              if (signalingSocket?.readyState === WebSocket.OPEN) {
                signalingSocket.send(offerMessage)
                console.log('??? ? Offer enviado al servidor!')
              } else {
                console.error('??? ? WebSocket no est? abierto')
              }
            } else {
              console.log('??? Emisor: Ignorando mensaje ready duplicado')
            }
          } else if (message.type === 'offer' && peerConnection) {
            console.log('🔄 Emisor: Offer de renegociación recibido del receptor')
            await peerConnection.setRemoteDescription(new RTCSessionDescription(message.data))
            console.log('🔄 Emisor: Remote description actualizada')

            // Create and send answer for renegotiation
            const answer = await peerConnection.createAnswer()
            await peerConnection.setLocalDescription(answer)
            console.log('🔄 Emisor: Answer de renegociación creado')

            if (signalingSocket?.readyState === WebSocket.OPEN) {
              signalingSocket.send(
                JSON.stringify({
                  type: 'answer',
                  data: answer
                })
              )
              console.log('🔄 Emisor: Answer de renegociación enviado')
            }
          } else if (message.type === 'answer' && peerConnection) {
            console.log('??? Emisor: ? Answer recibido del receptor')
            await peerConnection.setRemoteDescription(new RTCSessionDescription(message.data))
            console.log('??? Emisor: ? Remote description establecida - Conexi?n P2P en progreso')
          } else if (message.type === 'ice-candidate' && peerConnection) {
            console.log('??? Emisor: ICE candidate recibido')
            if (message.data) {
              await peerConnection.addIceCandidate(new RTCIceCandidate(message.data))
            }
          }
        } catch (err) {
          console.error('??? Emisor - Error procesando mensaje:', err)
        }
      }

      signalingSocket.onerror = (err) => {
        console.error('Error en WebSocket de se?alizaci?n:', err)
        error = 'Error en la conexi?n de se?alizaci?n'
      }

      signalingSocket.onclose = () => {
        console.log('Conexi?n de se?alizaci?n cerrada')
      }

      isWebRTCStreaming = true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      error = `Error al iniciar streaming WebRTC: ${errorMessage}`
      console.error('Error:', err)
      await stopWebRTCStreaming()
    }
  }

  async function stopWebRTCStreaming(): Promise<void> {
    try {
      if (signalingSocket) {
        signalingSocket.close()
        signalingSocket = null
      }

      if (peerConnection) {
        peerConnection.close()
        peerConnection = null
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

        <!-- Open Receiver Button -->
        <button
          class="w-full px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
          onclick={async () => {
            try {
              const result = await window.api.window.openReceiver()
              if (result.success) {
                console.log(result.message)
              }
            } catch (err) {
              error = err instanceof Error ? err.message : 'Error opening receiver'
            }
          }}
        >
          Open Receiver Window
        </button>
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
