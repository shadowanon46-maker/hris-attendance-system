/**
 * Shift Validation Utilities
 * 
 * Centralized logic for validating attendance check-in/check-out against shift schedules.
 * Handles night shifts (crossing midnight) and WIB timezone.
 */

// ============================================
// Configuration Constants
// ============================================

// Check-in: 15 minutes before shift start to 60 minutes after shift start
export const CHECKIN_BEFORE_MINUTES = 15;
export const CHECKIN_AFTER_MINUTES = 60;

// Check-out: 0 minutes before shift end to 60 minutes after shift end
export const CHECKOUT_BEFORE_MINUTES = 0;
export const CHECKOUT_AFTER_MINUTES = 60;

// ============================================
// Timezone Helpers (WIB - Asia/Jakarta UTC+7)
// ============================================

/**
 * Get current date/time in WIB timezone
 * @returns {Date} Current time adjusted to WIB
 */
export function getWIBDate() {
    const now = new Date();
    const wibOffset = 7 * 60; // WIB is UTC+7
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wibTime = new Date(utcTime + (wibOffset * 60000));
    return wibTime;
}

/**
 * Format date to YYYY-MM-DD string
 * @param {Date|null} date - Date object (defaults to current WIB date)
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function getWIBDateString(date = null) {
    const wibDate = date ? new Date(date) : getWIBDate();
    const year = wibDate.getFullYear();
    const month = String(wibDate.getMonth() + 1).padStart(2, '0');
    const day = String(wibDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get current time string in HH:MM:SS format (WIB)
 * @returns {string} Time string in HH:MM:SS format
 */
export function getWIBTimeString() {
    const wibDate = getWIBDate();
    return wibDate.toTimeString().split(' ')[0]; // HH:MM:SS
}

// ============================================
// Time Conversion Helpers
// ============================================

/**
 * Convert time string (HH:MM:SS or HH:MM) to minutes since midnight
 * @param {string} timeStr - Time string in HH:MM:SS or HH:MM format
 * @returns {number} Minutes since midnight (0-1439)
 */
export function timeToMinutes(timeStr) {
    const parts = timeStr.split(':').map(Number);
    const h = parts[0] || 0;
    const m = parts[1] || 0;
    return h * 60 + m;
}

/**
 * Convert minutes since midnight to HH:MM string
 * @param {number} minutes - Minutes since midnight
 * @returns {string} Time in HH:MM format
 */
export function minutesToTimeString(minutes) {
    // Handle wrap-around (negative or > 1440)
    let mins = minutes;
    while (mins < 0) mins += 1440;
    while (mins >= 1440) mins -= 1440;

    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Check if a shift crosses midnight (night shift)
 * @param {string} startTime - Shift start time (HH:MM:SS)
 * @param {string} endTime - Shift end time (HH:MM:SS)
 * @returns {boolean} True if shift crosses midnight
 */
export function isNightShift(startTime, endTime) {
    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);
    return startMin > endMin;
}

// ============================================
// Check-in Validation
// ============================================

/**
 * Validate if current time is within check-in window
 * 
 * Rules:
 * - Earliest: CHECKIN_BEFORE_MINUTES before shift start
 * - Latest: CHECKIN_AFTER_MINUTES after shift start
 * - Late: After shift start + tolerance
 * 
 * @param {Object} shift - Shift object with startTime, endTime, toleranceLate
 * @param {Date|null} currentTime - Current time (defaults to WIB now)
 * @returns {Object} { valid: boolean, error: string|null, isLate: boolean, shiftInfo: object }
 */
export function validateCheckIn(shift, currentTime = null) {
    const now = currentTime || getWIBDate();
    const currentTimeStr = now.toTimeString().split(' ')[0];
    const currentMin = timeToMinutes(currentTimeStr);

    const startMin = timeToMinutes(shift.startTime);
    const endMin = timeToMinutes(shift.endTime);
    const tolerance = shift.toleranceLate || 0;

    // Calculate check-in window
    let windowStart = startMin - CHECKIN_BEFORE_MINUTES;
    let windowEnd = startMin + CHECKIN_AFTER_MINUTES;

    // Handle midnight wrap for window boundaries
    if (windowStart < 0) windowStart += 1440;
    if (windowEnd >= 1440) windowEnd -= 1440;

    const isNight = isNightShift(shift.startTime, shift.endTime);

    // Check if current time is in window
    let isInWindow;

    if (isNight) {
        // Night shift (e.g., 23:15 - 05:00)
        // Window example: 23:00 - 00:15 (crosses midnight)
        if (windowStart > windowEnd) {
            // Window crosses midnight
            isInWindow = currentMin >= windowStart || currentMin <= windowEnd;
        } else {
            // Window doesn't cross midnight (rare edge case)
            isInWindow = currentMin >= windowStart && currentMin <= windowEnd;
        }
    } else {
        // Normal shift (e.g., 08:00 - 16:00)
        // Window example: 07:45 - 09:00
        if (windowStart > windowEnd) {
            // Window crosses midnight (edge case: shift at 00:10)
            isInWindow = currentMin >= windowStart || currentMin <= windowEnd;
        } else {
            isInWindow = currentMin >= windowStart && currentMin <= windowEnd;
        }
    }

    if (!isInWindow) {
        const windowStartStr = minutesToTimeString(windowStart);
        const windowEndStr = minutesToTimeString(windowEnd);
        return {
            valid: false,
            error: `Check-in hanya dapat dilakukan pukul ${windowStartStr} - ${windowEndStr}. Shift Anda dimulai pukul ${shift.startTime.substring(0, 5)}.`,
            isLate: false,
            shiftInfo: { startTime: shift.startTime, endTime: shift.endTime }
        };
    }

    // Check if late (after shift start + tolerance)
    let isLate = false;
    let lateThreshold = startMin + tolerance;
    if (lateThreshold >= 1440) lateThreshold -= 1440;

    if (isNight && currentMin < startMin) {
        // After midnight portion of night shift
        // Late if we're past the tolerance time (which would have wrapped)
        if (tolerance > 0 && lateThreshold < startMin) {
            // Tolerance wrapped to next day
            isLate = currentMin > lateThreshold;
        }
    } else {
        // Normal check: current > start + tolerance
        isLate = currentMin > lateThreshold;
    }

    return {
        valid: true,
        error: null,
        isLate,
        shiftInfo: {
            startTime: shift.startTime,
            endTime: shift.endTime,
            windowStart: minutesToTimeString(windowStart),
            windowEnd: minutesToTimeString(windowEnd)
        }
    };
}

