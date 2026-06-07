"use client";

import { useState } from "react";
import Link from "next/link";
import type { Meeting } from "@/lib/types";
import { StatusBadge, TypeBadge } from "@/components/Badge";
import { formatDate, formatDuration } from "@/lib/utils";

function topTalker(meeting: Meeting): string | null {
  if (!meeting.participation || meeting.participation.length === 0) return null;
  const top = [...meeting.participation].sort((a, b) => b.talkPct - a.talkPct)[0];
  return `${top.employeeName} (${Math.round(top.talkPct)}%)`;
}

interface Props {
  meeting: Meeting;
  archivedView: boolean;
  busy: boolean;
  onEdit: (m: Meeting) => void;
  onArchive: (m: Meeting, archived: boolean) => void;
  onDelete: (m: Meeting) => void;
}

export default function MeetingCard({
  meeting: m,
  archivedView,
  busy,
  onEdit,
  onArchive,
  onDelete,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const leader = topTalker(m);

  function act(fn: () => void) {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setMenuOpen(false);
      fn();
    };
  }

  return (
    <div className="relative">
      <Link
        href={`/meetings/${m.id}`}
        className="card card-hover p-5 flex flex-col gap-3 group"
        style={busy ? { opacity: 0.5, pointerEvents: "none" } : undefined}
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <h3
            className="text-sm font-semibold leading-snug line-clamp-2 transition-colors duration-200 group-hover:text-[var(--accent)]"
            style={{ color: "var(--text-1)" }}
          >
            {m.title}
          </h3>
          {/* spacer for the menu button which is absolutely positioned */}
          <div className="shrink-0" style={{ width: 44, height: 20 }}>
            <StatusBadge status={m.status} />
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-2 items-center">
          <TypeBadge type={m.type} />
          <span className="text-xs" style={{ color: "var(--text-3)" }}>
            {formatDate(m.createdAt)}
          </span>
          {m.durationSec > 0 && (
            <span className="text-xs" style={{ color: "var(--text-3)" }}>
              · {formatDuration(m.durationSec)}
            </span>
          )}
        </div>

        {/* Top talker */}
        {leader && (
          <div
            className="flex items-center gap-1.5 text-xs mt-auto pt-2"
            style={{ color: "var(--text-2)", borderTop: "1px solid var(--border)" }}
          >
            <span className="material-symbols-outlined shrink-0" style={{ fontSize: 14 }}>
              person
            </span>
            {leader}
          </div>
        )}
      </Link>

      {/* ── Overflow menu (overlays the card, doesn't trigger navigation) ── */}
      <button
        type="button"
        aria-label="Meeting actions"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        disabled={busy}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenuOpen((v) => !v);
        }}
        className="absolute top-3 right-3 flex items-center justify-center rounded-md transition-colors"
        style={{
          width: 28,
          height: 28,
          color: "var(--text-3)",
          background: menuOpen ? "var(--bg-surface-high)" : "transparent",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
          more_vert
        </span>
      </button>

      {menuOpen && (
        <>
          {/* click-away backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen(false);
            }}
          />
          <div
            role="menu"
            className="absolute z-20 top-11 right-3 rounded-lg py-1 shadow-lg"
            style={{
              minWidth: 150,
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}
          >
            {archivedView ? (
              <MenuItem icon="unarchive" label="Restore" onClick={act(() => onArchive(m, false))} />
            ) : (
              <>
                <MenuItem icon="edit" label="Edit details" onClick={act(() => onEdit(m))} />
                <MenuItem icon="archive" label="Archive" onClick={act(() => onArchive(m, true))} />
              </>
            )}
            <MenuItem icon="delete" label="Delete" danger onClick={act(() => onDelete(m))} />
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: string;
  label: string;
  danger?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left transition-colors hover:bg-[var(--bg-surface-high)]"
      style={{ color: danger ? "var(--red)" : "var(--text-2)" }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 17 }}>
        {icon}
      </span>
      {label}
    </button>
  );
}
