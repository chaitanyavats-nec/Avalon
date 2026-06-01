import { GamePhase } from '@/types/avalon';

export const PHASE_TRANSITIONS: Record<GamePhase, GamePhase[]> = {
  lobby: ['role_reveal'],
  role_reveal: ['quest'],
  quest: ['quest_reveal'],
  quest_reveal: ['quest', 'lady_of_lake', 'assassin', 'ended'],
  lady_of_lake: ['quest'],
  assassin: ['ended'],
  ended: ['lobby'],
};

export function canTransition(from: GamePhase, to: GamePhase): boolean {
  return PHASE_TRANSITIONS[from]?.includes(to);
}
