'use client';

import { useState } from 'react';
import { format, addDays, startOfWeek, isSameDay, setHours, setMinutes } from 'date-fns';
import {
  CalendarDaysIcon,
  ClockIcon,
  VideoCameraIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

export interface InterviewSlot {
  date: Date;
  time: string;
  duration: number; // minutes
  type: 'video' | 'phone' | 'in-person';
  location?: string;
  notes?: string;
}

interface InterviewSchedulerProps {
  candidateName: string;
  candidateEmail?: string;
  jobTitle: string;
  onSchedule: (slot: InterviewSlot) => void;
  onCancel: () => void;
}

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00',
];

const DURATIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
];

const INTERVIEW_TYPES = [
  { value: 'video', label: 'Video Call', icon: VideoCameraIcon },
  { value: 'phone', label: 'Phone Call', icon: PhoneIcon },
  { value: 'in-person', label: 'In-Person', icon: BuildingOfficeIcon },
] as const;

export function InterviewScheduler({
  candidateName,
  candidateEmail,
  jobTitle,
  onSchedule,
  onCancel,
}: InterviewSchedulerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [duration, setDuration] = useState(30);
  const [interviewType, setInterviewType] = useState<'video' | 'phone' | 'in-person'>('video');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  // Generate next 14 days
  const today = new Date();
  const dates = Array.from({ length: 14 }, (_, i) => addDays(today, i + 1));
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });

  const handleSchedule = () => {
    if (!selectedDate || !selectedTime) return;

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const scheduledDate = setMinutes(setHours(selectedDate, hours), minutes);

    onSchedule({
      date: scheduledDate,
      time: selectedTime,
      duration,
      type: interviewType,
      location: interviewType === 'in-person' ? location : undefined,
      notes: notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-card-border rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--card-border)]">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Schedule Interview</h2>
            <p className="text-sm text-[var(--text-muted)]">
              {candidateName} for {jobTitle}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-[var(--text-muted)] hover:text-foreground rounded-lg hover:bg-surface"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              <CalendarDaysIcon className="w-4 h-4 inline mr-2" />
              Select Date
            </label>
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-xs text-center text-[var(--text-muted)] font-medium py-1">
                  {day}
                </div>
              ))}
              {dates.map((date, i) => {
                const isSelected = selectedDate && isSameDay(date, selectedDate);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(date)}
                    className={`p-2 rounded-lg text-center transition-colors ${
                      isSelected
                        ? 'bg-accent text-slate-950 font-semibold'
                        : isWeekend
                        ? 'bg-surface/50 text-[var(--text-muted)] hover:bg-surface'
                        : 'bg-surface text-foreground hover:bg-accent/20'
                    }`}
                  >
                    <div className="text-sm font-medium">{format(date, 'd')}</div>
                    <div className="text-xs opacity-70">{format(date, 'MMM')}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Selection */}
          {selectedDate && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                <ClockIcon className="w-4 h-4 inline mr-2" />
                Select Time
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {TIME_SLOTS.map(time => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      selectedTime === time
                        ? 'bg-accent text-slate-950'
                        : 'bg-surface text-foreground hover:bg-accent/20'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Duration
            </label>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map(d => (
                <button
                  key={d.value}
                  onClick={() => setDuration(d.value)}
                  className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    duration === d.value
                      ? 'bg-accent text-slate-950'
                      : 'bg-surface text-foreground hover:bg-accent/20'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interview Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Interview Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              {INTERVIEW_TYPES.map(type => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setInterviewType(type.value)}
                    className={`flex flex-col items-center gap-2 py-4 px-3 rounded-xl border transition-colors ${
                      interviewType === type.value
                        ? 'bg-accent/10 border-accent text-accent'
                        : 'bg-surface border-[var(--card-border)] text-foreground hover:border-accent/30'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location (for in-person) */}
          {interviewType === 'in-person' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Office address or meeting room"
                className="w-full rounded-xl border border-[var(--card-border)] bg-surface px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Notes for Candidate (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What to prepare, who they'll meet, etc."
              rows={3}
              className="w-full rounded-xl border border-[var(--card-border)] bg-surface px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 p-5 border-t border-[var(--card-border)] bg-surface/50">
          <div className="text-sm text-[var(--text-muted)]">
            {selectedDate && selectedTime ? (
              <>
                <CheckIcon className="w-4 h-4 inline text-green-400 mr-1" />
                {format(selectedDate, 'EEEE, MMMM d')} at {selectedTime} ({duration} min)
              </>
            ) : (
              'Select a date and time'
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-foreground border border-[var(--card-border)] rounded-xl hover:bg-surface"
            >
              Cancel
            </button>
            <button
              onClick={handleSchedule}
              disabled={!selectedDate || !selectedTime}
              className="px-4 py-2 text-sm font-medium bg-accent text-slate-950 rounded-xl hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Invitation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
