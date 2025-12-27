<script lang="ts">
  import { onDestroy, onMount } from 'svelte'

  type Props = {
    connectionStatus: string
    virtualMicStream: MediaStream | null
    isVirtualMicActive: boolean
    signalingSocket: WebSocket | null
    remoteStream: MediaStream | null
    peerConnection: RTCPeerConnection | null
    error: string
    stopSendingAudio: () => void
    changeOutputDevice: () => Promise<void>
  }

  let {
    connectionStatus = $bindable(),
    stopSendingAudio,
    virtualMicStream = $bindable(),
    isVirtualMicActive = $bindable(),
    signalingSocket = $bindable(),
    remoteStream = $bindable(),
    peerConnection = $bindable(),
    error = $bindable(),
    changeOutputDevice
  }: Props = $props()

  let audioContext = $state<AudioContext | null>(null)
  let signalingURL = $state<string>('ws://localhost:8080')
  let isConnecting = $state<boolean>(false)
  let audioElement = $state<HTMLAudioElement | null>(null)
  let selectedOutputDeviceId = $state<string>('default')

  async function connect(): Promise<void> {
    if (isConnecting) return

    try {
      isConnecting = true
      error = null
      connectionStatus = 'Conectando...'

      // Obtener URL del servidor de señalización
      const result = await window.api.webrtc.getUrl()
      if (result.success && result.url) {
        signalingURL = result.url
      }

      // Crear RTCPeerConnection
      // Para localhost, no necesitamos STUN servers
      const configuration = {
        iceServers: [],
        iceCandidatePoolSize: 10
      }

      peerConnection = new RTCPeerConnection(configuration)

      console.log('🔊 Receptor: Peer connection creado')

      // Manejar stream remoto
      peerConnection.ontrack = (event) => {
        console.log('Stream remoto recibido!')
        remoteStream = event.streams[0]
        connectionStatus = 'Conectado - Reproduciendo'
        isConnecting = false

        // Crear micrófono virtual automáticamente cuando se recibe el stream
        createVirtualMicrophone()

        // Aplicar el dispositivo de salida seleccionado
        setTimeout(() => {
          if (audioElement && selectedOutputDeviceId !== 'default') {
            changeOutputDevice()
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

      // Manejar cambios de estado
      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection?.connectionState
        console.log('🔊 Receptor - Estado de conexión:', state)
        if (state === 'connected') {
          connectionStatus = 'Conectado'
          isConnecting = false
        } else if (state === 'disconnected' || state === 'failed') {
          connectionStatus = 'Desconectado'
          isConnecting = false
          if (state === 'failed') {
            error = 'La conexión WebRTC falló. Intenta reiniciar el streaming.'
          }
        } else if (state === 'connecting') {
          connectionStatus = 'Conectando...'
        }
      }

      // Manejar estado de ICE
      peerConnection.oniceconnectionstatechange = () => {
        const iceState = peerConnection?.iceConnectionState
        console.log('🔊 Receptor - Estado ICE:', iceState)
      }

      // Conectar al servidor de señalización
      signalingSocket = new WebSocket(signalingURL)

      signalingSocket.onopen = async () => {
        console.log('🔊 Receptor conectado al servidor de señalización')
        console.log('🔊 Esperando offer del emisor...')
        connectionStatus = 'Esperando stream...'

        // Enviar mensaje de ready para que el emisor sepa que estamos listos
        const readyMessage = JSON.stringify({
          type: 'ready',
          data: {}
        })
        console.log('🔊 Enviando mensaje "ready"...')
        signalingSocket?.send(readyMessage)
        console.log('🔊 Mensaje "ready" enviado')
      }

      signalingSocket.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log('🔊 Receptor - Mensaje recibido:', message.type)
          console.log(
            '🔊 Receptor - Contenido del mensaje:',
            JSON.stringify(message).substring(0, 200) + '...'
          )

          if (message.type === 'offer') {
            console.log('🔊 Receptor: ✅ Offer recibido del emisor!')
            console.log('🔊 Receptor: SDP:', message.data?.sdp?.substring(0, 100) + '...')

            if (!peerConnection) {
              console.error('🔊 Receptor: ❌ PeerConnection no existe!')
              return
            }

            await peerConnection.setRemoteDescription(new RTCSessionDescription(message.data))
            console.log('🔊 Receptor: ✅ Remote description establecida')

            const answer = await peerConnection.createAnswer()
            if (answer) {
              await peerConnection.setLocalDescription(answer)
              console.log('🔊 Receptor: ✅ Answer creado')
              console.log('🔊 Receptor: SDP Answer:', answer.sdp?.substring(0, 100) + '...')

              const answerMessage = JSON.stringify({
                type: 'answer',
                data: answer
              })

              if (signalingSocket?.readyState === WebSocket.OPEN) {
                signalingSocket.send(answerMessage)
                console.log('🔊 Receptor: ✅ Answer enviado al emisor')
              } else {
                console.error('🔊 Receptor: ❌ WebSocket cerrado, no se puede enviar answer')
              }
            }
          } else if (message.type === 'answer') {
            console.log('🔄 Receptor: Answer de renegociación recibido del emisor')
            if (peerConnection) {
              await peerConnection.setRemoteDescription(new RTCSessionDescription(message.data))
              console.log('🔄 Receptor: Remote description actualizada con answer')
            }
          } else if (message.type === 'ice-candidate') {
            console.log('🔊 Receptor: ICE candidate recibido')
            if (message.data && peerConnection) {
              await peerConnection.addIceCandidate(new RTCIceCandidate(message.data))
            }
          }
        } catch (err) {
          console.error('🔊 Receptor - Error procesando mensaje:', err)
          error = err instanceof Error ? err.message : 'Error desconocido'
        }
      }

      signalingSocket.onerror = (err) => {
        console.error('Error en WebSocket:', err)
        error = 'Error en la conexión de señalización'
        connectionStatus = 'Error'
        isConnecting = false
      }

      signalingSocket.onclose = () => {
        console.log('Conexión de señalización cerrada')
        connectionStatus = 'Desconectado'
        isConnecting = false
      }
    } catch (err) {
      console.error('Error al conectar:', err)
      error = err instanceof Error ? err.message : 'Error desconocido'
      connectionStatus = 'Error'
      isConnecting = false
    }
  }

  function createVirtualMicrophone(): void {
    try {
      if (!remoteStream) {
        console.error('No hay stream remoto para convertir')
        return
      }

      // Crear AudioContext
      const AudioContextClass =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextClass) {
        throw new Error('AudioContext no disponible')
      }

      audioContext = new AudioContextClass()

      // Crear fuente desde el stream remoto
      const source = audioContext.createMediaStreamSource(remoteStream)

      // Crear destino para el nuevo stream
      const destination = audioContext.createMediaStreamDestination()

      // Conectar fuente al destino
      source.connect(destination)

      // El stream de destino es nuestro micrófono virtual
      virtualMicStream = destination.stream

      isVirtualMicActive = true
      console.log('Micrófono virtual creado:', virtualMicStream.id)
      console.log(
        'Este stream puede ser usado como entrada de micrófono en otras aplicaciones de esta sesión'
      )
    } catch (err) {
      console.error('Error creando micrófono virtual:', err)
      error = err instanceof Error ? err.message : 'Error al crear micrófono virtual'
    }
  }

  function stopVirtualMicrophone(): void {
    if (audioContext) {
      audioContext.close()
      audioContext = null
    }
    virtualMicStream = null
    isVirtualMicActive = false
  }

  function disconnect(): void {
    console.log('Desconectando...')
    stopSendingAudio()
    stopVirtualMicrophone()
    if (signalingSocket) {
      signalingSocket.close()
      signalingSocket = null
    }
    if (peerConnection) {
      peerConnection.close()
      peerConnection = null
    }
    remoteStream = null
    connectionStatus = 'Desconectado'
    isConnecting = false
  }

  onMount(() => {
    // Verificar periódicamente si el servidor está activo
    const checkInterval = setInterval(async () => {
      try {
        const result = await window.api.webrtc.getUrl()
        if (
          result.success &&
          result.url &&
          connectionStatus === 'Esperando a que el emisor inicie el streaming'
        ) {
          console.log('🔊 Servidor de señalización detectado, conectando...')
          clearInterval(checkInterval)
          connect()
        }
      } catch {
        // Servidor aún no iniciado
      }
    }, 1000)

    connectionStatus = 'Esperando a que el emisor inicie el streaming'

    // Limpiar el intervalo después de 30 segundos
    setTimeout(() => clearInterval(checkInterval), 30000)
  })

  onDestroy(() => {
    disconnect()
  })
</script>

<div class="flex gap-3 justify-start flex-wrap">
  {#if connectionStatus.includes('Conectado')}
    <button
      class="px-6 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md font-medium transition-colors"
      onclick={disconnect}
    >
      Disconnect
    </button>
  {:else if !isConnecting}
    <button
      class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
      onclick={connect}
    >
      {connectionStatus === 'Error' || connectionStatus.includes('Error')
        ? 'Retry Connection'
        : 'Connect'}
    </button>
  {:else}
    <button
      class="px-6 py-2.5 bg-blue-400 text-white rounded-md font-medium cursor-not-allowed"
      disabled
    >
      <span class="flex items-center gap-2">
        <span
          class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"
        ></span>
        Connecting...
      </span>
    </button>
  {/if}

  <button
    class="px-6 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md font-medium transition-colors"
    onclick={async () => {
      try {
        await window.api.window.openSettings()
      } catch (err) {
        console.error('Error abriendo configuración:', err)
      }
    }}
  >
    Settings
  </button>
</div>