// ============================================
// Check-out Validation
// ============================================

/**
 * Validate if current time is within check-out window
 * 
 * Rules:
 * - Earliest: CHECKOUT_BEFORE_MINUTES before shift end
 * - Latest: CHECKOUT_AFTER_MINUTES after shift end
 * 
 * @param {Object} shift - Shift object with startTime, endTime
 * @param {Date|null} currentTime - Current time (defaults to WIB now)
 * @returns {Object} { valid: boolean, error: string|null, shiftInfo: object }
 */
export function validateCheckOut(shift, currentTime = null) {
    const now = currentTime || getWIBDate();
    const currentTimeStr = now.toTimeString().split(' ')[0];
    const currentMin = timeToMinutes(currentTimeStr);

    const startMin = timeToMinutes(shift.startTime);
    const endMin = timeToMinutes(shift.endTime);

    // Calculate check-out window
    let windowStart = endMin - CHECKOUT_BEFORE_MINUTES;
    let windowEnd = endMin + CHECKOUT_AFTER_MINUTES;

    // Handle midnight wrap
    if (windowStart < 0) windowStart += 1440;
    if (windowEnd >= 1440) windowEnd -= 1440;

    const isNight = isNightShift(shift.startTime, shift.endTime);

    // Check if current time is in window
    let isInWindow;

    if (isNight) {
        // Night shift (e.g., 23:15 - 05:00)
        // Checkout window: 05:00 - 06:00 (doesn't cross midnight from end perspective)
        if (windowStart > windowEnd) {
            // Window crosses midnight
            isInWindow = currentMin >= windowStart || currentMin <= windowEnd;
        } else {
            isInWindow = currentMin >= windowStart && currentMin <= windowEnd;
        }
    } else {
        // Normal shift checkout window
        if (windowStart > windowEnd) {
            isInWindow = currentMin >= windowStart || currentMin <= windowEnd;
        } else {
            isInWindow = currentMin >= windowStart && currentMin <= windowEnd;
        }
    }

    if (!isInWindow) {
        const windowStartStr = minutesToTimeString(windowStart);
        const windowEndStr = minutesToTimeString(windowEnd);
        return {
            valid: false,
            error: `Check-out hanya dapat dilakukan pukul ${windowStartStr} - ${windowEndStr}. Shift Anda berakhir pukul ${shift.endTime.substring(0, 5)}.`,
            shiftInfo: { startTime: shift.startTime, endTime: shift.endTime }
        };
    }

    return {
        valid: true,
        error: null,
        shiftInfo: {
            startTime: shift.startTime,
            endTime: shift.endTime,
            windowStart: minutesToTimeString(windowStart),
            windowEnd: minutesToTimeString(windowEnd)
        }
    };
}

// ============================================
// Schedule Date Helper for Night Shifts
// ============================================

/**
 * Get the correct schedule date for attendance lookup.
 * For night shifts, if current time is after midnight but before shift end,
 * the schedule date should be the previous day.
 * 
 * @param {Object} shift - Shift object with startTime, endTime
 * @param {Date|null} currentTime - Current time (defaults to WIB now)
 * @returns {string} Schedule date in YYYY-MM-DD format
 */
export function getScheduleDateForShift(shift, currentTime = null) {
    const now = currentTime || getWIBDate();
    const currentTimeStr = now.toTimeString().split(' ')[0];
    const currentMin = timeToMinutes(currentTimeStr);

    const startMin = timeToMinutes(shift.startTime);
    const endMin = timeToMinutes(shift.endTime);

    // For night shifts, check if we're in the "after midnight" portion
    if (isNightShift(shift.startTime, shift.endTime)) {
        // If current time is between midnight and shift end, 
        // the shift started yesterday
        if (currentMin <= endMin) {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            return getWIBDateString(yesterday);
        }
    }

    return getWIBDateString(now);
}

/**
 * Determine attendance status based on check-in time
 * @param {Object} shift - Shift object with startTime, toleranceLate
 * @param {Date|null} checkInTime - Check-in time (defaults to WIB now)
 * @returns {string} 'hadir' (present) or 'terlambat' (late)
 */
export function determineAttendanceStatus(shift, checkInTime = null) {
    const result = validateCheckIn(shift, checkInTime);
    return result.isLate ? 'terlambat' : 'hadir';
}
