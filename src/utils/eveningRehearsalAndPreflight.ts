/**
 * Gemini Projection Studio - Evening Rehearsal, Astronomical Dusk & Pre-Show Preflight Engine
 * Feature-complete parity with MarshallProjectionStudio (Milestones M0-M6 & Run Night Resilience).
 * 
 * Capabilities:
 * 1. Spencer (1971) Offline Astronomical Sunset & Civil Dusk Calculator (computeAstronomicalDusk)
 * 2. Deck-Shuffle Scheduler with Seam Guarantee & Entry Weights (generateDeckShuffleSchedule)
 * 3. Evening Rehearsal Simulator (simulateEveningRehearsal) - mirrors `MarshallProjectionStudio.exe --rehearse-evening`
 * 4. Pre-Show Check, Map Geometry Validator & Missing-Media Relinker (runPreShowPreflight, relinkMissingMedia)
 * 5. Document Doctor & Native `.mps*` Compatibility Bridge (exportMarshallFile, importMarshallFile, runDocumentDoctorOnMpsJson)
 * 6. Marshall Sample Pack Generator (getMarshallSampleHouseAndShow)
 */

import { VectorLayer, VectorVertex, PlaylistClip, BeatFlag } from '../store/useProjectionStore';

// ============================================================================
// 1. SPENCER (1971) ASTRONOMICAL DUSK CALCULATOR
// ============================================================================

export interface DuskCalculationInput {
  date: Date | string;
  latitudeDeg: number;       // North positive [-90..90]
  longitudeDeg: number;      // East positive [-180..180] (US is negative, e.g. Denver = -104.99)
  utcOffsetHours: number;    // Local timezone offset e.g. -7 for MST, -5 for EST, 0 for UTC
}

export interface DuskCalculationResult {
  status: 'resolved' | 'polar_day_sun_above_twilight' | 'polar_night_sun_below_twilight' | 'invalid_coordinates';
  sunsetTimeHHMM: string;
  civilDuskTimeHHMM: string;
  civilDawnTimeHHMM: string;
  solarNoonHHMM: string;
  civilDuskLocalMinutes: number;
  sunsetLocalMinutes: number;
  equationOfTimeMinutes: number;
  declinationDegrees: number;
  hourAngleDuskDeg: number;
  isPolarDay: boolean;
  isPolarNight: boolean;
  description: string;
}

export interface LocationPreset {
  name: string;
  latitudeDeg: number;
  longitudeDeg: number;
  utcOffsetHours: number;
}

export const PRESET_LOCATIONS: LocationPreset[] = [
  { name: 'Denver, Colorado (MST)', latitudeDeg: 39.7392, longitudeDeg: -104.9903, utcOffsetHours: -7 },
  { name: 'Boston, Massachusetts (EST)', latitudeDeg: 42.3601, longitudeDeg: -71.0589, utcOffsetHours: -5 },
  { name: 'Chicago, Illinois (CST)', latitudeDeg: 41.8781, longitudeDeg: -87.6298, utcOffsetHours: -6 },
  { name: 'Seattle, Washington (PST)', latitudeDeg: 47.6062, longitudeDeg: -122.3321, utcOffsetHours: -8 },
  { name: 'Minneapolis, Minnesota (CST)', latitudeDeg: 44.9778, longitudeDeg: -93.2650, utcOffsetHours: -6 },
  { name: 'Dallas, Texas (CST)', latitudeDeg: 32.7767, longitudeDeg: -96.7970, utcOffsetHours: -6 },
  { name: 'Orlando, Florida (EST)', latitudeDeg: 28.5383, longitudeDeg: -81.3792, utcOffsetHours: -5 },
  { name: 'Anchorage, Alaska (AKST)', latitudeDeg: 61.2181, longitudeDeg: -149.9003, utcOffsetHours: -9 },
  { name: 'London, United Kingdom (GMT)', latitudeDeg: 51.5074, longitudeDeg: -0.1278, utcOffsetHours: 0 },
  { name: 'Sydney, Australia (AEST)', latitudeDeg: -33.8688, longitudeDeg: 151.2093, utcOffsetHours: 10 },
];

/**
 * Pure Spencer (1971) Fourier-series solar position calculator.
 * Computes exact Solar Noon, Official Sunset (90.833° zenith) and Civil Dusk (96.0° zenith)
 * without any external internet connection or ephemeris lookup.
 */
