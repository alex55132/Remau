import { EventEmitter } from 'events'
import { createServer, Server } from 'http'
import { WebSocket, WebSocketServer } from 'ws'

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'ready'
  data?: any
}

export class WebRTCSignalingServer extends EventEmitter {
  private server: Server | null = null
  private wss: WebSocketServer | null = null
  private clients: Set<WebSocket> = new Set()
  private readonly port: number

  constructor(port = 8080) {
    super()
    this.port = port
  }

  start(): void {
    this.server = createServer()
    this.wss = new WebSocketServer({ server: this.server })

    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = Math.random().toString(36).substring(7)
      console.log(`✨ Nuevo cliente conectado: ${clientId}`)
      console.log(`📊 Total de clientes conectados: ${this.clients.size + 1}`)
      this.clients.add(ws)

      ws.on('message', (message: string) => {
        try {
          const data: SignalingMessage = JSON.parse(message.toString())
          console.log(`📨 [${clientId}] Mensaje recibido:`, data.type)
          console.log(`📊 Clientes conectados actualmente: ${this.clients.size}`)

          // Contar cuántos clientes recibirán el mensaje
          let sentCount = 0
          let clientDetails: string[] = []

          // Reenviar el mensaje a todos los demás clientes
          this.clients.forEach((client) => {
            if (client !== ws) {
              if (client.readyState === WebSocket.OPEN) {
                console.log(`📤 Reenviando ${data.type} a otro cliente`)
                client.send(JSON.stringify(data))
                sentCount++
                clientDetails.push('OPEN')
              } else {
                console.warn(`⚠️ Cliente con estado: ${client.readyState} (no OPEN)`)
                clientDetails.push(`Estado: ${client.readyState}`)
              }
            }
          })

          console.log(`📊 Estados de clientes: ${clientDetails.join(', ')}`)

          if (sentCount === 0) {
            console.warn(`⚠️ No hay otros clientes para recibir el mensaje ${data.type}`)
            console.warn(`⚠️ Total de clientes: ${this.clients.size}`)
            console.warn(`⚠️ Este mensaje: ${message.toString().substring(0, 200)}...`)
          } else {
            console.log(`✅ Mensaje ${data.type} enviado a ${sentCount} cliente(s)`)
          }

          // Si es un offer, también notificar al servidor
          if (data.type === 'offer') {
            this.emit('offer', data.data)
          }
        } catch (err) {
          console.error('❌ Error procesando mensaje de señalización:', err)
          console.error('❌ Mensaje problemático:', message.toString().substring(0, 200))
        }
      })

      ws.on('close', () => {
        console.log(`👋 Cliente ${clientId} desconectado`)
        this.clients.delete(ws)
        console.log(`📊 Clientes restantes: ${this.clients.size}`)
      })

      ws.on('error', (err) => {
        console.error(`❌ Error en WebSocket [${clientId}]:`, err)
        this.clients.delete(ws)
      })

      // No enviar mensaje de bienvenida automático
      // Los clientes enviarán sus propios mensajes
      console.log(`✅ Cliente ${clientId} listo para recibir mensajes`)
    })

    this.server.listen(this.port, '0.0.0.0', () => {
      console.log(`WebRTC Signaling Server listening on ws://0.0.0.0:${this.port}`)
      console.log(`WebRTC Signaling Server también disponible en ws://localhost:${this.port}`)
      this.emit('started', this.port)
    })

    this.server.on('error', (err) => {
      console.error('WebRTC Signaling Server error:', err)
      this.emit('error', err)
    })
  }

  broadcast(message: SignalingMessage): void {
    const data = JSON.stringify(message)
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data)
      }
    })
  }

  stop(): void {
    if (this.wss) {
      this.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.close()
        }
      })
      this.clients.clear()
      this.wss.close()
      this.wss = null
    }

    if (this.server) {
      this.server.close()
      this.server = null
    }

    this.emit('stopped')
  }

  getSignalingURL(): string {
    return `ws://localhost:${this.port}`
  }

  isActive(): boolean {
    return this.server !== null && this.wss !== null
  }
}
