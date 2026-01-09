const ICE_SERVERS_STORAGE_KEY = 'ice_servers'

export interface TurnServerData {
  url: string
  username: string
  password: string
}

/**
 * Detect if a URL is a TURN or STUN server
 * @param url The URL to check
 * @returns 'turn' if TURN, 'stun' if STUN, null if neither
 */
export function detectIceServerType(url: string): 'turn' | 'stun' | null {
  const trimmed = url.trim().toLowerCase()
  if (trimmed.startsWith('turn:')) {
    return 'turn'
  }
  if (trimmed.startsWith('stun:')) {
    return 'stun'
  }
  return null
}

/**
 * Load ICE servers from localStorage
 * @returns Array of RTCIceServer objects, or empty array if none found
 */
export function loadIceServers(): RTCIceServer[] {
  try {
    const saved = localStorage.getItem(ICE_SERVERS_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) {
        return parsed as RTCIceServer[]
      }
    }
  } catch (err) {
    console.warn('Error loading ICE servers from storage:', err)
  }
  return []
}

/**
 * Save ICE servers to localStorage
 * @param iceServers Array of RTCIceServer objects to save
 */
export function saveIceServers(iceServers: RTCIceServer[]): void {
  try {
    if (iceServers.length === 0) {
      localStorage.setItem(ICE_SERVERS_STORAGE_KEY, '[]')
      return
    }
    localStorage.setItem(ICE_SERVERS_STORAGE_KEY, JSON.stringify(iceServers))
  } catch (err) {
    console.error('Error saving ICE servers to storage:', err)
    throw err instanceof Error ? err : new Error('Error saving ICE servers')
  }
}

/**
 * Extract TURN server data from RTCIceServer format
 * Used by SettingsPopup to display TURN servers with username/password
 * @returns Array of TurnServerData objects
 */
export function extractTurnServersFromIceServers(): TurnServerData[] {
  const iceServers = loadIceServers()
  const turnServers: TurnServerData[] = []
  for (const server of iceServers) {
    if (server.urls) {
      const urls = typeof server.urls === 'string' ? [server.urls] : server.urls
      for (const url of urls) {
        const type = detectIceServerType(url)
        if (type === 'turn') {
          turnServers.push({
            url: url,
            username: server.username || '',
            password: server.credential || ''
          })
        }
      }
    }
  }
  return turnServers
}

/**
 * Validate TURN servers and return validation errors by index
 * @param turnServers Array of TurnServerData objects to validate
 * @returns Record mapping server index to error message (empty if valid)
 */
export function validateTurnServers(turnServers: TurnServerData[]): Record<number, string> {
  const errors: Record<number, string> = {}
  turnServers.forEach((server, index) => {
    const url = server.url.trim()
    if (url === '') {
      return // Skip empty servers
    }

    const type = detectIceServerType(url)
    if (type === 'stun') {
      errors[index] = 'STUN servers are not allowed. Only TURN servers are supported.'
    } else if (type !== 'turn') {
      errors[index] = 'Invalid URL format. Must start with "turn:".'
    }
  })
  return errors
}

/**
 * Convert array of TurnServerData to RTCIceServer format
 * Used by SettingsPopup to save TURN servers with username/password
 * @param turnServers Array of TurnServerData objects
 * @returns Array of RTCIceServer objects
 */
export function turnServersToIceServers(turnServers: TurnServerData[]): RTCIceServer[] {
  const validServers = turnServers.filter(
    (server) => server.url.trim() !== '' && detectIceServerType(server.url) === 'turn'
  )
  return validServers.map((server) => {
    const iceServer: RTCIceServer = {
      urls: server.url.trim()
    }
    if (server.username.trim() !== '') {
      iceServer.username = server.username.trim()
    }
    if (server.password.trim() !== '') {
      iceServer.credential = server.password.trim()
    }
    return iceServer
  }) satisfies RTCIceServer[]
}

/**
 * Validate and save TURN servers
 * @param turnServers Array of TurnServerData objects to validate and save
 * @returns Object containing validation errors and save error (if any)
 */
export function validateAndSaveTurnServers(turnServers: TurnServerData[]): {
  validationErrors: Record<number, string>
  saveError: string | null
} {
  const validationErrors = validateTurnServers(turnServers)
  let saveError: string | null = null

  // Only save if there are no validation errors
  if (Object.keys(validationErrors).length === 0) {
    try {
      const iceServers = turnServersToIceServers(turnServers)
      saveIceServers(iceServers)
    } catch (err) {
      saveError = err instanceof Error ? err.message : 'Error saving ICE servers'
    }
  }

  return { validationErrors, saveError }
}