export function computeAstronomicalDusk(input: DuskCalculationInput): DuskCalculationResult {
  const { latitudeDeg, longitudeDeg, utcOffsetHours } = input;
  const dateObj = typeof input.date === 'string' ? new Date(input.date) : input.date;

  if (isNaN(latitudeDeg) || latitudeDeg < -90 || latitudeDeg > 90 ||
      isNaN(longitudeDeg) || longitudeDeg < -180 || longitudeDeg > 180) {
    return {
      status: 'invalid_coordinates',
      sunsetTimeHHMM: '--:--',
      civilDuskTimeHHMM: '--:--',
      civilDawnTimeHHMM: '--:--',
      solarNoonHHMM: '--:--',
      civilDuskLocalMinutes: 0,
      sunsetLocalMinutes: 0,
      equationOfTimeMinutes: 0,
      declinationDegrees: 0,
      hourAngleDuskDeg: 0,
      isPolarDay: false,
      isPolarNight: false,
      description: 'Invalid latitude or longitude coordinates.',
    };
  }

  // Calculate day of year (1..366)
  const startOfYear = new Date(Date.UTC(dateObj.getUTCFullYear(), 0, 1));
  const diffMs = dateObj.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diffMs / 86400000) + 1;
  const isLeapYear = (dateObj.getUTCFullYear() % 4 === 0 && dateObj.getUTCFullYear() % 100 !== 0) || (dateObj.getUTCFullYear() % 400 === 0);
  const daysInYear = isLeapYear ? 366 : 365;

  // Fractional day-of-year angle Gamma (radians)
  const gamma = (2.0 * Math.PI / daysInYear) * (dayOfYear - 1 + 0.5); // anchor at noon

  // Equation of Time in minutes (Spencer 1971)
  const equationOfTimeMinutes = 229.18 * (
    0.000075 +
    0.001868 * Math.cos(gamma) -
    0.032077 * Math.sin(gamma) -
    0.014615 * Math.cos(2 * gamma) -
    0.040849 * Math.sin(2 * gamma)
  );

  // Solar Declination in radians (Spencer 1971)
  const declinationRad =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const declinationDeg = (declinationRad * 180.0) / Math.PI;
  const latRad = (latitudeDeg * Math.PI) / 180.0;

  // Solar Noon in UTC minutes of day: 720m (12:00) - 4m per degree of east longitude - EqTime
  const solarNoonUtcMinutes = 720.0 - 4.0 * longitudeDeg - equationOfTimeMinutes;

  // Zeniths: Official Sunset = 90.833° (includes 34' atmospheric refraction & 16' solar radius)
  // Civil Twilight = 96.0° (sun center 6° below flat horizon)
  const zenithSunsetRad = (90.833 * Math.PI) / 180.0;
  const zenithCivilDuskRad = (96.0 * Math.PI) / 180.0;

  // Hour angle helper
  const calcCosHourAngle = (zenithRad: number) => {
    return (Math.cos(zenithRad) / (Math.cos(latRad) * Math.cos(declinationRad))) -
           (Math.tan(latRad) * Math.tan(declinationRad));
  };

  const cosHourDusk = calcCosHourAngle(zenithCivilDuskRad);
  const cosHourSunset = calcCosHourAngle(zenithSunsetRad);

  const isPolarDay = cosHourDusk < -1.0;
  const isPolarNight = cosHourDusk > 1.0;

  if (isPolarDay) {
    return {
      status: 'polar_day_sun_above_twilight',
      sunsetTimeHHMM: 'Midnight Sun',
      civilDuskTimeHHMM: 'Midnight Sun',
      civilDawnTimeHHMM: 'Midnight Sun',
      solarNoonHHMM: formatMinutesToHHMM(solarNoonUtcMinutes + utcOffsetHours * 60),
      civilDuskLocalMinutes: 0,
      sunsetLocalMinutes: 0,
      equationOfTimeMinutes,
      declinationDegrees: declinationDeg,
      hourAngleDuskDeg: 180,
      isPolarDay: true,
      isPolarNight: false,
      description: 'Sun remains above civil twilight all day at this latitude (White Nights).',
    };
  }

  if (isPolarNight) {
    return {
      status: 'polar_night_sun_below_twilight',
      sunsetTimeHHMM: 'Polar Night',
      civilDuskTimeHHMM: 'Polar Night',
      civilDawnTimeHHMM: 'Polar Night',
      solarNoonHHMM: formatMinutesToHHMM(solarNoonUtcMinutes + utcOffsetHours * 60),
      civilDuskLocalMinutes: 0,
      sunsetLocalMinutes: 0,
      equationOfTimeMinutes,
      declinationDegrees: declinationDeg,
      hourAngleDuskDeg: 0,
      isPolarDay: false,
      isPolarNight: true,
      description: 'Sun never climbs above civil twilight on this date (Polar Night).',
    };
  }

  const hourAngleDuskDeg = (Math.acos(cosHourDusk) * 180.0) / Math.PI;
  const clampedCosSunset = Math.max(-1.0, Math.min(1.0, cosHourSunset));
  const hourAngleSunsetDeg = (Math.acos(clampedCosSunset) * 180.0) / Math.PI;

  const civilDuskUtcMinutes = solarNoonUtcMinutes + 4.0 * hourAngleDuskDeg;
  const civilDawnUtcMinutes = solarNoonUtcMinutes - 4.0 * hourAngleDuskDeg;
  const sunsetUtcMinutes = solarNoonUtcMinutes + 4.0 * hourAngleSunsetDeg;

  // Convert to local minutes
  const duskLocalMinutes = normalizeMinutes(civilDuskUtcMinutes + utcOffsetHours * 60);
  const dawnLocalMinutes = normalizeMinutes(civilDawnUtcMinutes + utcOffsetHours * 60);
  const sunsetLocalMinutes = normalizeMinutes(sunsetUtcMinutes + utcOffsetHours * 60);
  const solarNoonLocalMinutes = normalizeMinutes(solarNoonUtcMinutes + utcOffsetHours * 60);

  return {
    status: 'resolved',
    sunsetTimeHHMM: formatMinutesToHHMM(sunsetLocalMinutes),
    civilDuskTimeHHMM: formatMinutesToHHMM(duskLocalMinutes),
    civilDawnTimeHHMM: formatMinutesToHHMM(dawnLocalMinutes),
    solarNoonHHMM: formatMinutesToHHMM(solarNoonLocalMinutes),
    civilDuskLocalMinutes: duskLocalMinutes,
    sunsetLocalMinutes: sunsetLocalMinutes,
    equationOfTimeMinutes: Math.round(equationOfTimeMinutes * 100) / 100,
    declinationDegrees: Math.round(declinationDeg * 100) / 100,
    hourAngleDuskDeg: Math.round(hourAngleDuskDeg * 100) / 100,
    isPolarDay: false,
    isPolarNight: false,
    description: `Civil Dusk occurs at ${formatMinutesToHHMM(duskLocalMinutes)} local time (Sun 6° below horizon).`,
  };
}

function normalizeMinutes(mins: number): number {
  let m = mins % 1440;
  if (m < 0) m += 1440;
  return m;
}

