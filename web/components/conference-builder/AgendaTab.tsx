/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { type Conference, type ConferenceAgendaDay, type ConferenceSession } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

interface AgendaTabProps {
    conference: Conference;
    onChange: (updates: Partial<Conference>) => void;
}

export function AgendaTab({ conference, onChange }: AgendaTabProps) {
    const [activeDayIndex, setActiveDayIndex] = useState(0);

    const agenda = conference.agenda || [];

    const addDay = () => {
        const newDay: ConferenceAgendaDay = {
            date: "",
            title: `Day ${agenda.length + 1}`,
            sessions: [],
        };
        onChange({ agenda: [...agenda, newDay] });
        setActiveDayIndex(agenda.length);
    };

    const removeDay = (index: number) => {
        const newAgenda = [...agenda];
        newAgenda.splice(index, 1);
        onChange({ agenda: newAgenda });
        setActiveDayIndex(Math.max(0, index - 1));
    };

    const updateDay = (index: number, updates: Partial<ConferenceAgendaDay>) => {
        const newAgenda = [...agenda];
        newAgenda[index] = { ...newAgenda[index], ...updates };
        onChange({ agenda: newAgenda });
    };

    const addSession = (dayIndex: number) => {
        const newSession: ConferenceSession = {
            id: uuidv4(),
            time: "09:00",
            title: "New Session",
            type: "workshop",
        };
        const newAgenda = [...agenda];
        newAgenda[dayIndex].sessions.push(newSession);
        onChange({ agenda: newAgenda });
    };

    const updateSession = (dayIndex: number, sessionIndex: number, updates: Partial<ConferenceSession>) => {
        const newAgenda = [...agenda];
        newAgenda[dayIndex].sessions[sessionIndex] = {
            ...newAgenda[dayIndex].sessions[sessionIndex],
            ...updates,
        };
        onChange({ agenda: newAgenda });
    };

    const removeSession = (dayIndex: number, sessionIndex: number) => {
        const newAgenda = [...agenda];
        newAgenda[dayIndex].sessions.splice(sessionIndex, 1);
        onChange({ agenda: newAgenda });
    };

    return (
        <div className="flex h-full min-h-[500px]">
            {/* Sidebar: Days */}
            <div className="w-64 border-r border-[var(--card-border)] bg-slate-900/30 p-4">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground0">
                    Days
                </h3>
                <div className="space-y-2">
                    {agenda.map((day, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveDayIndex(idx)}
                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeDayIndex === idx
                                    ? "bg-accent/10 text-[#14B8A6]"
                                    : "text-[var(--text-secondary)] hover:bg-surface"
                                }`}
                        >
                            <span>{day.title || `Day ${idx + 1}`}</span>
                            {agenda.length > 1 && (
                                <span
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm("Delete this day?")) removeDay(idx);
                                    }}
                                    className="rounded p-1 hover:bg-red-500/20 hover:text-red-400"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </span>
                            )}
                        </button>
                    ))}
                    <button
                        onClick={addDay}
                        className="flex w-full items-center gap-2 rounded-lg border border-dashed border-[var(--card-border)] px-3 py-2 text-sm text-[var(--text-muted)] hover:border-slate-500 hover:text-white"
                    >
                        <PlusIcon className="h-4 w-4" />
                        Add Day
                    </button>
                </div>
            </div>

            {/* Main Content: Sessions */}
            <div className="flex-1 p-6">
                {agenda.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-foreground0">
                        <p>No days added yet.</p>
                        <button
                            onClick={addDay}
                            className="mt-4 text-[#14B8A6] hover:underline"
                        >
                            Add your first day
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Day Metadata */}
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="text-xs text-foreground0">Day Title</label>
                                <input
                                    type="text"
                                    value={agenda[activeDayIndex].title}
                                    onChange={(e) => updateDay(activeDayIndex, { title: e.target.value })}
                                    placeholder="e.g. Opening Ceremony"
                                    className="mt-1 w-full rounded border border-[var(--card-border)] bg-surface px-3 py-1.5 text-sm text-white focus:border-[#14B8A6] focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-foreground0">Date</label>
                                <input
                                    type="date"
                                    value={agenda[activeDayIndex].date}
                                    onChange={(e) => updateDay(activeDayIndex, { date: e.target.value })}
                                    className="mt-1 w-full rounded border border-[var(--card-border)] bg-surface px-3 py-1.5 text-sm text-white focus:border-[#14B8A6] focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="h-px bg-surface" />

                        {/* Sessions List */}
                        <div className="space-y-4">
                            {agenda[activeDayIndex].sessions.map((session, sIdx) => (
                                <div
                                    key={session.id}
                                    className="group relative rounded-lg border border-[var(--card-border)] bg-surface p-4 transition-all hover:border-[var(--card-border)]"
                                >
                                    <button
                                        onClick={() => {
                                            if (confirm('Delete session?')) removeSession(activeDayIndex, sIdx);
                                        }}
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-foreground0 hover:text-red-400"
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </button>

                                    <div className="grid gap-4 md:grid-cols-12">
                                        {/* Time */}
                                        <div className="md:col-span-2">
                                            <label className="text-xs text-foreground0">Time</label>
                                            <input
                                                type="time"
                                                value={session.time}
                                                onChange={(e) => updateSession(activeDayIndex, sIdx, { time: e.target.value })}
                                                className="w-full rounded bg-surface px-2 py-1 text-sm text-white focus:outline-none"
                                            />
                                            <input
                                                type="time"
                                                value={session.endTime || ""}
                                                onChange={(e) => updateSession(activeDayIndex, sIdx, { endTime: e.target.value })}
                                                className="mt-1 w-full rounded bg-surface px-2 py-1 text-xs text-[var(--text-muted)] focus:outline-none"
                                                placeholder="End"
                                            />
                                        </div>

                                        {/* Details */}
                                        <div className="md:col-span-10 space-y-2">
                                            <input
                                                type="text"
                                                value={session.title}
                                                onChange={(e) => updateSession(activeDayIndex, sIdx, { title: e.target.value })}
                                                placeholder="Session Title"
                                                className="w-full rounded bg-transparent text-lg font-medium text-white placeholder-slate-600 focus:outline-none"
                                            />
                                            <textarea
                                                value={session.description || ""}
                                                onChange={(e) => updateSession(activeDayIndex, sIdx, { description: e.target.value })}
                                                placeholder="Description..."
                                                rows={2}
                                                className="w-full rounded bg-transparent text-sm text-[var(--text-muted)] placeholder-slate-600 focus:outline-none"
                                            />

                                            <div className="flex gap-4">
                                                <select
                                                    value={session.type}
                                                    onChange={(e) => updateSession(activeDayIndex, sIdx, { type: e.target.value as any })}
                                                    className="rounded bg-surface px-2 py-1 text-xs text-[var(--text-secondary)] border border-[var(--card-border)]"
                                                >
                                                    <option value="keynote">Keynote</option>
                                                    <option value="workshop">Workshop</option>
                                                    <option value="panel">Panel</option>
                                                    <option value="break">Break</option>
                                                    <option value="networking">Networking</option>
                                                    <option value="ceremony">Ceremony</option>
                                                    <option value="other">Other</option>
                                                </select>

                                                {/* TODO: Speaker Selector */}
                                                <div className="flex-1 text-xs text-foreground0 flex items-center">
                                                    Speakers: {session.speakerIds?.length || 0} selected
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <button
                                onClick={() => addSession(activeDayIndex)}
                                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--card-border)] bg-slate-800/20 py-4 text-sm text-[var(--text-muted)] hover:bg-surface hover:text-white"
                            >
                                <PlusIcon className="h-5 w-5" />
                                Add Session
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
