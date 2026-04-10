import { addMinutes, addHours, addDays, getHours, getMinutes, setHours, setMinutes, isBefore } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

/**
 * COMPLIANCE SERVICE v2.0
 * Handles calling windows, timezone resolution, and working-day enforcement.
 */

export interface ComplianceConfig {
    startHour: number;     // e.g. 9
    endHour: number;       // e.g. 20
    timezone: string;      // e.g. "Europe/Madrid"
    workingDays?: number[]; // [1,2,3,4,5] Mon-Fri. Default: all days
}

export interface ComplianceDecision {
    canExecuteNow: boolean;
    timezone: string;
    localTimeStr: string;       // Human readable "14:32 CET"
    delayMs: number;            // 0 if immediate, else ms to wait
    scheduledFor: Date | null;  // null if immediate
    reason: string;
}

// ─── Phone Prefix → Timezone mapping ─────────────────────────────

const PHONE_PREFIX_TIMEZONE: Record<string, string> = {
    "+34": "Europe/Madrid",
    "+56": "America/Santiago",
    "+52": "America/Mexico_City",
    "+57": "America/Bogota",
    "+51": "America/Lima",
    "+54": "America/Argentina/Buenos_Aires",
    "+598": "America/Montevideo",
    "+595": "America/Asuncion",
    "+591": "America/La_Paz",
    "+593": "America/Guayaquil",
    "+1":   "America/New_York",
    "+44":  "Europe/London",
    "+33":  "Europe/Paris",
    "+49":  "Europe/Berlin",
    "+55":  "America/Sao_Paulo",
};

/**
 * Resolves timezone from phone prefix, country code, or defaults to Spain.
 * Phone prefix map can be overridden by tenant config.
 */
export function resolveTimezone(
    phone?: string | null,
    country?: string | null,
    customPrefixMap?: Record<string, string>
): string {
    const prefixMap = { ...PHONE_PREFIX_TIMEZONE, ...customPrefixMap };

    // Try phone prefixes (longest match first for e.g. +598 vs +5)
    if (phone) {
        const cleanPhone = phone.replace(/\s|-|\(|\)/g, "");
        const prefixes = Object.keys(prefixMap).sort((a, b) => b.length - a.length);
        for (const prefix of prefixes) {
            if (cleanPhone.startsWith(prefix)) {
                return prefixMap[prefix];
            }
        }
    }

    // Country fallback
    const countryMap: Record<string, string> = {
        "ESP": "Europe/Madrid",
        "MEX": "America/Mexico_City",
        "COL": "America/Bogota",
        "CHL": "America/Santiago",
        "PER": "America/Lima",
        "ARG": "America/Argentina/Buenos_Aires",
    };
    if (country && countryMap[country.toUpperCase()]) {
        return countryMap[country.toUpperCase()];
    }

    return "Europe/Madrid";
}

/**
 * Determines if it's currently within a legal calling window.
 */
export function isWithinLegalWindow(config: ComplianceConfig): boolean {
    const nowZoned = toZonedTime(new Date(), config.timezone);
    const currentHour = getHours(nowZoned);
    const currentMinute = getMinutes(nowZoned);
    
    const currentMinutes = currentHour * 60 + currentMinute;
    const startMinutes = config.startHour * 60;
    const endMinutes = config.endHour * 60;
    
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Checks if today is a working day in the given timezone.
 */
export function isWorkingDay(timezone: string, workingDays: number[] = [1, 2, 3, 4, 5]): boolean {
    const nowZoned = toZonedTime(new Date(), timezone);
    const dayOfWeek = nowZoned.getDay(); // 0=Sun, 1=Mon...6=Sat
    return workingDays.includes(dayOfWeek);
}

/**
 * Calculates the Date of the next window start (next working day at startHour).
 */
export function getNextWindowStart(config: ComplianceConfig, workingDays: number[] = [1, 2, 3, 4, 5]): Date {
    const timezone = config.timezone;
    let candidate = toZonedTime(new Date(), timezone);

    // Try up to 7 days ahead to find next working day
    for (let i = 0; i < 7; i++) {
        // Set to startHour:00 of the candidate day
        const dayStart = setMinutes(setHours(candidate, config.startHour), 0);
        const isWorking = workingDays.includes(candidate.getDay());
        const isInFuture = isBefore(new Date(), fromZonedTime(dayStart, timezone));

        if (isWorking && isInFuture) {
            return fromZonedTime(dayStart, timezone);
        }
        candidate = addDays(candidate, 1);
    }

    // Fallback: 24 hours from now
    return addHours(new Date(), 24);
}

/**
 * Master compliance decision function.
 * Given a lead phone and tenant config, returns whether to execute now or when.
 */
export function buildComplianceDecision(
    phone: string | null | undefined,
    country: string | null | undefined,
    timezoneRules: {
        start: string;
        end: string;
        working_days: number[];
        phone_prefix_map?: Record<string, string>;
    }
): ComplianceDecision {
    const timezone = resolveTimezone(phone, country, timezoneRules.phone_prefix_map);

    const [startH] = timezoneRules.start.split(":").map(Number);
    const [endH] = timezoneRules.end.split(":").map(Number);

    const config: ComplianceConfig = {
        timezone,
        startHour: startH,
        endHour: endH,
        workingDays: timezoneRules.working_days,
    };

    const inWindow = isWithinLegalWindow(config);
    const inWorkingDay = isWorkingDay(timezone, timezoneRules.working_days);

    // Format local time for logging
    const nowZoned = toZonedTime(new Date(), timezone);
    const localTimeStr = `${String(getHours(nowZoned)).padStart(2, "0")}:${String(getMinutes(nowZoned)).padStart(2, "0")} (${timezone})`;

    if (inWindow && inWorkingDay) {
        return {
            canExecuteNow: true,
            timezone,
            localTimeStr,
            delayMs: 0,
            scheduledFor: null,
            reason: `✅ Dentro de ventana laboral [${timezoneRules.start}-${timezoneRules.end}]`,
        };
    }

    // Calculate delay until next window
    const nextWindow = getNextWindowStart(config, timezoneRules.working_days);
    const delayMs = nextWindow.getTime() - Date.now();

    const reason = !inWorkingDay
        ? `⏸ Día no laboral. Programado para: ${nextWindow.toISOString()}`
        : `⏸ Fuera de ventana horaria [${timezoneRules.start}-${timezoneRules.end}]. Hora local: ${localTimeStr}`;

    return {
        canExecuteNow: false,
        timezone,
        localTimeStr,
        delayMs: Math.max(0, delayMs),
        scheduledFor: nextWindow,
        reason,
    };
}
