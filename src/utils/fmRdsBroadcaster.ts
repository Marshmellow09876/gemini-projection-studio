/**
 * FM Radio Transmitter & Dynamic RDS Broadcaster Engine
 * Controls Si4713, EDM-LCD, and Falcon Player (FPP) RDS plugins.
 * Formats 8-character Program Service (PS) and 64-character Radio Text (RT).
 */

export interface RdsBroadcastState {
  frequencyMhz: number;
  stationCallSign: string; // Up to 8 chars, e.g. "LUMEN-FM"
  currentShowTitle: string;
  nowPlayingSong: string;
  spectatorInstructions: string;
  isTransmitting: boolean;
  powerLevelDbuV: number; // 88 - 115 dBuV (FCC Part 15 legal limit)
}

export interface FormattedRdsPacket {
  psText: string; // Exactly 8 chars (padded)
  rtText: string; // Up to 64 chars
  serialAtCommandPs: string;
  serialAtCommandRt: string;
  fppPluginPayload: {
    command: string;
    args: [string, string];
  };
}

/**
 * Standard holiday broadcast templates
 */
export const FM_SHOW_PRESETS = [
  {
    label: 'Ghostbusters Halloween Spectacular',
    ps: 'GHOST897',
    rt: 'TUNE 89.7 FM * GHOSTBUSTERS FIREHOUSE HQ * PLEASE DIM HEADLIGHTS',
  },
  {
    label: 'Christmas Polar Express Wonderland',
    ps: 'SANTA897',
    rt: 'TUNE 89.7 FM * NORTH POLE TOY WORKSHOP * ENJOY THE HOLIDAY LIGHTS',
  },
  {
    label: 'Singing Pumpkins & Gourd Patch',
    ps: 'PUMPKIN',
    rt: 'TUNE 89.7 FM * SPOOKY TUNES & TALKING GOURDS * HAPPY HALLOWEEN',
  },
  {
    label: 'Cyberpunk Neon Matrix Show',
    ps: 'LUMEN-AI',
    rt: 'TUNE 89.7 FM * HIGH-ENERGY SYNTHWAVE & LASER STROBES * WELCOME',
  },
];

/**
 * Formats an 8-character Program Service (PS) string, guaranteeing safe padding
 */
export function formatProgramService(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9\-_ ]/g, '').trim();
  return clean.slice(0, 8).padEnd(8, ' ');
}

/**
 * Formats a 64-character Radio Text (RT) string according to RDS specs
 */
export function formatRadioText(raw: string): string {
  const clean = raw.replace(/[\r\n\t]/g, ' ').trim();
  return clean.slice(0, 64);
}

/**
 * Generates ready-to-dispatch RDS payloads for Serial AT modules and FPP Webhooks
 */
export function generateRdsBroadcastPacket(
  stationCallSign: string,
  nowPlaying: string,
  instruction: string = 'PLEASE DIM HEADLIGHTS'
): FormattedRdsPacket {
  const psText = formatProgramService(stationCallSign || 'LUMEN-FM');
  const rtText = formatRadioText(`${nowPlaying} * ${instruction}`);

  const serialAtCommandPs = `AT+RDSPS=${psText.trim()}`;
  const serialAtCommandRt = `AT+RDSTEXT=${rtText}`;

  const fppPluginPayload = {
    command: 'FPP-Plugin-RDS-Update',
    args: [psText.trim(), rtText] as [string, string],
  };

  return {
    psText,
    rtText,
    serialAtCommandPs,
    serialAtCommandRt,
    fppPluginPayload,
  };
}

/**
 * Simulates dispatching to FM transmitter hardware via Web Serial or REST endpoint
 */
export async function dispatchRdsBroadcast(
  endpointUrl: string,
  packet: FormattedRdsPacket
): Promise<{ success: boolean; message: string }> {
  try {
    if (!endpointUrl || endpointUrl.startsWith('mock://') || endpointUrl.startsWith('http://127.0.0.1')) {
      return {
        success: true,
        message: `[Simulated] Dispatched RDS PS: "${packet.psText}" | RT: "${packet.rtText}"`,
      };
    }

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(packet),
    });

    return {
      success: response.ok,
      message: response.ok ? 'RDS successfully transmitted.' : `HTTP ${response.status}`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Network error connecting to FM Transmitter',
    };
  }
}
