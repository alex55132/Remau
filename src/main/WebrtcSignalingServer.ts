import { EventEmitter } from 'events'
import { createServer, Server } from 'http'
import { Socket, Server as SocketIOServer } from 'socket.io'

export class WebRTCSignalingServer extends EventEmitter {
  private server: Server | null = null
  private io: SocketIOServer | null = null
  private readonly port: number

  constructor(port = 8080) {
    super()
    this.port = port
  }

  start(): void {
    this.server = createServer()
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    })

    this.io.on('connection', (socket: Socket) => {
      const clientId = socket.id
      console.log(`✨ Nuevo cliente conectado: ${clientId}`)
      console.log(`📊 Total de clientes conectados: ${this.io?.sockets.sockets.size || 0}`)

      // Reenviar todos los mensajes de señalización a otros clientes
      socket.on('signal', (data: any) => {
        console.log(`📨 [${clientId}] Señal recibida:`, data.type || 'signal')
        socket.broadcast.emit('signal', data)
      })

      socket.on('ready', () => {
        console.log(`✅ [${clientId}] Cliente listo`)
        socket.broadcast.emit('ready')
      })

      socket.on('disconnect', () => {
        console.log(`👋 Cliente ${clientId} desconectado`)
        console.log(`📊 Clientes restantes: ${this.io?.sockets.sockets.size || 0}`)
      })

      socket.on('error', (err) => {
        console.error(`❌ Error en Socket [${clientId}]:`, err)
      })
    })

    this.server.listen(this.port, '0.0.0.0', () => {
      console.log(`WebRTC Signaling Server listening on http://0.0.0.0:${this.port}`)
      console.log(`WebRTC Signaling Server también disponible en http://localhost:${this.port}`)
      this.emit('started', this.port)
    })

    this.server.on('error', (err) => {
      console.error('WebRTC Signaling Server error:', err)
      this.emit('error', err)
    })
  }

  stop(): void {
    if (this.io) {
      this.io.close()
      this.io = null
    }

    if (this.server) {
      this.server.close()
      this.server = null
    }

    this.emit('stopped')
  }

  getSignalingURL(): string {
    return `http://localhost:${this.port}`
  }

  isActive(): boolean {
    return this.server !== null && this.io !== null
  }
}
