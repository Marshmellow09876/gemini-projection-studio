/**
 * xLights (.fseq v2 / .xsq) and Falcon Player (FPP) Binary Sequence Bridge
 * Implements binary FSEQ v2 parsing, frame generation, and xLights XML sequence export.
 */

export interface FseqV2Header {
  magic: string;
  majorVersion: number;
  minorVersion: number;
  headerLength: number;
  channelDataOffset: number;
  channelCount: number;
  frameCount: number;
  stepTimeMs: number;
  fps: number;
  compressionType: number; // 0 = uncompressed, 1 = zstd
  uniqueId: bigint;
}

export interface FseqExportOptions {
  sequenceName: string;
  stepTimeMs?: number; // Default 50ms (20 FPS)
  channelCount: number;
  frames: Uint8Array[]; // Each frame is channelCount bytes (R, G, B triplets per node)
}

export interface XLightsModelMapping {
  name: string;
  type: 'Single Line' | 'Arch' | 'Poly Line' | 'Matrix' | 'DMX Moving Head';
  startChannel: number;
  nodeCount: number;
  rgbOrder?: 'RGB' | 'GRB' | 'BRG';
}

/**
 * Creates a valid 32-byte FSEQ v2 header buffer
 */
export function createFseqV2Header(
  channelCount: number,
  frameCount: number,
  stepTimeMs: number = 50
): Uint8Array {
  const header = new Uint8Array(32);
  const view = new DataView(header.buffer);

  // Magic: 'P', 'S', 'E', 'Q' or 'F', 'S', 'E', 'Q'
  header[0] = 0x46; // 'F'
  header[1] = 0x53; // 'S'
  header[2] = 0x45; // 'E'
  header[3] = 0x51; // 'Q'

  // Channel data start offset: 32 bytes (after standard uncompressed header)
  view.setUint16(4, 32, true);

  // Version: 2.2
  header[6] = 2; // minor
  header[7] = 2; // major

  // Header length
  view.setUint16(8, 32, true);

  // Channel count (uint32 LE)
  view.setUint32(10, channelCount, true);

  // Frame count (uint32 LE)
  view.setUint32(14, frameCount, true);

  // Step time in ms (uint8)
  header[18] = Math.min(255, Math.max(10, stepTimeMs));

  // Flags: 0 = uncompressed raw frames
  header[19] = 0;

  // Number of compression blocks: 0
  view.setUint16(20, 0, true);

  // Reserved / Spare
  view.setUint16(22, 0, true);

  // Unique sequence ID (random 64-bit value)
  const idLow = Math.floor(Math.random() * 0xffffffff);
  const idHigh = Math.floor(Math.random() * 0xffffffff);
  view.setUint32(24, idLow, true);
  view.setUint32(28, idHigh, true);

  return header;
}

/**
 * Encodes full uncompressed FSEQ v2 binary file from channel frames
 */
export function generateFseqV2Binary(options: FseqExportOptions): Uint8Array {
  const stepTime = options.stepTimeMs || 50;
  const frameCount = options.frames.length;
  const channelCount = options.channelCount;

  const header = createFseqV2Header(channelCount, frameCount, stepTime);
  const totalLength = 32 + frameCount * channelCount;
  const fseqFile = new Uint8Array(totalLength);

  // Copy header
  fseqFile.set(header, 0);

  // Copy frames sequentially
  let offset = 32;
  for (let i = 0; i < frameCount; i++) {
    const frame = options.frames[i];
    if (frame.length >= channelCount) {
      fseqFile.set(frame.subarray(0, channelCount), offset);
    } else {
      fseqFile.set(frame, offset);
    }
    offset += channelCount;
  }

  return fseqFile;
}

/**
 * Parses header metadata from an imported .fseq ArrayBuffer
 */
