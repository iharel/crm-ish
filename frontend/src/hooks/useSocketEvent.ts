import { useEffect, useRef } from 'react'
import { socketService, type SocketEvent } from '../services/socketService'

/** useSocketEvent — subscribe to a realtime event while mounted. */
export function useSocketEvent<T>(event: SocketEvent, handler: (payload: T) => void) {
  const ref = useRef(handler); ref.current = handler
  useEffect(() => socketService.on<T>(event, (p) => ref.current(p)), [event])
}
