<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { WebRTCHelper } from '../../lib/WebrtcHelper'

  type Props = {
    connectionStatus: string
    virtualMicStream: MediaStream | null
    isVirtualMicActive: boolean
    remoteStream: MediaStream | null
    webrtcHelper: WebRTCHelper | null
    error: string
    stopSendingAudio: () => void
    changeOutputDevice: () => Promise<void>
  }

  let {
    connectionStatus = $bindable(),
    stopSendingAudio,
    virtualMicStream = $bindable(),
    isVirtualMicActive = $bindable(),
    remoteStream = $bindable(),
    webrtcHelper = $bindable(),
    error = $bindable(),
    changeOutputDevice
  }: Props = $props()

  let audioContext = $state<AudioContext | null>(null)
  let signalingURL = $state<string>('http://localhost:8080')
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
        signalingURL = result.url.replace('ws://', 'http://').replace('wss://', 'https://')
      }

      // Crear helper WebRTC (receptor, no iniciador)
      const helper = new WebRTCHelper(signalingURL, false, {
        onStream: (stream) => {
          console.log('🔊 Stream remoto recibido!')
          remoteStream = stream
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
        },
        onConnect: () => {
          console.log('🔊 Conexión establecida')
          connectionStatus = 'Conectado'
          isConnecting = false
        },
        onDisconnect: () => {
          console.log('🔊 Desconectado')
          connectionStatus = 'Desconectado'
          isConnecting = false
        },
        onError: (err) => {
          console.error('🔊 Error:', err)
          error = err.message
          connectionStatus = 'Error'
          isConnecting = false
        }
      })

      // Conectar
      await helper.connect()
      webrtcHelper = helper
      connectionStatus = 'Esperando stream...'
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
    if (webrtcHelper) {
      webrtcHelper.disconnect()
      webrtcHelper = null
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
