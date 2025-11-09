/*
  # Create Achievements System

  1. New Tables
    - `achievements`
      - `id` (uuid, primary key)
      - `title` (text) - Achievement title
      - `description` (text) - Achievement description
      - `type` (text) - Type of achievement (streak, therapy, mood, etc.)
      - `requirement` (integer) - Number required to earn
      - `icon` (text) - Icon identifier
      - `created_at` (timestamptz)
    
    - `user_achievements`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `achievement_id` (uuid, foreign key to achievements)
      - `progress` (integer) - Current progress
      - `earned` (boolean) - Whether earned
      - `earned_at` (timestamptz) - When earned
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can read all achievements
    - Users can only read/update their own achievement progress
*/

-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  type text NOT NULL,
  requirement integer NOT NULL DEFAULT 1,
  icon text NOT NULL DEFAULT 'award',
  created_at timestamptz DEFAULT now()
);

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  progress integer NOT NULL DEFAULT 0,
  earned boolean NOT NULL DEFAULT false,
  earned_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Policies for achievements
CREATE POLICY "Anyone can read achievements"
  ON achievements FOR SELECT
  TO authenticated
  USING (true);

-- Policies for user_achievements
CREATE POLICY "Users can read own achievements"
  ON user_achievements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON user_achievements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own achievements"
  ON user_achievements FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Insert default achievements
INSERT INTO achievements (title, description, type, requirement, icon) VALUES
  ('7-Day Streak', 'Completed daily check-ins for 7 days', 'streak', 7, 'flame'),
  ('Mindfulness Master', 'Completed 10 meditation sessions', 'therapy', 10, 'brain'),
  ('Stress Warrior', 'Successfully managed stress for 5 days', 'stress', 5, 'shield'),
  ('Therapy Graduate', 'Complete 3 therapy modules', 'therapy', 3, 'graduation-cap'),
  ('Mood Tracker', 'Track your mood for 14 days', 'mood', 14, 'heart'),
  ('Early Bird', 'Complete 5 morning meditation sessions', 'therapy', 5, 'sunrise'),
  ('Consistency Champion', 'Maintain a 30-day streak', 'streak', 30, 'trophy'),
  ('Self-Care Hero', 'Complete 25 therapy sessions', 'therapy', 25, 'star');
