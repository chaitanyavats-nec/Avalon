'use client';

import RoleCard from '@/components/RoleCard';
import { MyRole } from '@/types/avalon';
import { useState } from 'react';

const PREVIEW_ROLES: MyRole[] = [
  {
    role: 'Merlin',
    team: 'good',
    knowledgeText: 'You know the forces of evil (except Mordred).',
    seenPlayers: [
      { playerId: '1', name: 'Sir Gawain', visibleAs: 'evil' },
      { playerId: '2', name: 'Lady Elaine', visibleAs: 'evil' },
    ],
  },
  {
    role: 'Percival',
    team: 'good',
    knowledgeText: 'You see two players who could be Merlin.',
    seenPlayers: [
      { playerId: '3', name: 'Sir Lancelot', visibleAs: 'possible Merlin' },
      { playerId: '4', name: 'Lady Guinevere', visibleAs: 'possible Merlin' },
    ],
  },
  {
    role: 'Loyal Servant of Arthur',
    team: 'good',
    knowledgeText: 'You know nothing. Trust no one.',
    seenPlayers: [],
  },
  {
    role: 'Assassin',
    team: 'evil',
    knowledgeText: 'You know the other agents of evil (except Oberon).',
    seenPlayers: [
      { playerId: '5', name: 'Sir Tristan', visibleAs: 'evil' },
    ],
  },
  {
    role: 'Morgana',
    team: 'evil',
    knowledgeText: 'You know the other agents of evil (except Oberon).',
    seenPlayers: [
      { playerId: '6', name: 'Sir Bors', visibleAs: 'evil' },
      { playerId: '7', name: 'Sir Bedivere', visibleAs: 'evil' },
    ],
  },
  {
    role: 'Mordred',
    team: 'evil',
    knowledgeText: 'You know the other agents of evil (except Oberon).',
    seenPlayers: [
      { playerId: '8', name: 'Sir Percival', visibleAs: 'evil' },
    ],
  },
  {
    role: 'Oberon',
    team: 'evil',
    knowledgeText: 'You are isolated from the rest of your team.',
    seenPlayers: [],
  },
  {
    role: 'Minion of Mordred',
    team: 'evil',
    knowledgeText: 'You know the other agents of evil (except Oberon).',
    seenPlayers: [
      { playerId: '9', name: 'Sir Galahad', visibleAs: 'evil' },
    ],
  },
];

export default function PreviewPage() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [forceReveal, setForceReveal] = useState(false);
  const currentRole = PREVIEW_ROLES[selectedIndex];

  return (
    <div className="min-h-screen bg-realm p-6 flex flex-col items-center justify-center">
      {/* Role selector */}
      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        {PREVIEW_ROLES.map((r, i) => (
          <button
            key={r.role}
            onClick={() => { setSelectedIndex(i); setForceReveal(false); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              i === selectedIndex
                ? r.team === 'good'
                  ? 'bg-blue-600 text-white'
                  : 'bg-red-600 text-white'
                : 'bg-surface border border-border text-text-dim hover:bg-gray-100'
            }`}
          >
            {r.role}
          </button>
        ))}
      </div>

      {/* Toggle reveal button for testing */}
      <button
        onClick={() => setForceReveal(!forceReveal)}
        className="mb-6 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-text text-surface rounded-lg"
      >
        {forceReveal ? 'Show Card Back' : 'Reveal Card'}
      </button>

      {/* Card */}
      <div className="w-full max-w-sm md:max-w-md">
        <RoleCard key={currentRole.role} myRole={currentRole} forceReveal={forceReveal} />
      </div>

      <p className="text-text-dim text-xs mt-6 text-center">Hold the card to reveal your role</p>
    </div>
  );
}
