<script lang="ts">
  import { onMount } from 'svelte'
  import type { MediaDevice } from '../../../../types/MediaDevice'
  import { AudioManager } from '../../lib/audio-manager'

  type Props = {
    selectedDeviceId: string
    isStreaming: boolean
    outputDevices: MediaDevice[]
    error: string | null
    selectedReceiverOutputDeviceId: string
  }

  let {
    selectedDeviceId = $bindable(),
    isStreaming,
    outputDevices = $bindable(),
    error = $bindable(),
    selectedReceiverOutputDeviceId = $bindable()
  }: Props = $props()

  let devices: MediaDevice[] = []
  let audioDevices: MediaDevice[] = $state<MediaDevice[]>([])
  let selectedOutputDeviceId: string = 'default'
  let loading = $state<boolean>(true)

  async function loadDevices(): Promise<void> {
    try {
      loading = true
      error = null

      // Solicitar permisos para acceder a los dispositivos
      try {
        await AudioManager.getConfiguredUserMedia({
          useDefault: true
        })
      } catch (err) {
        console.warn('No se pudieron obtener permisos:', err)
      }

      // Enumerar todos los dispositivos
      const deviceList = await navigator.mediaDevices.enumerateDevices()
      devices = deviceList.map((device) => ({
        deviceId: device.deviceId,
        kind: device.kind,
        label: device.label || `Dispositivo ${device.kind} ${device.deviceId.substring(0, 8)}`,
        groupId: device.groupId
      }))

      // Filtrar dispositivos de audio de entrada y salida
      audioDevices = devices.filter((d) => d.kind === 'audioinput')
      outputDevices = devices.filter((d) => d.kind === 'audiooutput')

      // Seleccionar cable virtual por defecto para el emisor
      if (audioDevices.length > 0 && !selectedDeviceId) {
        // Buscar dispositivos que parezcan cables virtuales
        const virtualCableDevice = audioDevices.find(
          (d) =>
            d.label.toLowerCase().includes('cable') ||
            d.label.toLowerCase().includes('stereo mix') ||
            d.label.toLowerCase().includes('wave') ||
            d.label.toLowerCase().includes('loopback') ||
            d.label.toLowerCase().includes('voicemeeter')
        )
        // Si encontramos un cable virtual, usarlo; si no, usar el primero disponible
        selectedDeviceId = virtualCableDevice?.deviceId || audioDevices[0].deviceId
      }
      if (outputDevices.length > 0 && selectedOutputDeviceId === 'default') {
        // Para el emisor, también preferir cables virtuales en salida
        const virtualOutputDevice = outputDevices.find(
          (d) =>
            d.label.toLowerCase().includes('cable') || d.label.toLowerCase().includes('voicemeeter')
        )
        selectedOutputDeviceId = virtualOutputDevice?.deviceId || outputDevices[0].deviceId
      }
      // Configurar también el dispositivo de salida para el audio del receptor (preferir cables virtuales)
      if (outputDevices.length > 0 && selectedReceiverOutputDeviceId === 'default') {
        const virtualOutputDevice = outputDevices.find(
          (d) =>
            d.label.toLowerCase().includes('cable') || d.label.toLowerCase().includes('voicemeeter')
        )
        selectedReceiverOutputDeviceId = virtualOutputDevice?.deviceId || outputDevices[0].deviceId
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Error desconocido'
      console.error('Error al cargar dispositivos:', err)
    } finally {
      loading = false
    }
  }

  onMount(() => {
    loadDevices()
  })
</script>

{#if loading}
  <div class="flex flex-col items-center justify-center py-12">
    <div
      class="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"
    ></div>
    <p class="mt-4 text-sm text-gray-600">Loading devices...</p>
  </div>
{:else if error}
  <div class="bg-red-50 border border-red-200 rounded-lg p-4">
    <p class="text-sm text-red-800">{error}</p>
  </div>
{/if}

<!-- Device Selector -->

<div class="border border-gray-200 rounded-lg p-6 space-y-4">
  <h3 class="text-base font-semibold text-gray-900">Device Selection</h3>

  <!-- Info Box -->

  <div class="bg-blue-50 border border-blue-200 rounded-md p-3">
    <p class="text-xs text-blue-800">
      <strong>Tip:</strong> Select your real microphone here. IMPORTANT: Virtual cable devices (VB-Cable,
      Stereo Mix) should only be used if you want to capture system audio.
    </p>
  </div>

  <div class="flex gap-3 items-end flex-wrap">
    <div class="flex-1 min-w-[250px] space-y-2">
      <label for="device-select" class="block text-sm font-medium text-gray-700">
        Input Device (Virtual cable if system, your real mic otherwise)
      </label>

      <select
        id="device-select"
        bind:value={selectedDeviceId}
        disabled={isStreaming}
        class="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {#each audioDevices as device (device.deviceId)}
          <option value={device.deviceId}>
            {device.label}

            {#if device.label.toLowerCase().includes('cable') || device.label
                .toLowerCase()
                .includes('stereo mix') || device.label
                .toLowerCase()
                .includes('wave') || device.label.toLowerCase().includes('loopback')}
              [Virtual Device]
            {/if}
          </option>
        {/each}
      </select>
    </div>

    <button
      onclick={loadDevices}
      disabled={isStreaming}
      class="px-6 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >Refresh</button
    >
  </div>
</div>