export function parseFseqHeader(buffer: ArrayBuffer): FseqV2Header {
  if (buffer.byteLength < 32) {
    throw new Error('File buffer is too small to be a valid FSEQ sequence.');
  }

  const view = new DataView(buffer);
  const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));

  if (magic !== 'FSEQ' && magic !== 'PSEQ') {
    throw new Error(`Invalid FSEQ magic header: "${magic}"`);
  }

  const channelDataOffset = view.getUint16(4, true);
  const minorVersion = view.getUint8(6);
  const majorVersion = view.getUint8(7);
  const headerLength = view.getUint16(8, true);
  const channelCount = view.getUint32(10, true);
  const frameCount = view.getUint32(14, true);
  const stepTimeMs = view.getUint8(18) || 50;
  const compressionType = view.getUint8(19);

  const idLow = BigInt(view.getUint32(24, true));
  const idHigh = BigInt(view.getUint32(28, true));
  const uniqueId = (idHigh << 32n) | idLow;

  const fps = Math.round(1000 / stepTimeMs);

  return {
    magic,
    majorVersion,
    minorVersion,
    headerLength,
    channelDataOffset,
    channelCount,
    frameCount,
    stepTimeMs,
    fps,
    compressionType,
    uniqueId,
  };
}

/**
 * Generates an xLights .xsq XML sequence project file with model layout and timing tracks
 */
export function generateXLightsXsqXml(
  sequenceName: string,
  models: XLightsModelMapping[],
  durationSeconds: number,
  stepTimeMs: number = 50
): string {
  const frameMs = stepTimeMs;
  const totalFrames = Math.round((durationSeconds * 1000) / frameMs);

  const modelXml = models
    .map(
      (m) =>
        `      <model name="${m.name}" type="${m.type}" startChannel="${m.startChannel}" channelsPerNode="3" nodeCount="${m.nodeCount}" rgbOrder="${m.rgbOrder || 'RGB'}" />`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<xsequence BaseChannel="0" ChanCtrlBasic="0" SaveVersion="2026.15">
  <head>
    <version>2026.15</version>
    <author>Lumen-Map AI Projection Studio v3.5</author>
    <author-email>support@lumenmap.ai</author-email>
    <author-website>https://lumenmap.ai</author-website>
    <song>${sequenceName}</song>
    <artist>Austin Architectural Production</artist>
    <album>Lumen-Map Holiday Series</album>
    <MusicURL></MusicURL>
    <comment>Exported from Lumen-Map AI Pro Studio - Unified Pixel &amp; Projection Engine</comment>
    <sequenceTiming>${frameMs} ms</sequenceTiming>
    <sequenceType>Animation</sequenceType>
    <mediaFile></mediaFile>
    <sequenceDuration>${durationSeconds.toFixed(3)}</sequenceDuration>
    <imageDir></imageDir>
  </head>
  <models>
${modelXml}
  </models>
  <ElementEffects>
    <Element type="timing" name="Lumen-Map Beat Grid">
      <EffectLayer/>
    </Element>
${models
  .map(
    (m) => `    <Element type="model" name="${m.name}">
      <EffectLayer>
        <Effect ref="0" name="Color Wash" startTime="0" endTime="${(durationSeconds * 1000).toFixed(0)}" palette="0"/>
      </EffectLayer>
    </Element>`
  )
  .join('\n')}
  </ElementEffects>
  <Palettes>
    <ColorPalette id="0">
      <Color>#00FFFF</Color>
      <Color>#FF0055</Color>
      <Color>#FFB700</Color>
    </ColorPalette>
  </Palettes>
</xsequence>`;
}

/**
 * Convenience helper to trigger a browser file download of FSEQ binary data
 */
export function downloadFseqFile(fseqBytes: Uint8Array, filename: string): void {
  const blob = new Blob([fseqBytes], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.fseq') ? filename : `${filename}.fseq`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Convenience helper to trigger a browser file download of xLights .xsq XML
 */
export function downloadXsqFile(xmlContent: string, filename: string): void {
  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xsq') ? filename : `${filename}.xsq`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
