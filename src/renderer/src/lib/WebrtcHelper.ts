import SimplePeer from 'simple-peer'
import { io, Socket } from 'socket.io-client'

// Type guard for SimplePeer
function isSimplePeer(peer: any): peer is SimplePeer.Instance {
  return peer && typeof peer.on === 'function' && typeof peer.signal === 'function'
}

export interface WebRTCHelperCallbacks {
  onStream?: (stream: MediaStream) => void
  onError?: (error: Error) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onConnectionStateChange?: (state: string) => void
}

export class WebRTCHelper {
  private peer: SimplePeer.Instance | null = null
  private socket: Socket | null = null
  private signalingURL: string
  private callbacks: WebRTCHelperCallbacks
  private isInitiator: boolean
  private stream: MediaStream | null = null

  private iceServers: RTCIceServer[] = []

  constructor(
    signalingURL: string,
    isInitiator: boolean,
    callbacks: WebRTCHelperCallbacks = {},
    iceServers: RTCIceServer[] = []
  ) {
    this.signalingURL = signalingURL
    this.isInitiator = isInitiator
    this.callbacks = callbacks
    this.iceServers = iceServers
  }

  async connect(stream?: MediaStream): Promise<void> {
    try {
      this.stream = stream || null

      // Si es el iniciador, asegurar que el servidor esté corriendo
      if (this.isInitiator) {
        try {
          const result = await window.api.webrtc.start()
          if (result.success && result.url) {
            this.signalingURL = result.url.replace('ws://', 'http://').replace('wss://', 'https://')
          }
        } catch (err) {
          console.warn(
            '⚠️ No se pudo iniciar el servidor, intentando conectar de todas formas:',
            err
          )
        }
      } else {
        // Si es receptor, obtener la URL del servidor si está disponible
        try {
          const result = await window.api.webrtc.getUrl()
          if (result.success && result.url) {
            this.signalingURL = result.url.replace('ws://', 'http://').replace('wss://', 'https://')
          }
        } catch (err) {
          console.warn('⚠️ Servidor no disponible aún:', err)
        }
      }

      // Conectar a Socket.io
      this.socket = io(this.signalingURL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      })

      // Esperar a que el socket se conecte
      await new Promise<void>((resolve, reject) => {
        if (this.socket?.connected) {
          resolve()
          return
        }

        this.socket?.on('connect', () => {
          console.log('✅ Conectado al servidor de señalización')
          resolve()
        })

        this.socket?.on('connect_error', (err) => {
          console.error('❌ Error conectando a Socket.io:', err)
          reject(err)
        })
      })

      // El peer se creará después, cuando el receptor esté listo (para el iniciador)
      // o inmediatamente (para el receptor)

      // Escuchar señales del servidor ANTES de crear el peer
      // Esto asegura que no perdamos señales si llegan antes de que el peer esté listo
      const pendingSignals: any[] = []
      this.socket.on('signal', (data) => {
        console.log('📥 Señal recibida:', data.type || 'signal')
        if (this.peer && !this.peer.destroyed) {
          try {
            this.peer.signal(data)
          } catch (err) {
            console.error('❌ Error procesando señal:', err)
            this.callbacks.onError?.(
              err instanceof Error ? err : new Error('Signal processing error')
            )
          }
        } else {
          // Guardar señales pendientes si el peer aún no está creado
          console.log('⏳ Peer no listo aún, guardando señal pendiente')
          pendingSignals.push(data)
        }
      })

      // Manejar desconexión del socket
      this.socket.on('disconnect', () => {
        console.log('❌ Desconectado del servidor de señalización')
        this.callbacks.onDisconnect?.()
      })

      // Si es el receptor, enviar ready cuando esté listo y crear el peer
      if (!this.isInitiator) {
        console.log('📢 Enviando mensaje "ready"...')
        this.socket.emit('ready')

        // Crear peer inmediatamente para el receptor
        this.createPeer()

        // Procesar señales pendientes si las hay
        if (pendingSignals.length > 0) {
          console.log(`📨 Procesando ${pendingSignals.length} señales pendientes`)
          pendingSignals.forEach((signal) => {
            if (this.peer && !this.peer.destroyed) {
              try {
                this.peer.signal(signal)
              } catch (err) {
                console.error('❌ Error procesando señal pendiente:', err)
              }
            }
          })
        }
      } else {
        // Si es el emisor, esperar a que el receptor esté listo antes de crear el peer
        this.socket.on('ready', () => {
          console.log('✅ Receptor listo, creando peer iniciador...')
          this.createPeer()

          // Procesar señales pendientes si las hay
          if (pendingSignals.length > 0) {
            console.log(`📨 Procesando ${pendingSignals.length} señales pendientes`)
            pendingSignals.forEach((signal) => {
              if (this.peer && !this.peer.destroyed) {
                try {
                  this.peer.signal(signal)
                } catch (err) {
                  console.error('❌ Error procesando señal pendiente:', err)
                }
              }
            })
          }
        })
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      console.error('❌ Error al conectar:', error)
      this.callbacks.onError?.(error)
      throw error
    }
  }

