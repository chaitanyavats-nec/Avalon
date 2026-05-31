export type Team = 'good' | 'evil';

export type RoleName =
  | 'Merlin'
  | 'Percival'
  | 'Loyal Servant of Arthur'
  | 'Assassin'
  | 'Morgana'
  | 'Mordred'
  | 'Minion of Mordred'
  | 'Oberon';

export type GamePhase =
  | 'lobby'
  | 'role_reveal'
  | 'quest'
  | 'lady_of_lake'
  | 'assassin'
  | 'ended';

export type QuestResult = 'pass' | 'fail' | null;
export type VoteValue = 'approve' | 'reject';
export type QuestCardValue = 'success' | 'fail';

export interface RoomSettings {
  playerCount: number;
  roles: RoleName[];          // which optional roles are enabled
  ladyOfLake: boolean;
}

export interface Player {
  id: string;
  name: string;
  sessionId: string;
  isHost: boolean;
  isReady: boolean;
  seatOrder: number;
}

export interface MyRole {
  role: RoleName;
  team: Team;
  knowledgeText: string;      // plain language: "You know that [names] are evil."
  seenPlayers: {              // players this role can identify
    playerId: string;
    name: string;
    visibleAs: string;        // e.g. "evil" | "possible Merlin"
  }[];
}

export interface Quest {
  id: string;
  questNumber: number;
  requiredPlayers: number;
  requiresTwoFails: boolean;
  proposedTeam: string[];     // player IDs
  proposalCount: number;
  teamVoteResult: 'approved' | 'rejected' | null;
  questResult: QuestResult;
}

export interface GameState {
  phase: GamePhase;
  currentQuest: number;
  questLeaderId: string;
  rejectionCount: number;
  quests: Quest[];
  players: Player[];
  settings: RoomSettings;
  ladyOfLakeHolderId: string | null;
  winner: Team | null;
}

export type GameEvent =
  | { type: 'player_joined'; payload: { playerId: string; name: string; seatOrder: number } }
  | { type: 'player_ready'; payload: { playerId: string; isReady: boolean } }
  | { type: 'game_started'; payload: { questTrack: number[][]; playerOrder: string[] } }
  | { type: 'phase_changed'; payload: { phase: GamePhase; questNumber: number; leaderId: string } }
  | { type: 'team_proposed'; payload: { proposedTeam: string[] } }
  | { type: 'vote_submitted'; payload: { playerId: string } }
  | { type: 'votes_revealed'; payload: { results: { playerId: string; vote: VoteValue }[]; outcome: 'approved' | 'rejected' } }
  | { type: 'quest_card_submitted'; payload: { count: number } }
  | { type: 'quest_result'; payload: { questNumber: number; result: QuestResult; successCount: number; failCount: number } }
  | { type: 'lady_of_lake'; payload: { holderId: string; investigatedId: string; revealedTeam: Team } }
  | { type: 'assassin_target'; payload: { targetId: string } }
  | { type: 'game_over'; payload: { winner: Team; roles: { playerId: string; role: RoleName }[]; reason: string } };
