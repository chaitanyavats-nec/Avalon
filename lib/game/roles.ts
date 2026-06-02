import { RoleName, Team } from '@/types/avalon';

export interface RoleDefinition {
  name: RoleName;
  team: Team;
  description: string;
}

export const ROLES: Record<RoleName, RoleDefinition> = {
  'Loyal Servant of Arthur': {
    name: 'Loyal Servant of Arthur',
    team: 'good',
    description: 'A loyal defender of the realm.',
  },
  'Merlin': {
    name: 'Merlin',
    team: 'good',
    description: 'Knows all evil players except Mordred.',
  },
  'Percival': {
    name: 'Percival',
    team: 'good',
    description: 'Sees Merlin and Morgana, but cannot distinguish which is which.',
  },
  'Minion of Mordred': {
    name: 'Minion of Mordred',
    team: 'evil',
    description: 'An evil servant. Knows other evil players except Oberon.',
  },
  'Assassin': {
    name: 'Assassin',
    team: 'evil',
    description: 'Knows other evil players except Oberon. Shoots Merlin at game end.',
  },
  'Morgana': {
    name: 'Morgana',
    team: 'evil',
    description: 'Appears to Percival as a possible Merlin.',
  },
  'Mordred': {
    name: 'Mordred',
    team: 'evil',
    description: 'Hidden from Merlin.',
  },
  'Oberon': {
    name: 'Oberon',
    team: 'evil',
    description: 'Unknown to other evil players; cannot see his team.',
  },
};

export function getRoleKnowledge(myRole: RoleName, allPlayers: { id: string, role: RoleName, name: string }[]): { knowledgeText: string, seenPlayers: { playerId: string, name: string, visibleAs: string }[] } {
  const seenPlayers: { playerId: string, name: string, visibleAs: string }[] = [];
  
  if (myRole === 'Loyal Servant of Arthur') {
    return { knowledgeText: 'You know nothing. Trust no one.', seenPlayers };
  }

  if (myRole === 'Merlin') {
    for (const p of allPlayers) {
      if (ROLES[p.role].team === 'evil' && p.role !== 'Mordred') {
        seenPlayers.push({ playerId: p.id, name: p.name, visibleAs: 'evil' });
      }
    }
    return { knowledgeText: 'You know the forces of evil (except Mordred).', seenPlayers };
  }

  if (myRole === 'Percival') {
    for (const p of allPlayers) {
      if (p.role === 'Merlin' || p.role === 'Morgana') {
        seenPlayers.push({ playerId: p.id, name: p.name, visibleAs: 'possible Merlin' });
      }
    }
    return { knowledgeText: 'You see two players who could be Merlin.', seenPlayers };
  }

  if (myRole === 'Oberon') {
    return { knowledgeText: 'You are isolated from the rest of your team.', seenPlayers };
  }

  // Other evil roles (Assassin, Minion of Mordred, Morgana, Mordred)
  if (ROLES[myRole].team === 'evil') {
    for (const p of allPlayers) {
      if (ROLES[p.role].team === 'evil' && p.role !== 'Oberon' && p.role !== myRole) {
        seenPlayers.push({ playerId: p.id, name: p.name, visibleAs: 'evil' });
      }
    }
    
    // If Mordred is in the game but there is no Assassin, Mordred becomes the assassin.
    const hasAssassin = allPlayers.some(p => p.role === 'Assassin');
    if (myRole === 'Mordred' && !hasAssassin) {
      return { knowledgeText: 'You know the other agents of evil (except Oberon). Note: Since there is no Assassin, you have the assassination power!', seenPlayers };
    }
    
    return { knowledgeText: 'You know the other agents of evil (except Oberon).', seenPlayers };
  }

  return { knowledgeText: '', seenPlayers };
}

// Validation function
export function validateRoles(playerCount: number, selectedRoles: RoleName[]): boolean {
  // Count required slots
  const evilCounts: Record<number, number> = { 5: 2, 6: 2, 7: 3, 8: 3, 9: 3, 10: 4 };
  const goodCounts: Record<number, number> = { 5: 3, 6: 4, 7: 4, 8: 5, 9: 6, 10: 6 };
  
  if (!evilCounts[playerCount]) return false;

  let evilRoles = 0;
  let goodRoles = 1; // Merlin is always included
  
  for (const r of selectedRoles) {
    if (r === 'Merlin') continue;
    if (ROLES[r].team === 'evil') evilRoles++;
    else goodRoles++;
  }

  // At least one of Assassin or Mordred must be selected to carry out the assassination
  const hasAssassin = selectedRoles.includes('Assassin');
  const hasMordred = selectedRoles.includes('Mordred');
  if (!hasAssassin && !hasMordred) return false;

  return evilRoles <= evilCounts[playerCount] && goodRoles <= goodCounts[playerCount];
}