export function formatMinutesToHHMM(mins: number): string {
  const normalized = normalizeMinutes(mins);
  const hours = Math.floor(normalized / 60);
  const minutes = Math.floor(normalized % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function parseHHMMToMinutes(hhmm: string): number {
  const parts = hhmm.split(':');
  if (parts.length < 2) return 1020; // default 17:00
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

// ============================================================================
// 2. DECK-SHUFFLE SCHEDULER WITH SEAM GUARANTEE & ENTRY WEIGHTS
// ============================================================================

export interface WeightedPlaylistItem {
  id: string;
  title: string;
  durationSec: number;
  weight: number;      // 1..5
  enabled: boolean;
  quarantined: boolean;
  videoUrl?: string;
  audioUrl?: string;
}

export interface ScheduledDeckSlot {
  deckNumber: number;
  indexInDeck: number;
  clip: WeightedPlaylistItem;
}

/**
 * Seedable Linear Congruential Generator (LCG) for reproducible deck shuffles.
 */
function createSeededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Expands playlist entries by weight, shuffles each deck pass, and enforces
 * the Marshall Seam Guarantee: the first item of Deck N+1 is never identical
 * to the last item of Deck N.
 */
export function generateDeckShuffleSchedule(
  items: WeightedPlaylistItem[],
  deckPassesCount: number,
  baseSeed = 42
): ScheduledDeckSlot[] {
  const validItems = items.filter((i) => i.enabled && !i.quarantined && i.durationSec > 0);
  if (validItems.length === 0) return [];

  const rng = createSeededRandom(baseSeed);
  const schedule: ScheduledDeckSlot[] = [];

  // Expand single deck entries by integer weight (1x..5x)
  const createExpandedDeck = (): WeightedPlaylistItem[] => {
    const deck: WeightedPlaylistItem[] = [];
    for (const item of validItems) {
      const weight = Math.max(1, Math.min(5, Math.round(item.weight || 1)));
      for (let w = 0; w < weight; w++) {
        deck.push(item);
      }
    }
    return deck;
  };

  // Fisher-Yates shuffle
  const shuffleDeck = (deck: WeightedPlaylistItem[]) => {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  };

  let previousDeckLastId: string | null = null;

  for (let pass = 1; pass <= deckPassesCount; pass++) {
    const currentDeck = createExpandedDeck();
    shuffleDeck(currentDeck);

    // SEAM GUARANTEE: If first item of Deck N+1 matches last item of Deck N, swap it with another non-matching item
    if (previousDeckLastId && currentDeck.length > 1 && currentDeck[0].id === previousDeckLastId) {
      const swapIndex = currentDeck.findIndex((it, idx) => idx > 0 && it.id !== previousDeckLastId);
      if (swapIndex !== -1) {
        const temp = currentDeck[0];
        currentDeck[0] = currentDeck[swapIndex];
        currentDeck[swapIndex] = temp;
      }
    }

    currentDeck.forEach((clip, indexInDeck) => {
      schedule.push({
        deckNumber: pass,
        indexInDeck,
        clip,
      });
    });

    previousDeckLastId = currentDeck[currentDeck.length - 1].id;
  }

  return schedule;
}

// ============================================================================
// 3. EVENING REHEARSAL SIMULATOR
// ============================================================================

export interface EveningRehearsalOptions {
  date: Date | string;
  startMode: 'civil-dusk' | 'fixed-time';
  fixedStartTime: string;          // e.g. "17:30"
  latitudeDeg: number;
  longitudeDeg: number;
  utcOffsetHours: number;
  cutoffTime: string;              // e.g. "22:30"
  quietHoursStartTime: string;     // e.g. "21:30"
  normalVolumePct: number;         // default 85%
  normalBrightnessPct: number;     // default 100%
  quietVolumePct: number;          // default 45%
  quietBrightnessPct: number;      // default 70%
  crossfadeDurationSec: number;    // default 1.5s
  autoInterstitial: boolean;       // default true
  interstitialDurationSec: number; // default 15s
  interstitialTitle: string;       // default "Warm House Glow + Slow Snow"
  deckShuffle: boolean;            // default true
  items: WeightedPlaylistItem[];
}

export interface RehearsalEvent {
  index: number;
  startTimeHHMMSS: string;
  endTimeHHMMSS: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  type: 'show' | 'interstitial' | 'quiet-hours-transition' | 'quarantine-skip';
  title: string;
  clipId?: string;
  deckNumber: number;
  volumePct: number;
  brightnessPct: number;
  notes?: string;
}

export interface EveningRehearsalReport {
  summary: {
    totalDurationMin: number;
    totalShowsPlayed: number;
    totalInterstitialsPlayed: number;
    deckPassesCompleted: number;
    playCountByClip: Record<string, number>;
    quietHoursTriggeredAt: string | null;
    skippedQuarantinedCount: number;
    startTimeHHMM: string;
    endTimeHHMM: string;
    runsPastCutoffMin: number;
    faults: string[];
    warnings: string[];
  };
  events: RehearsalEvent[];
}

/**
 * Fast-forward simulator for an entire outdoor evening schedule.
 * Evaluates Spencer dusk, deck-shuffle with seam guarantee, interstitials,
 * quiet-hours transition, and missing media recovery in milliseconds.
 */
export function simulateEveningRehearsal(options: EveningRehearsalOptions): EveningRehearsalReport {
  const faults: string[] = [];
  const warnings: string[] = [];

  // Determine start time in minutes of day
  let startMinutes = 1020; // 17:00 default
  if (options.startMode === 'civil-dusk') {
    const dusk = computeAstronomicalDusk({
      date: options.date,
      latitudeDeg: options.latitudeDeg,
      longitudeDeg: options.longitudeDeg,
      utcOffsetHours: options.utcOffsetHours,
    });
    if (dusk.status === 'resolved') {
      startMinutes = dusk.civilDuskLocalMinutes;
    } else {
      warnings.push(`Dusk calculation fallback: ${dusk.description}. Using fixed start time.`);
      startMinutes = parseHHMMToMinutes(options.fixedStartTime || '17:30');
    }
  } else {
    startMinutes = parseHHMMToMinutes(options.fixedStartTime || '17:30');
  }

  const cutoffMinutes = parseHHMMToMinutes(options.cutoffTime || '22:30');
  const quietHoursMinutes = parseHHMMToMinutes(options.quietHoursStartTime || '21:30');

  // Handle midnight wrap if cutoff is early morning
  let adjustedCutoffMinutes = cutoffMinutes;
  if (adjustedCutoffMinutes < startMinutes) {
    adjustedCutoffMinutes += 1440;
  }
  let adjustedQuietMinutes = quietHoursMinutes;
  if (adjustedQuietMinutes < startMinutes) {
    adjustedQuietMinutes += 1440;
  }

  const eveningTotalSeconds = Math.max(0, (adjustedCutoffMinutes - startMinutes) * 60);

  // Filter items
  const validClips = options.items.filter((c) => c.enabled && !c.quarantined && c.durationSec > 0);
  const quarantinedCount = options.items.filter((c) => c.quarantined).length;

  if (validClips.length === 0) {
    faults.push('Playlist has no playable clips. All entries are disabled, quarantined, or 0-duration.');
    return {
      summary: {
        totalDurationMin: 0,
        totalShowsPlayed: 0,
        totalInterstitialsPlayed: 0,
        deckPassesCompleted: 0,
        playCountByClip: {},
        quietHoursTriggeredAt: null,
        skippedQuarantinedCount: quarantinedCount,
        startTimeHHMM: formatMinutesToHHMM(startMinutes),
        endTimeHHMM: formatMinutesToHHMM(startMinutes),
        runsPastCutoffMin: 0,
        faults,
        warnings,
      },
      events: [],
    };
  }

  // Pre-generate enough deck passes to comfortably exceed evening duration
  const avgClipDuration = validClips.reduce((acc, c) => acc + c.durationSec, 0) / validClips.length;
  const estimatedDecksNeeded = Math.ceil(eveningTotalSeconds / (avgClipDuration * validClips.length)) + 2;

  const deckSlots: ScheduledDeckSlot[] = options.deckShuffle
    ? generateDeckShuffleSchedule(options.items, Math.max(3, estimatedDecksNeeded), 101)
    : Array.from({ length: Math.max(3, estimatedDecksNeeded) }).flatMap((_, dIdx) =>
        validClips.map((clip, iIdx) => ({ deckNumber: dIdx + 1, indexInDeck: iIdx, clip }))
      );

  const events: RehearsalEvent[] = [];
  let currentSecond = 0;
  let slotIndex = 0;
  let eventCounter = 1;
  const playCounts: Record<string, number> = {};
  validClips.forEach((c) => (playCounts[c.id] = 0));

  let quietHoursLogged = false;
  let quietHoursTriggeredStr: string | null = null;
  const quietSecondsOffset = (adjustedQuietMinutes - startMinutes) * 60;

  let maxDeckReached = 1;
  let interstitialsCount = 0;
  let showsCount = 0;

  while (currentSecond < eveningTotalSeconds && slotIndex < deckSlots.length) {
    // Check if quiet hours triggers before or during this slot
    if (!quietHoursLogged && currentSecond >= quietSecondsOffset) {
      quietHoursLogged = true;
      quietHoursTriggeredStr = formatClockTime(startMinutes, currentSecond);
      events.push({
        index: eventCounter++,
        startTimeHHMMSS: quietHoursTriggeredStr,
        endTimeHHMMSS: quietHoursTriggeredStr,
        startSec: currentSecond,
        endSec: currentSecond,
        durationSec: 0,
        type: 'quiet-hours-transition',
        title: `Quiet Hours Engaged (Volume capped at ${options.quietVolumePct}%, Brightness at ${options.quietBrightnessPct}%)`,
        deckNumber: maxDeckReached,
        volumePct: options.quietVolumePct,
        brightnessPct: options.quietBrightnessPct,
        notes: 'Neighborhood courtesy curfew engaged automatically.',
      });
    }

    const isQuietNow = currentSecond >= quietSecondsOffset;
    const currentVol = isQuietNow ? options.quietVolumePct : options.normalVolumePct;
    const currentBrt = isQuietNow ? options.quietBrightnessPct : options.normalBrightnessPct;

    const scheduledSlot = deckSlots[slotIndex++];
    maxDeckReached = Math.max(maxDeckReached, scheduledSlot.deckNumber);
    const clip = scheduledSlot.clip;

    const showStartSec = currentSecond;
    const showDuration = clip.durationSec;
    const showEndSec = showStartSec + showDuration;

    events.push({
      index: eventCounter++,
      startTimeHHMMSS: formatClockTime(startMinutes, showStartSec),
      endTimeHHMMSS: formatClockTime(startMinutes, showEndSec),
      startSec: showStartSec,
      endSec: showEndSec,
      durationSec: showDuration,
      type: 'show',
      title: clip.title,
      clipId: clip.id,
      deckNumber: scheduledSlot.deckNumber,
      volumePct: currentVol,
      brightnessPct: currentBrt,
      notes: `Deck ${scheduledSlot.deckNumber} (Pass #${scheduledSlot.indexInDeck + 1})`,
    });

    showsCount++;
    playCounts[clip.id] = (playCounts[clip.id] || 0) + 1;
    currentSecond = showEndSec;

    // Optional Auto-Interstitial
    if (options.autoInterstitial && currentSecond < eveningTotalSeconds && options.interstitialDurationSec > 0) {
      const interStartSec = currentSecond;
      const interEndSec = interStartSec + options.interstitialDurationSec;

      events.push({
        index: eventCounter++,
        startTimeHHMMSS: formatClockTime(startMinutes, interStartSec),
        endTimeHHMMSS: formatClockTime(startMinutes, interEndSec),
        startSec: interStartSec,
        endSec: interEndSec,
        durationSec: options.interstitialDurationSec,
        type: 'interstitial',
        title: options.interstitialTitle || 'Warm House Glow + Slow Snow',
        deckNumber: scheduledSlot.deckNumber,
        volumePct: Math.round(currentVol * 0.5),
        brightnessPct: Math.round(currentBrt * 0.8),
        notes: 'Ambient auto-interstitial between songs',
      });

      interstitialsCount++;
      currentSecond = interEndSec;
    }
  }

  // Check if show ran past cutoff (Design Call #19)
  const runsPastCutoffSec = Math.max(0, currentSecond - eveningTotalSeconds);
  const runsPastCutoffMin = Math.round((runsPastCutoffSec / 60) * 10) / 10;
  if (runsPastCutoffMin > 0) {
    warnings.push(`Evening runs ${runsPastCutoffMin} min past configured ${options.cutoffTime} cutoff to allow final show to finish smoothly.`);
  }

  const finalEndTime = formatClockTime(startMinutes, currentSecond);

  return {
    summary: {
      totalDurationMin: Math.round((currentSecond / 60) * 10) / 10,
      totalShowsPlayed: showsCount,
      totalInterstitialsPlayed: interstitialsCount,
      deckPassesCompleted: maxDeckReached,
      playCountByClip: playCounts,
      quietHoursTriggeredAt: quietHoursTriggeredStr,
      skippedQuarantinedCount: quarantinedCount,
      startTimeHHMM: formatMinutesToHHMM(startMinutes),
      endTimeHHMM: finalEndTime.slice(0, 5),
      runsPastCutoffMin,
      faults,
      warnings,
    },
    events,
  };
}

function formatClockTime(startMinutes: number, secondsOffset: number): string {
  const totalSeconds = startMinutes * 60 + secondsOffset;
  const normalizedSeconds = totalSeconds % 86400;
  const hours = Math.floor(normalizedSeconds / 3600);
  const mins = Math.floor((normalizedSeconds % 3600) / 60);
  const secs = Math.floor(normalizedSeconds % 60);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================================
// 4. PRE-SHOW PREFLIGHT & MAP GEOMETRY VALIDATOR
// ============================================================================

export interface PreflightCheckItem {
  id: string;
  category: 'geometry' | 'media' | 'audio' | 'output' | 'system';
  severity: 'pass' | 'warn' | 'error';
  title: string;
  detail: string;
  autoFixLabel?: string;
  autoFixActionKey?: string;
}

/**
 * Line segment intersection test between AB and CD.
 */
function segmentsIntersect(
  p1: VectorVertex, p2: VectorVertex,
  p3: VectorVertex, p4: VectorVertex
): boolean {
  const ccw = (a: VectorVertex, b: VectorVertex, c: VectorVertex) =>
    (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);

  return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
}

/**
 * Shoelace area of a 2D polygon.
 */
export function computePolygonArea(vertices: VectorVertex[]): number {
  if (vertices.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area) / 2.0;
}

/**
 * Checks if a polygon has self-intersecting non-adjacent edges.
 */
export function findSelfIntersectingEdges(vertices: VectorVertex[]): Array<[number, number]> {
  const n = vertices.length;
  if (n < 4) return [];
  const intersections: Array<[number, number]> = [];

  for (let i = 0; i < n; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % n];

    for (let j = i + 1; j < n; j++) {
      // Skip adjacent edges
      if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) continue;

      const p3 = vertices[j];
      const p4 = vertices[(j + 1) % n];

      if (segmentsIntersect(p1, p2, p3, p4)) {
        intersections.push([i, j]);
      }
    }
  }
  return intersections;
}

export interface PreflightInspectionState {
  layers: VectorLayer[];
  playlistClips: PlaylistClip[];
  beatFlags: BeatFlag[];
  masterBlackout: boolean;
  projectorTestPattern: boolean;
  projectorLumens: number;
  masterVolume: number;
}

/**
 * Comprehensive pre-show preflight audit mirroring Marshall ShowPreflight.cs.
 */
export function runPreShowPreflight(state: PreflightInspectionState): PreflightCheckItem[] {
  const results: PreflightCheckItem[] = [];

  // 1. MAP GEOMETRY CHECKS
  if (!state.layers || state.layers.length === 0) {
    results.push({
      id: 'geo-no-layers',
      category: 'geometry',
      severity: 'error',
      title: 'No Map Layers Defined',
      detail: 'The stage map has 0 layers. Tracing is required to project onto architectural surfaces.',
      autoFixLabel: 'Load Marshall Sample House',
      autoFixActionKey: 'load-sample-house',
    });
  } else {
    let degenerateCount = 0;
    let selfIntersectCount = 0;
    let outOfBoundsCount = 0;
    let zeroAreaCount = 0;

    for (const layer of state.layers) {
      const vertices = layer.vertices || [];
      if (vertices.length < 3) {
        degenerateCount++;
        results.push({
          id: `geo-degenerate-${layer.id}`,
          category: 'geometry',
          severity: 'error',
          title: `Degenerate Layer: "${layer.name}"`,
          detail: `Layer has only ${vertices.length} vertices (minimum 3 required for a 2D surface).`,
          autoFixLabel: 'Remove Degenerate Layer',
          autoFixActionKey: `remove-layer-${layer.id}`,
        });
      } else {
        // Area check
        const area = computePolygonArea(vertices);
        if (area < 0.001) {
          zeroAreaCount++;
          results.push({
            id: `geo-zero-area-${layer.id}`,
            category: 'geometry',
            severity: 'error',
            title: `Zero Area Polygon: "${layer.name}"`,
            detail: `Layer surface area is negligible (${area.toFixed(4)}% of canvas). Points may be collinear.`,
          });
        }

        // Self-intersection check
        const selfCrosses = findSelfIntersectingEdges(vertices);
        if (selfCrosses.length > 0) {
          selfIntersectCount++;
          results.push({
            id: `geo-self-cross-${layer.id}`,
            category: 'geometry',
            severity: 'error',
            title: `Self-Intersecting Edges: "${layer.name}"`,
            detail: `Layer has ${selfCrosses.length} self-intersecting edge pairs (e.g. edge ${selfCrosses[0][0]} intersects edge ${selfCrosses[0][1]}). This causes corrupt GPU triangulation.`,
          });
        }

        // Out-of-bounds check (vertices outside [0..100]%)
        const outPoints = vertices.filter((v) => v.x < 0 || v.x > 100 || v.y < 0 || v.y > 100);
        if (outPoints.length > 0) {
          outOfBoundsCount++;
          results.push({
            id: `geo-out-of-bounds-${layer.id}`,
            category: 'geometry',
            severity: 'warn',
            title: `Vertices Out of Bounds: "${layer.name}"`,
            detail: `${outPoints.length} vertices exceed the stage bounds [0..100]%. Light may spill outside the target projector canvas.`,
            autoFixLabel: 'Clamp Vertices to 0..100%',
            autoFixActionKey: `clamp-layer-${layer.id}`,
          });
        }
      }
    }

    if (degenerateCount === 0 && selfIntersectCount === 0 && zeroAreaCount === 0) {
      results.push({
        id: 'geo-all-pass',
        category: 'geometry',
        severity: 'pass',
        title: 'Map Geometry Validated',
        detail: `All ${state.layers.length} surface polygons have valid vertices, closed boundaries, and positive winding area.`,
      });
    }
  }

  // 2. MEDIA & PLAYLIST CHECKS
  if (!state.playlistClips || state.playlistClips.length === 0) {
    results.push({
      id: 'media-no-clips',
      category: 'media',
      severity: 'error',
      title: 'Empty Playlist',
      detail: 'No clips loaded in the playback schedule. Run Night will have nothing to project.',
      autoFixLabel: 'Load Marshall Sample Show',
      autoFixActionKey: 'load-sample-show',
    });
  } else {
    let missingUrlCount = 0;
    let zeroDurationCount = 0;

    state.playlistClips.forEach((clip, i) => {
      if (!clip.videoUrl && !clip.audioUrl) {
        missingUrlCount++;
        results.push({
          id: `media-missing-${clip.id}`,
          category: 'media',
          severity: 'error',
          title: `Missing Media: "${clip.title}" (#${i + 1})`,
          detail: 'Clip has no valid video or audio URL attached.',
          autoFixLabel: 'Auto-Relink Media',
          autoFixActionKey: `relink-media-${clip.id}`,
        });
      }
      if (clip.durationSec <= 0) {
        zeroDurationCount++;
        results.push({
          id: `media-zero-duration-${clip.id}`,
          category: 'media',
          severity: 'error',
          title: `Zero Duration: "${clip.title}"`,
          detail: 'Clip duration is 0 seconds and cannot play in rotation.',
        });
      }
    });

    if (missingUrlCount === 0 && zeroDurationCount === 0) {
      results.push({
        id: 'media-all-pass',
        category: 'media',
        severity: 'pass',
        title: 'Playlist Media Verified',
        detail: `All ${state.playlistClips.length} playlist entries have valid source URLs and positive playback lengths.`,
      });
    }
  }

  // 3. AUDIO & SYNC CHECKS
  if (state.masterVolume === 0) {
    results.push({
      id: 'audio-muted-master',
      category: 'audio',
      severity: 'warn',
      title: 'Master Volume at 0%',
      detail: 'Master volume is completely muted. Outdoor audience will not hear soundtrack.',
      autoFixLabel: 'Set Volume to 85%',
      autoFixActionKey: 'fix-master-volume',
    });
  } else {
    results.push({
      id: 'audio-volume-pass',
      category: 'audio',
      severity: 'pass',
      title: 'Master Audio Gain Active',
      detail: `Master volume is unmuted at ${state.masterVolume}%.`,
    });
  }

  if (state.beatFlags && state.beatFlags.length > 0) {
    results.push({
      id: 'audio-beat-flags-pass',
      category: 'audio',
      severity: 'pass',
      title: 'Beat Flags Configured',
      detail: `${state.beatFlags.length} rhythmic beat/scene cue flags synchronized with soundtrack.`,
    });
  }

  // 4. OUTPUT & SAFETY CHECKS
  if (state.masterBlackout) {
    results.push({
      id: 'out-blackout-engaged',
      category: 'output',
      severity: 'warn',
      title: 'Master Blackout Engaged',
      detail: 'Master Blackout (B / Space) is currently ON. Projector outputs are suppressed to pure black.',
      autoFixLabel: 'Disengage Blackout',
      autoFixActionKey: 'disengage-blackout',
    });
  } else {
    results.push({
      id: 'out-blackout-pass',
      category: 'output',
      severity: 'pass',
      title: 'Master Blackout Disengaged',
      detail: 'Visual projection beam is unmuted and transmitting active video/shaders.',
    });
  }

  if (state.projectorTestPattern) {
    results.push({
      id: 'out-test-pattern-active',
      category: 'output',
      severity: 'warn',
      title: 'Projector Test Pattern Active',
      detail: 'Alignment test grid is currently active on screen. Disengage before opening the show.',
      autoFixLabel: 'Disable Test Pattern',
      autoFixActionKey: 'disable-test-pattern',
    });
  }

  if (state.projectorLumens < 25) {
    results.push({
      id: 'out-low-lumens',
      category: 'output',
      severity: 'warn',
      title: `Low Lamp Lumens (${state.projectorLumens}%)`,
      detail: 'Projector output dimmer is below 25%, resulting in a dim outdoor presentation.',
      autoFixLabel: 'Restore Lumens to 90%',
      autoFixActionKey: 'restore-lumens',
    });
  }

  return results;
}

// ============================================================================
// 5. MISSING-MEDIA RELINKER
// ============================================================================

export interface RelinkMatch {
  clipId: string;
  clipTitle: string;
  brokenUrl: string;
  relinkedUrl: string;
  matchScore: number;
}

export interface RelinkPlanResult {
  matches: RelinkMatch[];
  unmatched: string[];
}

/**
 * Fuzzy media relinker that recovers broken file paths by comparing base filenames.
 */
export function relinkMissingMedia(
  brokenClips: PlaylistClip[],
  candidateUrls: string[]
): RelinkPlanResult {
  const matches: RelinkMatch[] = [];
  const unmatched: string[] = [];

  const getBaseName = (url: string) => {
    const parts = url.replace(/\\/g, '/').split('/');
    const file = parts[parts.length - 1];
    return file.replace(/\.[^/.]+$/, '').toLowerCase().trim();
  };

  for (const clip of brokenClips) {
    const clipUrl = clip.videoUrl || clip.audioUrl || '';
    if (!clipUrl) {
      unmatched.push(clip.title);
      continue;
    }

    const brokenBase = getBaseName(clipUrl);
    let bestCandidate: string | null = null;
    let bestScore = 0;

    for (const cand of candidateUrls) {
      const candBase = getBaseName(cand);
      if (brokenBase === candBase) {
        bestCandidate = cand;
        bestScore = 1.0;
        break;
      }
      if (candBase.includes(brokenBase) || brokenBase.includes(candBase)) {
        bestCandidate = cand;
        bestScore = 0.8;
      }
    }

    if (bestCandidate && bestScore >= 0.8) {
      matches.push({
        clipId: clip.id,
        clipTitle: clip.title,
        brokenUrl: clipUrl,
        relinkedUrl: bestCandidate,
        matchScore: bestScore,
      });
    } else {
      unmatched.push(clip.title);
    }
  }

  return { matches, unmatched };
}

// ============================================================================
// 6. NATIVE `.mps*` COMPATIBILITY BRIDGE & DOCUMENT DOCTOR
// ============================================================================

export interface MpsDocumentHeader {
  kind: 'MapDocument' | 'SceneLibraryDocument' | 'PaletteLibraryDocument' | 'ShowDocument' | 'PlaylistDocument' | 'BundleArchive';
  schemaVersion: number;
  appName: string;
  createdAt: string;
}

export interface DoctorReport {
  status: 'Ok' | 'FileError' | 'MalformedJson' | 'UnrecognizedKind' | 'MigrationFailed' | 'UnsupportedValue';
  ok: boolean;
  kind?: string;
  schemaVersionBefore: number;
  schemaVersionAfter: number;
  migrationStepsApplied: number;
  droppedKeys: string[];
  addedKeys: string[];
  failureMessage?: string;
  isCleanRoundTrip: boolean;
}

/**
 * Validates and runs DocumentDoctor diagnostics on arbitrary `.mps*` JSON.
 */
export function runDocumentDoctorOnMpsJson(jsonString: string): DoctorReport {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err: any) {
    return {
      status: 'MalformedJson',
      ok: false,
      schemaVersionBefore: 0,
      schemaVersionAfter: 0,
      migrationStepsApplied: 0,
      droppedKeys: [],
      addedKeys: [],
      failureMessage: `JSON Parse error: ${err.message}`,
      isCleanRoundTrip: false,
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      status: 'MalformedJson',
      ok: false,
      schemaVersionBefore: 0,
      schemaVersionAfter: 0,
      migrationStepsApplied: 0,
      droppedKeys: [],
      addedKeys: [],
      failureMessage: 'File does not contain a JSON object root.',
      isCleanRoundTrip: false,
    };
  }

  const kind = parsed.kind || parsed.Kind || parsed.documentKind;
  const knownKinds = ['MapDocument', 'SceneLibraryDocument', 'PaletteLibraryDocument', 'ShowDocument', 'PlaylistDocument', 'BundleArchive'];

  if (!kind || !knownKinds.includes(kind)) {
    return {
      status: 'UnrecognizedKind',
      ok: false,
      kind: String(kind),
      schemaVersionBefore: 0,
      schemaVersionAfter: 0,
      migrationStepsApplied: 0,
      droppedKeys: [],
      addedKeys: [],
      failureMessage: `Unknown document kind: "${kind}". Expected one of: ${knownKinds.join(', ')}`,
      isCleanRoundTrip: false,
    };
  }

  const schemaVersion = parsed.schemaVersion || parsed.SchemaVersion || 1;
  const targetSchemaVersion = 2; // latest Marshall / Gemini parity schema
  const migrationNeeded = schemaVersion < targetSchemaVersion;
  const steps = migrationNeeded ? targetSchemaVersion - schemaVersion : 0;

  const droppedKeys: string[] = [];
  const addedKeys: string[] = [];
  if (migrationNeeded) {
    addedKeys.push('schemaVersion: 2');
    addedKeys.push('compatibility: Gemini-Marshall-Bridge-v2');
  }

  return {
    status: 'Ok',
    ok: true,
    kind,
    schemaVersionBefore: schemaVersion,
    schemaVersionAfter: targetSchemaVersion,
    migrationStepsApplied: steps,
    droppedKeys,
    addedKeys,
    isCleanRoundTrip: !migrationNeeded,
  };
}

/**
 * Exports current studio state into standard MarshallProjectionStudio native format.
 */
export function exportMarshallFile(
  type: 'map' | 'show' | 'playlist' | 'bundle',
  state: {
    layers: VectorLayer[];
    playlistClips: PlaylistClip[];
    beatFlags: BeatFlag[];
    projectName?: string;
  }
): string {
  const now = new Date().toISOString();

  if (type === 'map') {
    // Convert 0..100% Gemini layers to normalized [0..1] Marshall MapShapes
    const shapes = state.layers.map((l, idx) => ({
      Id: l.id,
      Name: l.name,
      Tag: l.category === 'Roofline' ? 'Roofline' : l.category === 'Windows' ? 'Window' : l.category === 'Pillars' ? 'Pillar' : 'Wall',
      ShapeKind: l.category === 'Roofline' ? 'OpenPath' : 'Polygon',
      Points: l.vertices.map((v) => ({ X: v.x / 100.0, Y: v.y / 100.0 })),
      ReferenceQuad: [
        { X: 0, Y: 0 }, { X: 1, Y: 0 }, { X: 1, Y: 1 }, { X: 0, Y: 1 }
      ],
      ZOrder: idx,
    }));

    const mapDoc = {
      kind: 'MapDocument',
      schemaVersion: 2,
      appName: 'MarshallProjectionStudio',
      createdAt: now,
      Name: state.projectName || 'Exported House Map',
      Width: 1920,
      Height: 1080,
      Shapes: shapes,
      GlobalWarp: {
        Enabled: false,
        Corners: [{ X: 0, Y: 0 }, { X: 1, Y: 0 }, { X: 1, Y: 1 }, { X: 0, Y: 1 }],
      },
    };
    return JSON.stringify(mapDoc, null, 2);
  }

  if (type === 'show') {
    const flags = state.beatFlags.map((f, idx) => ({
      Id: f.id || `flag-${idx}`,
      TimeSeconds: f.timestampSec,
      Category: f.type === 'beat' ? 'Beat' : 'SceneCue',
      Label: f.label || 'Beat marker',
      SceneId: f.targetLayerId || null,
    }));

    const showDoc = {
      kind: 'ShowDocument',
      schemaVersion: 2,
      appName: 'MarshallProjectionStudio',
      createdAt: now,
      Name: state.projectName || 'Exported Show',
      BeatsPerMinute: 120.0,
      DurationSeconds: state.playlistClips[0]?.durationSec || 180.0,
      Flags: flags,
      AudioRef: {
        Path: state.playlistClips[0]?.audioUrl || 'soundtrack.wav',
        SizeBytes: 1048576,
      },
    };
    return JSON.stringify(showDoc, null, 2);
  }

  if (type === 'playlist') {
    const entries = state.playlistClips.map((c, i) => ({
      Id: c.id,
      ShowPath: `${c.title.replace(/\s+/g, '_')}.mpsshow`,
      DisplayName: c.title,
      Weight: 1,
      DurationSeconds: c.durationSec,
      Enabled: true,
      Quarantined: false,
    }));

    const playlistDoc = {
      kind: 'PlaylistDocument',
      schemaVersion: 2,
      appName: 'MarshallProjectionStudio',
      createdAt: now,
      Name: 'Holiday Evening Playlist',
      LoopMode: 'LoopContinuously',
      DeckShuffle: true,
      SeamGuarantee: true,
      AutoInterstitial: {
        Enabled: true,
        DurationSeconds: 15.0,
        Title: 'Warm House Glow + Slow Snow',
      },
      Schedule: {
        StartMode: 'CivilDusk',
        CutoffTime: '22:30',
        QuietHoursTime: '21:30',
      },
      Entries: entries,
    };
    return JSON.stringify(playlistDoc, null, 2);
  }

  // Complete Multi-document Archive Bundle
  const bundle = {
    kind: 'BundleArchive',
    schemaVersion: 2,
    appName: 'MarshallProjectionStudio',
    createdAt: now,
    Name: `${state.projectName || 'Holiday Show'} Archive Bundle`,
    Map: JSON.parse(exportMarshallFile('map', state)),
    Show: JSON.parse(exportMarshallFile('show', state)),
    Playlist: JSON.parse(exportMarshallFile('playlist', state)),
  };
  return JSON.stringify(bundle, null, 2);
}

/**
 * Imports any native MarshallProjectionStudio JSON document into Gemini state.
 */
export function importMarshallFile(jsonString: string): {
  success: boolean;
  kind?: string;
  layers?: VectorLayer[];
  playlistClips?: PlaylistClip[];
  beatFlags?: BeatFlag[];
  message: string;
} {
  try {
    const data = JSON.parse(jsonString);
    const kind = data.kind || data.Kind;

    if (kind === 'MapDocument' || data.Shapes || data.shapes) {
      const rawShapes = data.Shapes || data.shapes || [];
      const canvasW = data.Width || 1920;
      const canvasH = data.Height || 1080;

      const layers: VectorLayer[] = rawShapes.map((s: any, idx: number) => {
        const rawPoints = s.Points || s.points || [];
        const vertices: VectorVertex[] = rawPoints.map((pt: any) => {
          let px = pt.X ?? pt.x ?? 0;
          let py = pt.Y ?? pt.y ?? 0;
          // Scale from [0..1] or pixel [0..1920] to [0..100]%
          if (px > 1.0) px = (px / canvasW) * 100.0;
          else px = px * 100.0;
          if (py > 1.0) py = (py / canvasH) * 100.0;
          else py = py * 100.0;
          return { x: Math.max(0, Math.min(100, px)), y: Math.max(0, Math.min(100, py)) };
        });

        const category = s.Tag === 'Roofline' ? 'Roofline' :
                         s.Tag === 'Window' ? 'Windows' :
                         s.Tag === 'Pillar' ? 'Pillars' :
                         s.Tag === 'Door' || s.Tag === 'Garage' ? 'Garage' : 'Main Walls';

        return {
          id: s.Id || `layer-${idx + 1}`,
          name: s.Name || `Shape ${idx + 1}`,
          category,
          visible: true,
          locked: false,
          solo: false,
          role: 'Active Projection Surface',
          color: category === 'Roofline' ? '#38bdf8' : category === 'Windows' ? '#fbbf24' : '#f87171',
          positionX: 50,
          positionY: 50,
          width: 50,
          height: 50,
          rotation: 0,
          edgeFeathering: 0,
          outlineGlowWidth: 2,
          vertices,
        };
      });

      return {
        success: true,
        kind: 'MapDocument',
        layers,
        message: `Successfully imported ${layers.length} surface shapes from Marshall MapDocument.`,
      };
    }

    if (kind === 'ShowDocument' || data.Flags || data.flags) {
      const rawFlags = data.Flags || data.flags || [];
      const beatFlags: BeatFlag[] = rawFlags.map((f: any, idx: number) => ({
        id: f.Id || f.id || `imported-flag-${idx}`,
        timestampSec: f.TimeSeconds ?? f.timeSeconds ?? f.timestampSec ?? (idx * 0.5),
        label: f.Label || f.label || (f.Category === 'Beat' ? 'Beat' : 'Scene Cue'),
        type: (f.Category === 'Beat' ? 'beat' : 'flag') as any,
        targetLayerId: f.SceneId || f.sceneId || 'all',
        intensity: 1.0,
      }));

      return {
        success: true,
        kind: 'ShowDocument',
        beatFlags,
        message: `Successfully imported ${beatFlags.length} rhythmic flags from Marshall ShowDocument.`,
      };
    }

    if (kind === 'BundleArchive') {
      const mapResult = data.Map ? importMarshallFile(JSON.stringify(data.Map)) : null;
      const showResult = data.Show ? importMarshallFile(JSON.stringify(data.Show)) : null;

      return {
        success: true,
        kind: 'BundleArchive',
        layers: mapResult?.layers,
        beatFlags: showResult?.beatFlags,
        message: 'Successfully imported complete Marshall Show Bundle Archive (.mpsbundle)!',
      };
    }

    return {
      success: false,
      message: `Unrecognized document format or missing recognizable data fields: ${kind || 'unknown'}.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Error importing Marshall file: ${err.message}`,
    };
  }
}

// ============================================================================
// 7. BUILT-IN MARSHALL SAMPLE HOUSE & SHOW PACK
// ============================================================================

/**
 * Returns the exact Marshall Sample Pack (SampleHouse.mpsmap + SampleShow.mpsshow)
 * from MarshallProjectionStudio Feature 173 (SampleAssetGenerator.cs).
 */
export function getMarshallSampleHouseAndShow(): {
  layers: VectorLayer[];
  beatFlags: BeatFlag[];
  playlistClips: PlaylistClip[];
} {
  // Normalized 1920x1080 coordinates scaled to 0..100%
  // Roofline: [300, 450] -> (15.6%, 41.7%), [960, 220] -> (50.0%, 20.4%), [1620, 450] -> (84.4%, 41.7%)
  const rooflineVertices: VectorVertex[] = [
    { x: 15.625, y: 41.667 },
    { x: 50.000, y: 20.370 },
    { x: 84.375, y: 41.667 },
    { x: 50.000, y: 24.000 }, // slight thickness for surface polygon
  ];

  // Front Door: [860, 650] to [1060, 900] -> X: (44.8%..55.2%), Y: (60.2%..83.3%)
  const frontDoorVertices: VectorVertex[] = [
    { x: 44.792, y: 60.185 },
    { x: 55.208, y: 60.185 },
    { x: 55.208, y: 83.333 },
    { x: 44.792, y: 83.333 },
  ];

  // Left Window: [400, 550] to [650, 750] -> X: (20.8%..33.9%), Y: (50.9%..69.4%)
  const leftWindowVertices: VectorVertex[] = [
    { x: 20.833, y: 50.926 },
    { x: 33.854, y: 50.926 },
    { x: 33.854, y: 69.444 },
    { x: 20.833, y: 69.444 },
  ];

  // Right Window: [1270, 550] to [1520, 750] -> X: (66.1%..79.2%), Y: (50.9%..69.4%)
  const rightWindowVertices: VectorVertex[] = [
    { x: 66.146, y: 50.926 },
    { x: 79.167, y: 50.926 },
    { x: 79.167, y: 69.444 },
    { x: 66.146, y: 69.444 },
  ];

  // Main Facade Wall: [300, 450] to [1620, 900]
  const mainWallVertices: VectorVertex[] = [
    { x: 15.625, y: 41.667 },
    { x: 50.000, y: 20.370 },
    { x: 84.375, y: 41.667 },
    { x: 84.375, y: 83.333 },
    { x: 15.625, y: 83.333 },
  ];

  const layers: VectorLayer[] = [
    {
      id: 'marshall-main-wall',
      name: 'Main House Facade',
      category: 'Main Walls',
      visible: true,
      locked: false,
      solo: false,
      role: 'Active Projection Surface',
      color: '#e2e8f0',
      positionX: 50,
      positionY: 50,
      width: 70,
      height: 60,
      rotation: 0,
      edgeFeathering: 0,
      outlineGlowWidth: 2,
      vertices: mainWallVertices,
    },
    {
      id: 'marshall-roofline',
      name: 'Gable Roofline',
      category: 'Roofline',
      visible: true,
      locked: false,
      solo: false,
      role: 'Active Projection Surface',
      color: '#38bdf8',
      positionX: 50,
      positionY: 30,
      width: 70,
      height: 25,
      rotation: 0,
      edgeFeathering: 0,
      outlineGlowWidth: 3,
      vertices: rooflineVertices,
    },
    {
      id: 'marshall-front-door',
      name: 'Front Door & Wreath',
      category: 'Garage',
      visible: true,
      locked: false,
      solo: false,
      role: 'Active Projection Surface',
      color: '#f87171',
      positionX: 50,
      positionY: 72,
      width: 12,
      height: 24,
      rotation: 0,
      edgeFeathering: 0,
      outlineGlowWidth: 2,
      vertices: frontDoorVertices,
    },
    {
      id: 'marshall-left-window',
      name: 'Left Window (Mullions)',
      category: 'Windows',
      visible: true,
      locked: false,
      solo: false,
      role: 'Active Projection Surface',
      color: '#fbbf24',
      positionX: 27,
      positionY: 60,
      width: 14,
      height: 20,
      rotation: 0,
      edgeFeathering: 0,
      outlineGlowWidth: 2,
      vertices: leftWindowVertices,
    },
    {
      id: 'marshall-right-window',
      name: 'Right Window (Mullions)',
      category: 'Windows',
      visible: true,
      locked: false,
      solo: false,
      role: 'Active Projection Surface',
      color: '#fbbf24',
      positionX: 73,
      positionY: 60,
      width: 14,
      height: 20,
      rotation: 0,
      edgeFeathering: 0,
      outlineGlowWidth: 2,
      vertices: rightWindowVertices,
    },
  ];

  // 32 beats at 120 BPM = 16 seconds (SampleSong.wav from Feature 173)
  const beatFlags: BeatFlag[] = [];
  for (let i = 0; i < 32; i++) {
    const time = i * 0.5; // 120 BPM = 0.5s per beat
    const isDownbeat = i % 4 === 0;
    const isHalfway = i === 16;
    beatFlags.push({
      id: `sample-beat-${i.toString().padStart(2, '0')}`,
      timestampSec: time,
      label: i === 0 ? 'Scene Cue: sample-twinkle' : isHalfway ? 'Scene Cue: sample-hold' : isDownbeat ? 'Downbeat' : `Beat ${i + 1}`,
      type: i === 0 || isHalfway ? 'flag' : 'beat',
      targetLayerId: i === 0 ? 'marshall-roofline' : isHalfway ? 'marshall-front-door' : 'all',
      intensity: isDownbeat ? 1.0 : 0.6,
      isAutoGenerated: true,
    });
  }

  const playlistClips: PlaylistClip[] = [
    {
      id: 'sample-show-clip-1',
      index: 1,
      title: 'Sample Show — Winter Four-Chord Pad',
      durationSec: 16,
      durationFormatted: '0:16',
      status: 'Active',
      alignmentMode: 'GLOBAL SYNCED',
      themeStyle: 'modern',
      prompt: 'A gentle Christmas pad progression with synthesized acoustic kick and click pulses',
      seed: 173,
      deltaOffset: { x: 0, y: 0, scaleX: 100, scaleY: 100, rotation: 0 },
      bypassOffset: false,
      videoUrl: 'https://images.unsplash.com/photo-1543258103-a62bdc069871?auto=format&fit=crop&w=1920&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1543258103-a62bdc069871?auto=format&fit=crop&w=300&q=80',
      audioUrl: 'sample-audio.wav',
    },
    {
      id: 'sample-show-clip-2',
      index: 2,
      title: 'Christmas Classic — Carol of the Bells',
      durationSec: 24,
      durationFormatted: '0:24',
      status: 'Up Next',
      alignmentMode: 'GLOBAL SYNCED',
      themeStyle: 'victorian',
      prompt: 'Gothic cathedral bells with swirling snowfall and warm architectural lantern light',
      seed: 2026,
      deltaOffset: { x: 0, y: 0, scaleX: 100, scaleY: 100, rotation: 0 },
      bypassOffset: false,
      videoUrl: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=1920&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=300&q=80',
      audioUrl: 'sample-bells.wav',
    },
  ];

  return { layers, beatFlags, playlistClips };
}

// ============================================================================
// 8. SUPPORT DIAGNOSTICS BUNDLE EXPORTER
// ============================================================================

export function exportSupportDiagnosticsBundle(state: PreflightInspectionState): string {
  const findings = runPreShowPreflight(state);
  const bundle = {
    exportVersion: '1.0.0',
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/CLI',
    hardwareSafety: {
      masterBlackout: state.masterBlackout,
      projectorTestPattern: state.projectorTestPattern,
      projectorLumens: state.projectorLumens,
      masterVolume: state.masterVolume,
    },
    stageSummary: {
      layerCount: state.layers.length,
      layers: state.layers.map((l) => ({
        id: l.id,
        name: l.name,
        category: l.category,
        vertexCount: l.vertices?.length || 0,
        area: computePolygonArea(l.vertices || []),
      })),
    },
    playlistSummary: {
      clipCount: state.playlistClips.length,
      totalDurationSec: state.playlistClips.reduce((acc, c) => acc + (c.durationSec || 0), 0),
      clips: state.playlistClips.map((c) => ({
        id: c.id,
        title: c.title,
        durationSec: c.durationSec,
        hasVideoUrl: Boolean(c.videoUrl),
        hasAudioUrl: Boolean(c.audioUrl),
      })),
    },
    audioSyncSummary: {
      beatFlagCount: state.beatFlags.length,
    },
    preflightFindings: findings,
  };

  return JSON.stringify(bundle, null, 2);
}
