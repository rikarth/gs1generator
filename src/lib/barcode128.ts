// Standards-compliant Code 128 / GS1-128 SVG Encoder (Start C + FNC1 + Code C/B switching + Mod 103 Checksum)
// Pattern widths for symbols 0..106 (each 6 bars/spaces, except Stop 106 which is 7)
const CODE128_PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

const FNC1 = 102;
const CODE_B_IN_C = 100;
const CODE_C_IN_B = 99;
const START_B = 104;
const START_C = 105;
const STOP = 106;

export interface EncodedBarcode128 {
  bars: Array<{ x: number; width: number }>;
  totalModules: number;
  symbolValues: number[];
  checkSymbol: number;
  weightedSum: number;
}

/**
 * Encodes a GS1-128 machine string (using \u001D as FNC1 separator between variable-length AIs).
 * Automatically prepends Start C + FNC1 (or Start B + FNC1) and computes Modulo 103 check symbol.
 */
export function encodeGs1128Barcode(machineString: string): EncodedBarcode128 {
  const tokens: Array<{ type: 'fnc1' } | { type: 'char'; ch: string }> = [{ type: 'fnc1' }];
  for (const ch of machineString) {
    if (ch === '\u001D') {
      tokens.push({ type: 'fnc1' });
    } else if (ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) <= 126) {
      tokens.push({ type: 'char', ch });
    }
  }

  // Decide start mode: Code C if first 2+ tokens after FNC1 are digits
  const startsWithTwoDigits =
    tokens.length >= 3 &&
    tokens[1].type === 'char' &&
    /\d/.test(tokens[1].ch) &&
    tokens[2].type === 'char' &&
    /\d/.test(tokens[2].ch);

  let mode: 'B' | 'C' = startsWithTwoDigits ? 'C' : 'B';
  const symbolValues: number[] = [mode === 'C' ? START_C : START_B];

  let idx = 0;
  while (idx < tokens.length) {
    const tok = tokens[idx];
    if (tok.type === 'fnc1') {
      symbolValues.push(FNC1);
      idx++;
      continue;
    }

    if (mode === 'C') {
      const next = tokens[idx + 1];
      if (next && next.type === 'char' && /\d/.test(tok.ch) && /\d/.test(next.ch)) {
        symbolValues.push(parseInt(tok.ch + next.ch, 10));
        idx += 2;
        continue;
      }
      // Switch to Code B
      symbolValues.push(CODE_B_IN_C);
      mode = 'B';
      // Fall through to process current char in Code B
    }

    // Mode B: check if at least 4 consecutive digits ahead to switch to Code C
    let consecutiveDigits = 0;
    for (let k = idx; k < tokens.length; k++) {
      const tk = tokens[k];
      if (tk.type === 'char' && /\d/.test(tk.ch)) {
        consecutiveDigits++;
      } else {
        break;
      }
    }
    if (consecutiveDigits >= 4) {
      symbolValues.push(CODE_C_IN_B);
      mode = 'C';
      continue;
    }

    const ascii = tok.ch.charCodeAt(0);
    symbolValues.push(Math.max(0, Math.min(95, ascii - 32)));
    idx++;
  }

  // Compute Code 128 Modulo 103 check symbol
  let weightedSum = symbolValues[0];
  for (let i = 1; i < symbolValues.length; i++) {
    weightedSum += i * symbolValues[i];
  }
  const checkSymbol = weightedSum % 103;
  symbolValues.push(checkSymbol);
  symbolValues.push(STOP);

  // Convert symbols to SVG bar rects (quiet zone = 10 modules on each side)
  const quietZone = 10;
  let cursor = quietZone;
  const bars: Array<{ x: number; width: number }> = [];

  for (const sym of symbolValues) {
    const pattern = CODE128_PATTERNS[sym] ?? CODE128_PATTERNS[0];
    for (let i = 0; i < pattern.length; i++) {
      const w = parseInt(pattern[i], 10);
      if (i % 2 === 0) {
        bars.push({ x: cursor, width: w });
      }
      cursor += w;
    }
  }

  const totalModules = cursor + quietZone;

  return {
    bars,
    totalModules,
    symbolValues,
    checkSymbol,
    weightedSum,
  };
}
