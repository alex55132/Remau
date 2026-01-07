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
    isConnecting?: boolean
    signalingURL: string
    onConnect?: (fn: () => Promise<void>) => void
    onDisconnect?: (fn: () => void) => void
  }

  let {
    connectionStatus = $bindable(),
    stopSendingAudio,
    virtualMicStream = $bindable(),
    isVirtualMicActive = $bindable(),
    remoteStream = $bindable(),
    webrtcHelper = $bindable(),
    error = $bindable(),
    changeOutputDevice,
    isConnecting = $bindable(),
    signalingURL,
    onConnect,
    onDisconnect
  }: Props = $props()

  // Expose functions to parent via callbacks
  $effect(() => {
    if (onConnect) {
      onConnect(handleConnect)
    }
    if (onDisconnect) {
      onDisconnect(handleDisconnect)
    }
  })

  let audioContext = $state<AudioContext | null>(null)
  let audioElement = $state<HTMLAudioElement | null>(null)
  let selectedOutputDeviceId = $state<string>('default')
  let internalIsConnecting = $state<boolean>(false)

  // Use provided isConnecting or internal state
  $effect(() => {
    if (isConnecting !== undefined) {
      internalIsConnecting = isConnecting
    }
  })

  async function handleConnect(): Promise<void> {
    if (internalIsConnecting) return

    try {
      internalIsConnecting = true
      if (isConnecting !== undefined) isConnecting = true
      error = null
      connectionStatus = 'Conectando...'

      // Convert WebSocket URL to HTTP if needed
      let urlToUse = signalingURL
      if (urlToUse.startsWith('ws://')) {
        urlToUse = urlToUse.replace('ws://', 'http://')
      } else if (urlToUse.startsWith('wss://')) {
        urlToUse = urlToUse.replace('wss://', 'https://')
      }

      // Crear helper WebRTC (receptor, no iniciador)
      const helper = new WebRTCHelper(urlToUse, false, {
        onStream: (stream) => {
          console.log('🔊 Stream remoto recibido!')
          remoteStream = stream
          connectionStatus = 'Conectado - Reproduciendo'
          internalIsConnecting = false
          if (isConnecting !== undefined) isConnecting = false

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
          internalIsConnecting = false
          if (isConnecting !== undefined) isConnecting = false
        },
        onDisconnect: () => {
          console.log('🔊 Desconectado')
          connectionStatus = 'Desconectado'
          internalIsConnecting = false
          if (isConnecting !== undefined) isConnecting = false
        },
        onError: (err) => {
          console.error('🔊 Error:', err)
          error = err.message
          connectionStatus = 'Error'
          internalIsConnecting = false
          if (isConnecting !== undefined) isConnecting = false
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
      internalIsConnecting = false
      if (isConnecting !== undefined) isConnecting = false
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

  function handleDisconnect(): void {
    console.log('Desconectando...')
    stopSendingAudio()
    stopVirtualMicrophone()
    if (webrtcHelper) {
      webrtcHelper.disconnect()
      webrtcHelper = null
    }
    remoteStream = null
    connectionStatus = 'Desconectado'
    internalIsConnecting = false
    if (isConnecting !== undefined) isConnecting = false
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
          handleConnect()
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
    handleDisconnect()
  })
</script>

<!-- This component now only handles the connection logic, UI is in parent -->
