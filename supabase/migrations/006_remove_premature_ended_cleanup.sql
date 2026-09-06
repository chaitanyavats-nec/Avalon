-- The 004 trigger deleted quests/lady_of_lake/game_events the instant a room's
-- status became 'ended', before players ever see the GameOver review screen
-- (which reads quests, quest_cards, and lady_of_lake history to render the
-- quest-track hover details). Cleanup should only happen when the host
-- explicitly starts a new game via "Play Again" (handled client-side in
-- GameOver.tsx's handlePlayAgain), not automatically on end.
DROP TRIGGER IF EXISTS trigger_clean_up_ended_game ON rooms;
DROP FUNCTION IF EXISTS clean_up_ended_game();
