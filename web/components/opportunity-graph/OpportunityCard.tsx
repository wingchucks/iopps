/**
 * IOPPS Social Opportunity Graph — Opportunity Card
 * 
 * Universal card component for jobs, scholarships, events, products, etc.
 * The core building block of the feed.
 */

"use client";

import { useState } from "react";
import { colors, typeConfig, OpportunityType } from "./tokens";
import { Icon, IconName } from "./Icon";
import { Avatar } from "./Avatar";
import { Badge, Tag } from "./Badge";
import { Button, EngagementButton } from "./Button";

export interface OpportunityAuthor {
  id?: string;
  name: string;
  nation?: string;
  verified?: boolean;
  avatarUrl?: string;
}

export interface OpportunityMeta {
  // Jobs
  salary?: string;
  mode?: string; // "Remote", "Hybrid · Saskatoon", etc.
  type?: string; // "Full-time", "Part-time", etc.
  deadline?: string;
  apps?: number; // applicant count
  
  // Education
  amount?: string; // scholarship amount
  institution?: string;
  delivery?: string; // "Hybrid · Regina"
  start?: string; // "Sep 2026"
  
  // Events
  date?: string;
  venue?: string;
  price?: string;
  
  // Products
  materials?: string;
  madeToOrder?: boolean;
  
  // Livestream
  status?: "live" | "replay" | "upcoming";
  duration?: string;
  viewers?: number;
  platform?: string;
}

export interface OpportunityEngagement {
  saves?: number;
  comments?: number;
  apps?: number;
  views?: number;
}

export interface OpportunityItem {
  id: string;
  type: OpportunityType;
  author: OpportunityAuthor;
  title: string;
  summary: string;
  time: string; // "2h ago", "3d ago"
  meta?: OpportunityMeta;
  engagement?: OpportunityEngagement;
  social?: string; // "12 people from your network saved this"
  saved?: boolean;
  href?: string; // link to detail page
  live?: boolean; // currently live (livestreams)
  featured?: boolean; // editorially featured
}

interface OpportunityCardProps {
  item: OpportunityItem;
  compact?: boolean;
  onNavigate?: (destination: string, itemId?: string) => void;
  onSave?: (itemId: string, saved: boolean) => void;
}

