import { supabase } from '../lib/supabase';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  type: string;
  requirement: number;
  icon: string;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  progress: number;
  earned: boolean;
  earned_at: string | null;
  created_at: string;
  updated_at: string;
  achievement?: Achievement;
}

export async function getAllAchievements(): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .order('requirement', { ascending: true });

  if (error) {
    console.error('Error fetching achievements:', error);
    return [];
  }

  return data || [];
}

export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  const { data, error } = await supabase
    .from('user_achievements')
    .select(`
      *,
      achievement:achievements(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user achievements:', error);
    return [];
  }

  return data || [];
}

export async function initializeUserAchievements(userId: string): Promise<void> {
  // Get all achievements
  const achievements = await getAllAchievements();

  // Check which ones the user already has
  const { data: existing } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId);

  const existingIds = new Set(existing?.map(e => e.achievement_id) || []);

  // Create entries for achievements the user doesn't have yet
  const newAchievements = achievements
    .filter(a => !existingIds.has(a.id))
    .map(a => ({
      user_id: userId,
      achievement_id: a.id,
      progress: 0,
      earned: false
    }));

  if (newAchievements.length > 0) {
    await supabase
      .from('user_achievements')
      .insert(newAchievements);
  }
}

export async function updateAchievementProgress(
  userId: string,
  achievementId: string,
  progress: number
): Promise<void> {
  // Get the achievement requirement
  const { data: achievement } = await supabase
    .from('achievements')
    .select('requirement')
    .eq('id', achievementId)
    .maybeSingle();

  if (!achievement) return;

  const earned = progress >= achievement.requirement;
  const updateData: any = {
    progress,
    earned,
    updated_at: new Date().toISOString()
  };

  // If just earned, set the earned_at timestamp
  if (earned) {
    const { data: current } = await supabase
      .from('user_achievements')
      .select('earned')
      .eq('user_id', userId)
      .eq('achievement_id', achievementId)
      .maybeSingle();

    if (current && !current.earned) {
      updateData.earned_at = new Date().toISOString();
    }
  }

  await supabase
    .from('user_achievements')
    .update(updateData)
    .eq('user_id', userId)
    .eq('achievement_id', achievementId);
}

export async function updateAllAchievements(userId: string): Promise<void> {
  // Initialize user achievements if needed
  await initializeUserAchievements(userId);

  // Get streak data
  const streakData = JSON.parse(localStorage.getItem('mindcare_streak') || '{"currentStreak": 0}');

  // Get mood entries
  const moodEntries = JSON.parse(localStorage.getItem('mindcare_mood_entries') || '[]');
  const userMoodEntries = moodEntries.filter((e: any) => e.userId === userId);

  // Get therapy activities
  const cbtRecords = JSON.parse(localStorage.getItem('mindcare_cbt_records') || '[]');
  const gratitudeEntries = JSON.parse(localStorage.getItem('mindcare_gratitude_entries') || '[]');
  const exposureSessions = JSON.parse(localStorage.getItem('mindcare_exposure_sessions') || '[]');
  const videoProgress = JSON.parse(localStorage.getItem('mindcare_video_progress') || '[]');
  const stressLogs = JSON.parse(localStorage.getItem('mindcare_stress_logs') || '[]');

  const userCBT = cbtRecords.filter((r: any) => r.userId === userId);
  const userGratitude = gratitudeEntries.filter((e: any) => e.userId === userId);
  const userExposure = exposureSessions.filter((s: any) => s.userId === userId);
  const userVideo = videoProgress.filter((p: any) => p.userId === userId);
  const userStressLogs = stressLogs.filter((l: any) => l.userId === userId);

  // Calculate metrics
  const currentStreak = streakData.currentStreak || 0;
  const moodTrackDays = userMoodEntries.length;
  const mindfulnessSessions = Math.floor(userMoodEntries.length * 0.3) +
                             Math.floor(userGratitude.length * 0.5) +
                             userExposure.length;
  const goodStressDays = userStressLogs.filter((log: any) => log.effectiveness >= 7).length;
  const completedModules = [
    userCBT.length >= 3 ? 1 : 0,
    userGratitude.length >= 7 ? 1 : 0,
    userStressLogs.length >= 3 ? 1 : 0,
    mindfulnessSessions >= 5 ? 1 : 0,
    userVideo.length >= 2 ? 1 : 0
  ].reduce((sum, val) => sum + val, 0);
  const totalTherapySessions = userCBT.length + userGratitude.length + userExposure.length +
                               userVideo.length + userStressLogs.length;
  const morningMeditations = 5; // Placeholder - would need time-based tracking

  // Get all achievements
  const achievements = await getAllAchievements();

  // Update progress for each achievement
  for (const achievement of achievements) {
    let progress = 0;

    switch (achievement.type) {
      case 'streak':
        progress = currentStreak;
        break;
      case 'therapy':
        if (achievement.title.includes('meditation')) {
          progress = mindfulnessSessions;
        } else if (achievement.title.includes('Graduate')) {
          progress = completedModules;
        } else if (achievement.title.includes('morning')) {
          progress = morningMeditations;
        } else {
          progress = totalTherapySessions;
        }
        break;
      case 'stress':
        progress = goodStressDays;
        break;
      case 'mood':
        progress = moodTrackDays;
        break;
    }

    await updateAchievementProgress(userId, achievement.id, progress);
  }
}
