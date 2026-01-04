export class AudioManager {
  public static async getConfiguredUserMedia(options: {
    selectedDeviceId?: string
    isExact?: boolean
    useDefault?: boolean
  }) {
    const { isExact = false, useDefault = false, selectedDeviceId } = options
    return await navigator.mediaDevices.getUserMedia({
      audio: useDefault
        ? {
            deviceId: {
              exact: isExact ? selectedDeviceId : undefined,
              ideal: !isExact ? selectedDeviceId : undefined
            },
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 48000,
            channelCount: 2
          }
        : true
    })
  }
}