export function OpportunityCard({ item, compact = false, onNavigate, onSave }: OpportunityCardProps) {
  const saved = item.saved || false; // Controlled by parent
  const [hovered, setHovered] = useState(false);
  const saveCount = item.engagement?.saves || 0;

  const config = typeConfig[item.type] || typeConfig.job;
  const isLive = item.type === "livestream" && item.meta?.status === "live";
  const isReplay = item.type === "livestream" && item.meta?.status === "replay";

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newSaved = !saved;
    onSave?.(item.id, newSaved);
  };

  const handleCardClick = () => {
    if (item.href) {
      // If there's an href, navigate there
      window.location.href = item.href;
    } else if (onNavigate) {
      // Otherwise use the navigation callback
      const destination = item.type === "job" ? "job" : 
                         item.type === "update" ? "member" : "org";
      onNavigate(destination, item.id);
    }
  };

  const handleAuthorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.author.id && onNavigate) {
      onNavigate("org", item.author.id);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleCardClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleCardClick(); } }}
      style={{
        background: colors.surface,
        borderRadius: 12,
        overflow: "hidden",
        border: isLive
          ? `2px solid ${colors.red}`
          : `1px solid ${hovered ? colors.textMuted : colors.border}`,
        transition: "all 0.2s",
        boxShadow: isLive
          ? `0 0 0 4px ${colors.redBg}`
          : hovered
          ? "0 4px 12px rgba(0,0,0,0.06)"
          : "0 1px 3px rgba(0,0,0,0.03)",
        cursor: "pointer",
      }}
    >
      {/* Live Banner */}
      {isLive && (
        <div
          style={{
            background: "linear-gradient(90deg, #DC2626, #EF4444)",
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#fff",
                animation: "ioppsPulse 1.5s ease-in-out infinite",
              }}
            />
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>
              LIVE NOW
            </span>
          </div>
          <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>
            👥 {item.meta?.viewers} watching
          </span>
        </div>
      )}

      <div style={{ padding: compact ? "12px 16px" : "16px 20px" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: compact ? 8 : 12,
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Avatar
              name={item.author.name}
              src={item.author.avatarUrl}
              size={compact ? 32 : 36}
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  onClick={handleAuthorClick}
                  {...(item.author.id ? {
                    role: "button" as const,
                    tabIndex: 0,
                    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleAuthorClick(e as unknown as React.MouseEvent); } },
                  } : {})}
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: colors.text,
                    cursor: item.author.id ? "pointer" : "default",
                  }}
                >
                  {item.author.name}
                </span>
                {item.author.verified && <Icon name="verified" size={14} color={colors.accent} />}
              </div>
              <span style={{ fontSize: 12, color: colors.textSoft }}>
                {item.author.nation} · {item.time}
              </span>
            </div>
          </div>
          <Badge variant={isLive ? "live" : "default"}>
            {config.emoji} {config.label}
          </Badge>
        </div>

        {/* Title + Summary */}
        <h3
          style={{
            fontSize: compact ? 15 : 16,
            fontWeight: 700,
            color: colors.text,
            margin: "0 0 6px",
            lineHeight: 1.35,
          }}
        >
          {item.title}
        </h3>
        <p
          style={{
            fontSize: 14,
            color: colors.textSoft,
            margin: "0 0 12px",
            lineHeight: 1.55,
          }}
        >
          {item.summary}
        </p>

        {/* Meta Tags */}
        {item.meta && item.type !== "update" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {item.meta.salary && <Tag>💰 {item.meta.salary}</Tag>}
            {item.meta.mode && <Tag>📍 {item.meta.mode}</Tag>}
            {item.meta.type && <Tag>⏰ {item.meta.type}</Tag>}
            {item.meta.deadline && <Tag warn>⏳ {item.meta.deadline}</Tag>}
            {item.meta.amount && <Tag>💰 {item.meta.amount}</Tag>}
            {item.meta.institution && <Tag>🏛 {item.meta.institution}</Tag>}
            {item.meta.delivery && <Tag>💻 {item.meta.delivery}</Tag>}
            {item.meta.start && <Tag>📅 {item.meta.start}</Tag>}
            {item.meta.date && <Tag>📅 {item.meta.date}</Tag>}
            {item.meta.venue && <Tag>📍 {item.meta.venue}</Tag>}
            {item.meta.price && !item.meta.madeToOrder && <Tag>🎟 {item.meta.price}</Tag>}
            {item.meta.price && item.meta.madeToOrder && <Tag>💰 {item.meta.price}</Tag>}
            {item.meta.materials && <Tag>🧵 {item.meta.materials}</Tag>}
            {item.meta.madeToOrder && <Tag teal>✨ Made to Order</Tag>}
            {isReplay && item.meta.duration && <Tag>⏱ {item.meta.duration}</Tag>}
            {item.meta.apps && <Tag>👥 {item.meta.apps} applicants</Tag>}
          </div>
        )}

        {/* Social Proof */}
        {item.social && (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              background: colors.accentBg,
              fontSize: 13,
              color: colors.accentDp,
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 12,
            }}
          >
            <Icon name="users" size={14} color={colors.accent} />
            {item.social}
          </div>
        )}

        {/* Engagement Strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 12,
            borderTop: `1px solid ${colors.borderLt}`,
          }}
        >
          <div style={{ display: "flex", gap: 4 }}>
            <EngagementButton
              icon={saved ? "heartFill" : "heart"}
              label={saveCount || ""}
              active={saved}
              activeColor={colors.red}
              onClick={handleSave}
              aria-label={saved ? "Unsave" : "Save"}
            />
            <EngagementButton
              icon="chat"
              label={item.engagement?.comments || ""}
              aria-label="Comments"
            />
            <EngagementButton icon="share" aria-label="Share" />
            <EngagementButton icon="bookmark" aria-label="Bookmark" />
          </div>

          {config.cta && (
            isLive ? (
              <Button variant="live" size="sm" icon="video">
                Join Live
              </Button>
            ) : isReplay ? (
              <Button variant="secondary" size="sm" icon="play">
                Watch Replay
              </Button>
            ) : (
              <Button variant="primary" size="sm" icon={config.ctaIcon as IconName}>
                {config.cta}
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
