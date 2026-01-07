import { platform } from 'os'

export interface VirtualDriverInfo {
  name: string
  installed: boolean
  platform: string
}

export class VirtualAudioDriver {
  constructor() {
    // Ruta donde estarán los instaladores de drivers
    // En producción: resources/drivers
    // En desarrollo: resources/drivers
  }

  /**
   * Detecta el sistema operativo y devuelve información del driver recomendado
   */
  getRecommendedDriver(): VirtualDriverInfo {
    const os = platform()

    switch (os) {
      case 'win32':
        return {
          name: 'VB-Audio Virtual Cable',
          installed: this.isVBCableInstalled(),
          platform: 'Windows'
        }

      case 'darwin':
        return {
          name: 'BlackHole',
          installed: this.isBlackHoleInstalled(),
          platform: 'macOS'
        }

      case 'linux':
        return {
          name: 'PulseAudio Loopback',
          installed: this.isPulseAudioInstalled(),
          platform: 'Linux'
          // No necesita instalador, usa comando nativo
        }

      default:
        return {
          name: 'Unknown',
          installed: false,
          platform: os
        }
    }
  }

  /**
   * Verifica si VB-Cable está instalado en Windows
   */
  private isVBCableInstalled(): boolean {
    if (platform() !== 'win32') return false

    try {
      const { execSync } = require('child_process')

      // Método 1: Buscar en el registro (tanto 32-bit como 64-bit)
      try {
        const result1 = execSync(
          'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall" /s /f "VB-Audio" 2>nul',
          { encoding: 'utf8', stdio: 'pipe' }
        )
        if (result1.includes('VB-Audio') || result1.includes('VBCABLE')) {
          console.log('VB-Cable detectado en registro (64-bit)')
          return true
        }
      } catch (e) {
        // Ignorar error y probar siguiente método
      }

      // Método 2: Buscar en registro WOW6432Node (aplicaciones 32-bit en Windows 64-bit)
      try {
        const result2 = execSync(
          'reg query "HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall" /s /f "VB-Audio" 2>nul',
          { encoding: 'utf8', stdio: 'pipe' }
        )
        if (result2.includes('VB-Audio') || result2.includes('VBCABLE')) {
          console.log('VB-Cable detectado en registro (32-bit)')
          return true
        }
      } catch (e) {
        // Ignorar error y probar siguiente método
      }

      // Método 3: Verificar dispositivos de audio directamente usando PowerShell
      try {
        const psCommand =
          'Get-PnpDevice -Class "MEDIA" | Where-Object {$_.FriendlyName -like "*CABLE*" -or $_.FriendlyName -like "*VB-Audio*"} | Select-Object -First 1'
        const result3 = execSync(`powershell -Command "${psCommand}"`, {
          encoding: 'utf8',
          stdio: 'pipe',
          timeout: 5000
        })
        if (result3.includes('CABLE') || result3.includes('VB-Audio')) {
          console.log('VB-Cable detectado mediante PowerShell')
          return true
        }
      } catch (e) {
        // Ignorar error y probar siguiente método
      }

      // Método 4: Verificar archivos del driver
      const { existsSync } = require('fs')
      const driverPaths = [
        'C:\\Program Files\\VB\\CABLE',
        'C:\\Program Files (x86)\\VB\\CABLE',
        process.env.ProgramFiles + '\\VB\\CABLE',
        process.env['ProgramFiles(x86)'] + '\\VB\\CABLE'
      ]

      for (const path of driverPaths) {
        if (path && existsSync(path)) {
          console.log('VB-Cable detectado en:', path)
          return true
        }
      }

      console.log('VB-Cable no detectado con ningún método')
      return false
    } catch (error) {
      console.error('Error detectando VB-Cable:', error)
      return false
    }
  }

  /**
   * Verifica si BlackHole está instalado en macOS
   */
  private isBlackHoleInstalled(): boolean {
    if (platform() !== 'darwin') return false

    try {
      const { execSync } = require('child_process')
      // Buscar el dispositivo BlackHole en la lista de dispositivos de audio
      const result = execSync('system_profiler SPAudioDataType', { encoding: 'utf8' })
      return result.includes('BlackHole')
    } catch {
      return false
    }
  }

  /**
   * Verifica si PulseAudio está disponible en Linux
   */
  private isPulseAudioInstalled(): boolean {
    if (platform() !== 'linux') return false

    try {
      const { execSync } = require('child_process')
      execSync('which pactl', { stdio: 'pipe' })
      return true
    } catch {
      return false
    }
  }

  /**
   * Obtiene la ruta del instalador para descargarlo manualmente
   */
  getInstallerDownloadUrl(): string {
    const os = platform()

    switch (os) {
      case 'win32':
        return 'https://vb-audio.com/Cable/'

      case 'darwin':
        return 'https://existential.audio/blackhole/'

      case 'linux':
        return 'https://www.freedesktop.org/wiki/Software/PulseAudio/'

      default:
        return ''
    }
  }

  /**
   * Obtiene instrucciones de instalación manual
   */
  getManualInstallInstructions(): string[] {
    const os = platform()

    switch (os) {
      case 'win32':
        return [
          '1. Descarga VB-Audio Virtual Cable de https://vb-audio.com/Cable/',
          '2. Ejecuta el instalador como Administrador',
          '3. Reinicia el PC después de la instalación',
          '4. Selecciona "CABLE Input" en el receptor de esta aplicación',
          '5. En Discord/OBS, selecciona "CABLE Output" como micrófono'
        ]

      case 'darwin':
        return [
          '1. Descarga BlackHole de https://existential.audio/blackhole/',
          '2. Ejecuta el instalador BlackHole2ch.pkg',
          '3. Reinicia tu Mac después de la instalación',
          '4. Selecciona "BlackHole 2ch" en el receptor de esta aplicación',
          '5. En Discord/OBS, selecciona "BlackHole 2ch" como micrófono'
        ]

      case 'linux':
        return [
          '1. Instala PulseAudio: sudo apt install pulseaudio',
          '2. Ejecuta: pactl load-module module-loopback latency_msec=1',
          '3. Configura el monitor en Discord/OBS',
          '4. Para hacerlo permanente, agrega el módulo a /etc/pulse/default.pa'
        ]

      default:
        return ['Sistema operativo no soportado']
    }
  }
}
