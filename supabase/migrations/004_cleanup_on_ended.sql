-- Automatic cleanup of game details (quests, lady_of_lake, game_events) when a game ends
CREATE OR REPLACE FUNCTION clean_up_ended_game()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if status is transitioning to 'ended'
  IF NEW.status = 'ended' AND (OLD.status IS NULL OR OLD.status <> 'ended') THEN
    -- Clear out old quests (this automatically cascades to delete votes and quest_cards)
    DELETE FROM quests WHERE room_id = NEW.id;
    
    -- Clear out lady of the lake assignments
    DELETE FROM lady_of_lake WHERE room_id = NEW.id;
    
    -- Clear out game events log
    DELETE FROM game_events WHERE room_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_clean_up_ended_game ON rooms;

-- Bind trigger to rooms table
CREATE TRIGGER trigger_clean_up_ended_game
AFTER UPDATE ON rooms
FOR EACH ROW
EXECUTE FUNCTION clean_up_ended_game();
