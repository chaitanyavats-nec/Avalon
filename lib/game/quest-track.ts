// Rows are player counts (5-10), columns are quests (1-5)
export const QUEST_TRACK: Record<number, number[]> = {
  5: [2, 3, 2, 3, 3],
  6: [2, 3, 4, 3, 4],
  7: [2, 3, 3, 4, 4],
  8: [3, 4, 4, 5, 5],
  9: [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
};

export function requiresTwoFails(playerCount: number, questNumber: number): boolean {
  return playerCount >= 7 && questNumber === 4;
}
