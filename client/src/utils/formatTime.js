// Milliseconds → "HH:MM:SS", e.g. a moment's offset from the start of a session
export function formatClock(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
}

// Time of `date` since `start`, as "HH:MM:SS"
export function offsetFrom(start, date) {
    return formatClock(new Date(date) - new Date(start));
}

// Milliseconds → a short duration for labels, e.g. "45 sec", "12 min", "1 h 5 min"
export function formatDuration(ms) {
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    if (totalSeconds < 60) return `${totalSeconds} sec`;
    const totalMinutes = Math.round(totalSeconds / 60);
    if (totalMinutes < 60) return `${totalMinutes} min`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
}

// How long a session ran: until it ended, or until its last screenshot if it hasn't been closed yet
export function sessionDuration(session) {
    const end = session.endedAt || session.lastActivityAt || session.startedAt;
    return new Date(end) - new Date(session.startedAt);
}
