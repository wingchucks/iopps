// Email template sections for personalized engagement digest
import { escapeHtml } from "./templates";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://iopps.ca";
const BRAND_COLOR = "#14B8A6";

// ============================================
// TYPES
// ============================================

export interface EngagementData {
  profileViews: number;
  profileViewsChange: number; // week-over-week change
  applicationsSubmitted: number;
  connectionsGained: number;
  postsLiked: number;
}

export interface BadgeData {
  name: string;
  icon: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  earnedAt: Date;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  isAtRisk: boolean;
  lastActivityDate: Date | null;
}

export interface RecommendationData {
  type: "job" | "event" | "training" | "connection";
  title: string;
  subtitle?: string;
  url: string;
  matchScore?: number;
}

export interface LeaderboardPosition {
  rank: number;
  totalUsers: number;
  points: number;
  previousRank?: number;
}

// ============================================
// EMAIL SECTIONS
// ============================================

/**
 * Generate engagement stats section for email
 */
export function engagementStatsSection(stats: EngagementData): string {
  const changeIcon = stats.profileViewsChange > 0 ? "📈" : stats.profileViewsChange < 0 ? "📉" : "➡️";
  const changeColor = stats.profileViewsChange > 0 ? "#10b981" : stats.profileViewsChange < 0 ? "#ef4444" : "#64748b";
  const changeText = stats.profileViewsChange > 0
    ? `+${stats.profileViewsChange}`
    : stats.profileViewsChange.toString();

  return `
    <tr>
      <td style="padding: 24px;">
        <h2 style="margin: 0 0 16px; font-size: 20px; color: #f1f5f9;">📊 Your Week in Numbers</h2>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="25%" style="text-align: center; padding: 16px; background: #16161b; border-radius: 8px 0 0 8px;">
              <div style="font-size: 28px; font-weight: bold; color: ${BRAND_COLOR};">${stats.profileViews}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Profile Views</div>
              <div style="font-size: 11px; color: ${changeColor}; margin-top: 2px;">${changeIcon} ${changeText}</div>
            </td>
            <td width="25%" style="text-align: center; padding: 16px; background: #16161b;">
              <div style="font-size: 28px; font-weight: bold; color: #8b5cf6;">${stats.applicationsSubmitted}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Applications</div>
            </td>
            <td width="25%" style="text-align: center; padding: 16px; background: #16161b;">
              <div style="font-size: 28px; font-weight: bold; color: #3b82f6;">${stats.connectionsGained}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">New Connections</div>
            </td>
            <td width="25%" style="text-align: center; padding: 16px; background: #16161b; border-radius: 0 8px 8px 0;">
              <div style="font-size: 28px; font-weight: bold; color: #f59e0b;">${stats.postsLiked}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Engagement</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

/**
 * Generate badge achievements section for email
 */
export function badgeAchievementsSection(badges: BadgeData[]): string {
  if (badges.length === 0) return "";

  const tierColors: Record<string, string> = {
    bronze: "#cd7f32",
    silver: "#c0c0c0",
    gold: "#ffd700",
    platinum: "#e5e4e2",
  };

  const badgeHtml = badges.slice(0, 3).map(badge => `
    <td style="text-align: center; padding: 12px;">
      <div style="font-size: 36px; margin-bottom: 8px;">${badge.icon}</div>
      <div style="font-size: 14px; font-weight: 600; color: #f1f5f9;">${escapeHtml(badge.name)}</div>
      <div style="font-size: 11px; color: ${tierColors[badge.tier]}; text-transform: uppercase; margin-top: 4px;">${badge.tier}</div>
    </td>
  `).join("");

  return `
    <tr>
      <td style="padding: 24px; background: #16161b;">
        <h2 style="margin: 0 0 16px; font-size: 20px; color: #f1f5f9;">🏆 Badges Earned This Week</h2>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            ${badgeHtml}
          </tr>
        </table>
        <div style="margin-top: 16px; text-align: center;">
          <a href="${SITE_URL}/member/dashboard" style="color: ${BRAND_COLOR}; font-size: 14px;">View all your badges →</a>
        </div>
      </td>
    </tr>
  `;
}

/**
 * Generate streak section for email
 */
export function streakSection(streak: StreakData): string {
  if (streak.currentStreak === 0) return "";

  const streakEmoji = streak.currentStreak >= 30 ? "🔥🔥🔥"
    : streak.currentStreak >= 14 ? "🔥🔥"
    : streak.currentStreak >= 7 ? "🔥"
    : "✨";

  const motivationText = streak.isAtRisk
    ? "Your streak is at risk! Visit IOPPS today to keep it going."
    : streak.currentStreak >= 7
    ? "Amazing consistency! Keep up the great work."
    : "You're building a great habit!";

  const backgroundColor = streak.isAtRisk ? "#7f1d1d" : "#16161b";
  const borderColor = streak.isAtRisk ? "#ef4444" : "#2d2d35";

  return `
    <tr>
      <td style="padding: 24px;">
        <div style="background: ${backgroundColor}; border: 1px solid ${borderColor}; border-radius: 12px; padding: 20px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 8px;">${streakEmoji}</div>
          <div style="font-size: 36px; font-weight: bold; color: #f97316;">${streak.currentStreak}</div>
          <div style="font-size: 14px; color: #94a3b8; margin-top: 4px;">Day Streak</div>
          <p style="margin: 16px 0 0; font-size: 14px; color: ${streak.isAtRisk ? "#fca5a5" : "#64748b"};">
            ${motivationText}
          </p>
          ${streak.longestStreak > streak.currentStreak ? `
            <p style="margin: 8px 0 0; font-size: 12px; color: #64748b;">
              Personal best: ${streak.longestStreak} days
            </p>
          ` : ""}
        </div>
      </td>
    </tr>
  `;
}

/**
 * Generate personalized recommendations section for email
 */
export function recommendationsSection(recommendations: RecommendationData[]): string {
  if (recommendations.length === 0) return "";

  const typeIcons: Record<string, string> = {
    job: "💼",
    event: "📅",
    training: "📚",
    connection: "🤝",
  };

  const typeColors: Record<string, string> = {
    job: BRAND_COLOR,
    event: "#8b5cf6",
    training: "#f59e0b",
    connection: "#3b82f6",
  };

  const recsHtml = recommendations.slice(0, 4).map(rec => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #2d2d35;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="40" style="vertical-align: top;">
              <div style="font-size: 24px;">${typeIcons[rec.type]}</div>
            </td>
            <td style="vertical-align: top;">
              <a href="${rec.url}" style="color: ${typeColors[rec.type]}; text-decoration: none; font-weight: 600; font-size: 15px;">
                ${escapeHtml(rec.title)}
              </a>
              ${rec.subtitle ? `<div style="font-size: 13px; color: #94a3b8; margin-top: 2px;">${escapeHtml(rec.subtitle)}</div>` : ""}
              ${rec.matchScore ? `<div style="font-size: 11px; color: #10b981; margin-top: 4px;">${rec.matchScore}% match</div>` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join("");

  return `
    <tr>
      <td style="padding: 24px; background: #16161b;">
        <h2 style="margin: 0 0 16px; font-size: 20px; color: #f1f5f9;">✨ Recommended For You</h2>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${recsHtml}
        </table>
      </td>
    </tr>
  `;
}

/**
 * Generate leaderboard position section for email
 */
export function leaderboardSection(position: LeaderboardPosition | null): string {
  if (!position || position.rank > 100) return "";

  const rankChange = position.previousRank
    ? position.previousRank - position.rank
    : 0;
  const rankIcon = rankChange > 0 ? "⬆️" : rankChange < 0 ? "⬇️" : "";
  const rankColor = rankChange > 0 ? "#10b981" : rankChange < 0 ? "#ef4444" : "#64748b";

  const medalEmoji = position.rank === 1 ? "🥇"
    : position.rank === 2 ? "🥈"
    : position.rank === 3 ? "🥉"
    : position.rank <= 10 ? "🏅"
    : "⭐";

  return `
    <tr>
      <td style="padding: 24px;">
        <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-radius: 12px; padding: 20px; text-align: center;">
          <div style="font-size: 36px; margin-bottom: 8px;">${medalEmoji}</div>
          <div style="font-size: 14px; color: #a5b4fc; margin-bottom: 4px;">Community Leaderboard</div>
          <div style="font-size: 32px; font-weight: bold; color: #f1f5f9;">
            #${position.rank}
            ${rankChange !== 0 ? `<span style="font-size: 14px; color: ${rankColor}; margin-left: 8px;">${rankIcon} ${Math.abs(rankChange)}</span>` : ""}
          </div>
          <div style="font-size: 13px; color: #94a3b8; margin-top: 8px;">
            ${position.points.toLocaleString()} engagement points
          </div>
          <div style="margin-top: 16px;">
            <a href="${SITE_URL}/community/leaderboard" style="display: inline-block; padding: 10px 24px; background: #6366f1; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">View Leaderboard</a>
          </div>
        </div>
      </td>
    </tr>
  `;
}

// ============================================
// PLAIN TEXT VERSIONS
// ============================================

/**
 * Generate plain text summary of engagement data
 */
export function engagementTextSummary(
  stats: EngagementData,
  badges: BadgeData[],
  streak: StreakData,
  recommendations: RecommendationData[],
  position: LeaderboardPosition | null
): string {
  const sections: string[] = [];

  // Stats section
  sections.push(`YOUR WEEK IN NUMBERS
- Profile Views: ${stats.profileViews} (${stats.profileViewsChange >= 0 ? "+" : ""}${stats.profileViewsChange} from last week)
- Applications Submitted: ${stats.applicationsSubmitted}
- New Connections: ${stats.connectionsGained}
- Engagement: ${stats.postsLiked}`);

  // Badges section
  if (badges.length > 0) {
    const badgeList = badges.map(b => `- ${b.icon} ${b.name} (${b.tier})`).join("\n");
    sections.push(`\nBADGES EARNED THIS WEEK\n${badgeList}`);
  }

  // Streak section
  if (streak.currentStreak > 0) {
    const streakStatus = streak.isAtRisk
      ? "(at risk - visit today to keep it going!)"
      : "";
    sections.push(`\nYOUR STREAK\n${streak.currentStreak} day streak ${streakStatus}\nPersonal best: ${streak.longestStreak} days`);
  }

  // Recommendations section
  if (recommendations.length > 0) {
    const recList = recommendations.slice(0, 4).map(r => {
      const match = r.matchScore ? ` (${r.matchScore}% match)` : "";
      return `- ${r.title}${match}\n  ${r.url}`;
    }).join("\n");
    sections.push(`\nRECOMMENDED FOR YOU\n${recList}`);
  }

  // Leaderboard section
  if (position && position.rank <= 100) {
    sections.push(`\nLEADERBOARD\nYou're ranked #${position.rank} with ${position.points.toLocaleString()} points!`);
  }

  return sections.join("\n");
}