  private createPeer(): void {
    try {
      // Validar stream si está presente
      if (this.stream) {
        const tracks = this.stream.getTracks()
        console.log(
          `🔧 Creando peer (initiator: ${this.isInitiator}, stream: present, ${tracks.length} tracks)`
        )

        if (tracks.length === 0) {
          console.error('❌ Stream no tiene tracks!')
          throw new Error('Stream has no tracks')
        }

        tracks.forEach((track) => {
          console.log(
            `  - Track: ${track.kind} ${track.id}, enabled: ${track.enabled}, state: ${track.readyState}, label: ${track.label || 'no label'}`
          )
          if (track.readyState === 'ended') {
            console.warn('⚠️ Track está ended, esto puede causar problemas')
          }
        })
      } else {
        console.log(`🔧 Creando peer (initiator: ${this.isInitiator}, stream: none)`)
      }

      this.peer = new SimplePeer({
        initiator: this.isInitiator,
        trickle: false,
        stream: this.stream || undefined,
        config: {
          iceServers: this.iceServers
        }
      }) as SimplePeer.Instance

      if (!isSimplePeer(this.peer)) {
        throw new Error('Failed to create SimplePeer instance')
      }

      // Manejar señales de simple-peer y enviarlas a través de Socket.io
      this.peer.on('signal', (data) => {
        console.log('📤 Enviando señal:', data.type || 'signal', data)
        this.socket?.emit('signal', data)
      })

      // Manejar stream recibido
      this.peer.on('stream', (stream) => {
        const tracks = stream.getTracks()
        console.log('📥 Stream recibido!', stream.id, tracks.length, 'tracks')
        tracks.forEach((track) => {
          console.log(
            `  - Track recibido: ${track.kind} ${track.id}, enabled: ${track.enabled}, state: ${track.readyState}`
          )
        })
        this.callbacks.onStream?.(stream)
      })

      // Manejar conexión establecida
      this.peer.on('connect', () => {
        console.log('✅ Conexión WebRTC establecida')
        this.callbacks.onConnect?.()
      })

      // Manejar errores
      this.peer.on('error', (err) => {
        console.error('❌ Error en WebRTC:', err)
        this.callbacks.onError?.(err)
      })

      // Manejar cierre de conexión
      this.peer.on('close', () => {
        console.log('🔌 Conexión WebRTC cerrada')
        this.callbacks.onDisconnect?.()
      })

      console.log('✅ Peer creado exitosamente')
    } catch (err) {
      console.error('Error creating SimplePeer:', err)
      throw new Error(
        `Failed to initialize WebRTC peer: ${err instanceof Error ? err.message : 'Unknown error'}`
      )
    }
  }

  disconnect(): void {
    console.log('🔌 Desconectando WebRTC...')
    if (this.peer) {
      this.peer.destroy()
      this.peer = null
    }
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
    }
  }

  getConnectionState(): string {
    if (!this.peer) return 'closed'
    // simple-peer doesn't expose connectionState directly, but we can infer
    return this.peer.destroyed ? 'closed' : 'connected'
  }

  isConnected(): boolean {
    return this.peer !== null && !this.peer.destroyed && this.socket?.connected === true
  }

  addStream(stream: MediaStream): void {
    if (!this.peer || this.peer.destroyed) {
      throw new Error('Peer connection is not established')
    }
    this.peer.addStream(stream)
    console.log('📤 Stream agregado al peer:', stream.id)
  }

  removeStream(stream: MediaStream): void {
    if (!this.peer || this.peer.destroyed) {
      return
    }
    this.peer.removeStream(stream)
    console.log('📤 Stream removido del peer:', stream.id)
  }
}
