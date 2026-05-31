import { GameEvent } from '@/types/avalon';

// Use this file if you need helper functions around creating/parsing events.
// The types themselves are in types/avalon.ts.

export function createEvent<T extends GameEvent['type']>(
  type: T,
  payload: Extract<GameEvent, { type: T }>['payload']
): GameEvent {
  return { type, payload } as GameEvent;
}
