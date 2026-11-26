export type Gs1KeyType = 'GTIN-8' | 'GTIN-12' | 'GTIN-13' | 'GTIN-14' | 'GLN' | 'SSCC';

export interface CheckDigitStep {
  indexFromLeft: number;
  positionFromRight: number;
  digit: number;
  weight: 1 | 3;
  product: number;
  runningSum: number;
}

export interface CheckDigitResult {
  payload: string;
  checkDigit: number;
  fullCode: string;
  sum: number;
  modulo: number;
  steps: CheckDigitStep[];
}

export interface EpcFieldSegment {
  name: string;
  bits: number;
  valueLabel: string;
  binary: string;
  hex: string;
  colorClass: string;
}

export interface EpcEncodingResult {
  scheme: 'sgtin-96' | 'sgtin-198' | 'sscc-96' | 'sgln-96' | 'sgln-195';
  headerHex: string;
  filter: number;
  partition: number;
  pureIdentityUri: string;
  tagUri: string;
  rawUri: string;
  hex: string;
  binary: string;
  totalBits: number;
  segments: EpcFieldSegment[];
  epcisJsonLd: string;
  warnings: string[];
}

export interface Gs1AiField {
  ai: string;
  label: string;
  value: string;
  fixedLength: boolean;
  maxLength: number;
  needsFnc1After: boolean;
}

export interface Gs1128Result {
  hri: string; // Human-readable e.g. (01)04012345678901(10)LOT42
  machineString: string; // With \u001D (GS) after variable-length non-terminal fields
  fnc1DisplayString: string; // With <FNC1> tokens visible
  fields: Gs1AiField[];
}

export interface DigitalLinkResult {
  url: string;
  domain: string;
  primaryKeyPath: string;
  qualifierPaths: string[];
  queryAttributes: string[];
  resolverHint: string;
}

// Official GS1 EPC TDS Partition Table
// P -> { gcpDigits, gcpBits, sgtinItemBits, ssccSerialBits, sglnLocBits }
export const EPC_PARTITION_TABLE: Record<
  number,
  {
    gcpDigits: number;
    gcpBits: number;
    sgtinItemDigits: number;
    sgtinItemBits: number;
    ssccSerialDigits: number;
    ssccSerialBits: number;
    sglnLocDigits: number;
    sglnLocBits: number;
  }
> = {
  0: { gcpDigits: 12, gcpBits: 40, sgtinItemDigits: 1, sgtinItemBits: 4, ssccSerialDigits: 5, ssccSerialBits: 18, sglnLocDigits: 0, sglnLocBits: 1 },
  1: { gcpDigits: 11, gcpBits: 37, sgtinItemDigits: 2, sgtinItemBits: 7, ssccSerialDigits: 6, ssccSerialBits: 21, sglnLocDigits: 1, sglnLocBits: 4 },
  2: { gcpDigits: 10, gcpBits: 34, sgtinItemDigits: 3, sgtinItemBits: 10, ssccSerialDigits: 7, ssccSerialBits: 24, sglnLocDigits: 2, sglnLocBits: 7 },
  3: { gcpDigits: 9, gcpBits: 30, sgtinItemDigits: 4, sgtinItemBits: 14, ssccSerialDigits: 8, ssccSerialBits: 28, sglnLocDigits: 3, sglnLocBits: 11 },
  4: { gcpDigits: 8, gcpBits: 27, sgtinItemDigits: 5, sgtinItemBits: 17, ssccSerialDigits: 9, ssccSerialBits: 31, sglnLocDigits: 4, sglnLocBits: 14 },
  5: { gcpDigits: 7, gcpBits: 24, sgtinItemDigits: 6, sgtinItemBits: 20, ssccSerialDigits: 10, ssccSerialBits: 34, sglnLocDigits: 5, sglnLocBits: 17 },
  6: { gcpDigits: 6, gcpBits: 20, sgtinItemDigits: 7, sgtinItemBits: 24, ssccSerialDigits: 11, ssccSerialBits: 38, sglnLocDigits: 6, sglnLocBits: 21 },
};

export const EPC_FILTER_DESCRIPTIONS: Record<'sgtin' | 'sscc' | 'sgln', Array<{ value: number; label: string }>> = {
  sgtin: [
    { value: 0, label: '0 · All Others' },
    { value: 1, label: '1 · Point of Sale (POS) Trade Item' },
    { value: 2, label: '2 · Full Case for Transport' },
    { value: 3, label: '3 · Reserved' },
    { value: 4, label: '4 · Inner Pack Trade Item' },
    { value: 6, label: '6 · Unit Load' },
  ],
  sscc: [
    { value: 0, label: '0 · All Others' },
    { value: 1, label: '1 · Reserved' },
    { value: 2, label: '2 · Case / Carton' },
    { value: 6, label: '6 · Unit Load / Pallet' },
  ],
  sgln: [
    { value: 0, label: '0 · All Others' },
    { value: 1, label: '1 · Physical Location' },
  ],
};

export function digitsOnly(input: string): string {
  return input.replace(/\D/g, '');
}

export function padLeft(str: string, length: number, char = '0'): string {
  if (str.length >= length) return str.slice(-length);
  return char.repeat(length - str.length) + str;
}

/**
 * Computes the official GS1 Modulo-10 Check Digit.
 * Starting from the rightmost payload digit (nearest the check digit),
 * weights alternate 3, 1, 3, 1, ...
 */
export function calculateGs1CheckDigit(payloadDigits: string): CheckDigitResult {
  const clean = digitsOnly(payloadDigits);
  const steps: CheckDigitStep[] = [];
  let sum = 0;

  // Build steps left-to-right for readability while computing weights from the right
  for (let i = 0; i < clean.length; i++) {
    const posFromRight = clean.length - i; // 1 = rightmost payload digit
    const weight: 1 | 3 = posFromRight % 2 === 1 ? 3 : 1;
    const digit = Number(clean[i]);
    const product = digit * weight;
    sum += product;
    steps.push({
      indexFromLeft: i + 1,
      positionFromRight: posFromRight,
      digit,
      weight,
      product,
      runningSum: sum,
    });
  }

  const modulo = sum % 10;
  const checkDigit = (10 - modulo) % 10;

  return {
    payload: clean,
    checkDigit,
    fullCode: `${clean}${checkDigit}`,
    sum,
    modulo,
    steps,
  };
}

export function verifyGs1CheckDigit(fullCodeDigits: string): {
  valid: boolean;
  expectedCheckDigit: number;
  actualCheckDigit: number;
  breakdown: CheckDigitResult;
} {
  const clean = digitsOnly(fullCodeDigits);
  if (clean.length < 2) {
    const empty = calculateGs1CheckDigit('0');
    return { valid: false, expectedCheckDigit: 0, actualCheckDigit: 0, breakdown: empty };
  }
  const payload = clean.slice(0, -1);
  const actualCheckDigit = Number(clean.slice(-1));
  const breakdown = calculateGs1CheckDigit(payload);
  return {
    valid: breakdown.checkDigit === actualCheckDigit,
    expectedCheckDigit: breakdown.checkDigit,
    actualCheckDigit,
    breakdown,
  };
}

export function buildGtin(params: {
  variant: 'GTIN-8' | 'GTIN-12' | 'GTIN-13' | 'GTIN-14';
  gcp: string;
  itemRef: string;
  indicator?: string;
}): CheckDigitResult & { gtin14: string; gcpPadded: string; itemRefPadded: string } {
  const gcpClean = digitsOnly(params.gcp);
  const itemClean = digitsOnly(params.itemRef);
  const ind = digitsOnly(params.indicator ?? '0').slice(0, 1) || '0';

  if (params.variant === 'GTIN-8') {
    // GTIN-8 uses a 7-digit payload (GS1-8 Prefix + Item Ref) + 1 check digit
    const gcpPart = gcpClean.slice(0, 4).padEnd(3, '0');
    const rem = 7 - gcpPart.length;
    const itemPart = padLeft(itemClean, rem);
    const res = calculateGs1CheckDigit(gcpPart + itemPart);
    return {
      ...res,
      gtin14: res.fullCode.padStart(14, '0'),
      gcpPadded: gcpPart,
      itemRefPadded: itemPart,
    };
  }

  const totalDataDigits = params.variant === 'GTIN-12' ? 11 : params.variant === 'GTIN-13' ? 12 : 12;
  const gcpLen = Math.min(Math.max(gcpClean.length || 7, 6), totalDataDigits - 1);
  const gcpPadded = padLeft(gcpClean, gcpLen).slice(0, gcpLen);
  const itemLen = totalDataDigits - gcpLen;
  const itemRefPadded = padLeft(itemClean, itemLen);

  const payload = params.variant === 'GTIN-14' ? `${ind}${gcpPadded}${itemRefPadded}` : `${gcpPadded}${itemRefPadded}`;
  const res = calculateGs1CheckDigit(payload);
  const gtin14 = params.variant === 'GTIN-14' ? res.fullCode : res.fullCode.padStart(14, '0');

  return {
    ...res,
    gtin14,
    gcpPadded,
    itemRefPadded,
  };
}

export function buildGln(params: { gcp: string; locationRef: string }): CheckDigitResult & {
  gcpPadded: string;
  locationRefPadded: string;
} {
  const gcpClean = digitsOnly(params.gcp);
  const locClean = digitsOnly(params.locationRef);
  const gcpLen = Math.min(Math.max(gcpClean.length || 7, 6), 12);
  const gcpPadded = padLeft(gcpClean, gcpLen).slice(0, gcpLen);
  const locLen = 12 - gcpLen;
  const locationRefPadded = padLeft(locClean, locLen);
  const res = calculateGs1CheckDigit(`${gcpPadded}${locationRefPadded}`);
  return {
    ...res,
    gcpPadded,
    locationRefPadded,
  };
}

export function buildSscc(params: {
  extensionDigit: string;
  gcp: string;
  serialRef: string;
}): CheckDigitResult & {
  extensionDigit: string;
  gcpPadded: string;
  serialRefPadded: string;
} {
  const ext = digitsOnly(params.extensionDigit).slice(0, 1) || '0';
  const gcpClean = digitsOnly(params.gcp);
  const serClean = digitsOnly(params.serialRef);
  const gcpLen = Math.min(Math.max(gcpClean.length || 7, 6), 12);
  const gcpPadded = padLeft(gcpClean, gcpLen).slice(0, gcpLen);
  const serLen = 16 - gcpLen;
  const serialRefPadded = padLeft(serClean, serLen);
  const res = calculateGs1CheckDigit(`${ext}${gcpPadded}${serialRefPadded}`);
  return {
    ...res,
    extensionDigit: ext,
    gcpPadded,
    serialRefPadded,
  };
}

function toBigIntBin(val: bigint, bits: number): string {
  const mask = (1n << BigInt(bits)) - 1n;
  return (val & mask).toString(2).padStart(bits, '0');
}

function binaryToHex(bin: string): string {
  let hex = '';
  for (let i = 0; i < bin.length; i += 4) {
    hex += parseInt(bin.slice(i, i + 4), 2).toString(16).toUpperCase();
  }
  return hex;
}

function encodeString7Bit(str: string, totalBits: number): string {
  let bits = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) & 0x7f;
    bits += code.toString(2).padStart(7, '0');
  }
  if (bits.length > totalBits) {
    return bits.slice(0, totalBits);
  }
  return bits.padEnd(totalBits, '0');
}

export function encodeSgtinEpc(params: {
  gtin14: string;
  gcpLength: number;
  serial: string;
  filter: number;
  timestampIso?: string;
}): EpcEncodingResult {
  const gtin = padLeft(digitsOnly(params.gtin14), 14);
  const gcpLen = Math.min(Math.max(params.gcpLength, 6), 12);
  const partition = 12 - gcpLen;
  const partSpec = EPC_PARTITION_TABLE[partition];
  const indicator = gtin[0];
  const gcp = gtin.slice(1, 1 + gcpLen);
  const itemRef = gtin.slice(1 + gcpLen, 13);
  const indPlusItemRef = `${indicator}${itemRef}`; // 13 - gcpLen digits = partSpec.sgtinItemDigits

  const serialClean = params.serial.trim() || '1';
  const isPureNumeric = /^\d+$/.test(serialClean);
  const numericVal = isPureNumeric ? BigInt(serialClean) : -1n;
  const max38Bit = (1n << 38n) - 1n;
  const canUse96 = isPureNumeric && numericVal >= 0n && numericVal <= max38Bit && !(serialClean.length > 1 && serialClean.startsWith('0'));

  const filterVal = Math.min(Math.max(params.filter, 0), 7);
  const warnings: string[] = [];

  if (canUse96) {
    const headerBin = '00110000'; // 0x30
    const filterBin = toBigIntBin(BigInt(filterVal), 3);
    const partBin = toBigIntBin(BigInt(partition), 3);
    const gcpBin = toBigIntBin(BigInt(gcp), partSpec.gcpBits);
    const itemBin = toBigIntBin(BigInt(indPlusItemRef), partSpec.sgtinItemBits);
    const serBin = toBigIntBin(numericVal, 38);

    const binary = `${headerBin}${filterBin}${partBin}${gcpBin}${itemBin}${serBin}`;
    const hex = binaryToHex(binary);

    const pureIdentityUri = `urn:epc:id:sgtin:${gcp}.${indPlusItemRef}.${serialClean}`;
    const tagUri = `urn:epc:tag:sgtin-96:${filterVal}.${gcp}.${indPlusItemRef}.${serialClean}`;
    const rawUri = `urn:epc:raw:96.x${hex}`;

    const segments: EpcFieldSegment[] = [
      { name: 'Header (0x30)', bits: 8, valueLabel: '0x30 (SGTIN-96)', binary: headerBin, hex: '30', colorClass: 'bg-slate-800 text-white' },
      { name: 'Filter', bits: 3, valueLabel: String(filterVal), binary: filterBin, hex: parseInt(filterBin, 2).toString(16).toUpperCase(), colorClass: 'bg-blue-700 text-white' },
      { name: 'Partition', bits: 3, valueLabel: `P=${partition} (GCP ${gcpLen}d)`, binary: partBin, hex: parseInt(partBin, 2).toString(16).toUpperCase(), colorClass: 'bg-indigo-700 text-white' },
      { name: 'Company Prefix', bits: partSpec.gcpBits, valueLabel: gcp, binary: gcpBin, hex: binaryToHex(gcpBin.padStart(Math.ceil(gcpBin.length / 4) * 4, '0')), colorClass: 'bg-emerald-700 text-white' },
      { name: 'Ind + Item Ref', bits: partSpec.sgtinItemBits, valueLabel: indPlusItemRef, binary: itemBin, hex: binaryToHex(itemBin.padStart(Math.ceil(itemBin.length / 4) * 4, '0')), colorClass: 'bg-amber-700 text-white' },
      { name: 'Serial (38-bit)', bits: 38, valueLabel: serialClean, binary: serBin, hex: binaryToHex(serBin.padStart(40, '0')), colorClass: 'bg-cyan-700 text-white' },
    ];

    const epcisJsonLd = JSON.stringify(
      {
        '@context': ['https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld'],
        type: 'EPCISDocument',
        schemaVersion: '2.0',
        creationDate: params.timestampIso ?? new Date().toISOString(),
        epcisBody: {
          eventList: [
            {
              type: 'ObjectEvent',
              eventTime: params.timestampIso ?? new Date().toISOString(),
              eventTimeZoneOffset: '+00:00',
              epcList: [`https://id.gs1.org/01/${gtin}/21/${encodeURIComponent(serialClean)}`],
              action: 'ADD',
              bizStep: 'commissioning',
              disposition: 'active',
              'gs1:epcUrn': pureIdentityUri,
              'gs1:epcHex': hex,
            },
          ],
        },
      },
      null,
      2,
    );

    return {
      scheme: 'sgtin-96',
      headerHex: '30',
      filter: filterVal,
      partition,
      pureIdentityUri,
      tagUri,
      rawUri,
      hex,
      binary,
      totalBits: 96,
      segments,
      epcisJsonLd,
      warnings,
    };
  }

  // Fallback to SGTIN-198 for alphanumeric or leading-zero serials
  if (!isPureNumeric) {
    warnings.push('Alphanumeric serial detected: encoded using SGTIN-198 (7-bit ASCII, 140-bit serial field).');
  } else if (serialClean.startsWith('0') && serialClean.length > 1) {
    warnings.push('Leading zero in serial preserved by promoting to SGTIN-198 per EPC TDS.');
  } else {
    warnings.push('Serial exceeds 38-bit integer limit (274,877,906,943): promoted to SGTIN-198.');
  }

  const headerBin = '00110110'; // 0x36 (SGTIN-198)
  const filterBin = toBigIntBin(BigInt(filterVal), 3);
  const partBin = toBigIntBin(BigInt(partition), 3);
  const gcpBin = toBigIntBin(BigInt(gcp), partSpec.gcpBits);
  const itemBin = toBigIntBin(BigInt(indPlusItemRef), partSpec.sgtinItemBits);
  const serBin = encodeString7Bit(serialClean.slice(0, 20), 140);
  const binary = `${headerBin}${filterBin}${partBin}${gcpBin}${itemBin}${serBin}`; // 198 bits -> pad 2 bits to 200 for hex bytes
  const hex = binaryToHex(binary.padEnd(200, '0'));

  const pureIdentityUri = `urn:epc:id:sgtin:${gcp}.${indPlusItemRef}.${encodeURIComponent(serialClean)}`;
  const tagUri = `urn:epc:tag:sgtin-198:${filterVal}.${gcp}.${indPlusItemRef}.${encodeURIComponent(serialClean)}`;
  const rawUri = `urn:epc:raw:198.x${hex}`;

  const segments: EpcFieldSegment[] = [
    { name: 'Header (0x36)', bits: 8, valueLabel: '0x36 (SGTIN-198)', binary: headerBin, hex: '36', colorClass: 'bg-slate-800 text-white' },
    { name: 'Filter', bits: 3, valueLabel: String(filterVal), binary: filterBin, hex: parseInt(filterBin, 2).toString(16).toUpperCase(), colorClass: 'bg-blue-700 text-white' },
    { name: 'Partition', bits: 3, valueLabel: `P=${partition}`, binary: partBin, hex: parseInt(partBin, 2).toString(16).toUpperCase(), colorClass: 'bg-indigo-700 text-white' },
    { name: 'Company Prefix', bits: partSpec.gcpBits, valueLabel: gcp, binary: gcpBin, hex: '-', colorClass: 'bg-emerald-700 text-white' },
    { name: 'Ind + Item Ref', bits: partSpec.sgtinItemBits, valueLabel: indPlusItemRef, binary: itemBin, hex: '-', colorClass: 'bg-amber-700 text-white' },
    { name: 'Serial (140-bit ASCII)', bits: 140, valueLabel: serialClean.slice(0, 20), binary: serBin.slice(0, 28) + '…', hex: '-', colorClass: 'bg-cyan-700 text-white' },
  ];

  const epcisJsonLd = JSON.stringify(
    {
      '@context': ['https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld'],
      type: 'EPCISDocument',
      schemaVersion: '2.0',
      creationDate: params.timestampIso ?? new Date().toISOString(),
      epcisBody: {
        eventList: [
          {
            type: 'ObjectEvent',
            eventTime: params.timestampIso ?? new Date().toISOString(),
            eventTimeZoneOffset: '+00:00',
            epcList: [`https://id.gs1.org/01/${gtin}/21/${encodeURIComponent(serialClean)}`],
            action: 'ADD',
            bizStep: 'commissioning',
            disposition: 'active',
            'gs1:epcUrn': pureIdentityUri,
            'gs1:epcHex': hex,
          },
        ],
      },
    },
    null,
    2,
  );

  return {
    scheme: 'sgtin-198',
    headerHex: '36',
    filter: filterVal,
    partition,
    pureIdentityUri,
    tagUri,
    rawUri,
    hex,
    binary,
    totalBits: 198,
    segments,
    epcisJsonLd,
    warnings,
  };
}

export function encodeSsccEpc(params: {
  sscc18: string;
  gcpLength: number;
  filter: number;
  timestampIso?: string;
}): EpcEncodingResult {
  const sscc = padLeft(digitsOnly(params.sscc18), 18);
  const gcpLen = Math.min(Math.max(params.gcpLength, 6), 12);
  const partition = 12 - gcpLen;
  const partSpec = EPC_PARTITION_TABLE[partition];
  const ext = sscc[0];
  const gcp = sscc.slice(1, 1 + gcpLen);
  const serialRef = sscc.slice(1 + gcpLen, 17);
  const extPlusSerial = `${ext}${serialRef}`; // 17 - gcpLen digits = partSpec.ssccSerialDigits

  const filterVal = Math.min(Math.max(params.filter, 0), 7);
  const headerBin = '00110001'; // 0x31
  const filterBin = toBigIntBin(BigInt(filterVal), 3);
  const partBin = toBigIntBin(BigInt(partition), 3);
  const gcpBin = toBigIntBin(BigInt(gcp), partSpec.gcpBits);
  const serBin = toBigIntBin(BigInt(extPlusSerial), partSpec.ssccSerialBits);
  const reservedBin = '0'.repeat(24);

  const binary = `${headerBin}${filterBin}${partBin}${gcpBin}${serBin}${reservedBin}`;
  const hex = binaryToHex(binary);

  const pureIdentityUri = `urn:epc:id:sscc:${gcp}.${extPlusSerial}`;
  const tagUri = `urn:epc:tag:sscc-96:${filterVal}.${gcp}.${extPlusSerial}`;
  const rawUri = `urn:epc:raw:96.x${hex}`;

  const segments: EpcFieldSegment[] = [
    { name: 'Header (0x31)', bits: 8, valueLabel: '0x31 (SSCC-96)', binary: headerBin, hex: '31', colorClass: 'bg-slate-800 text-white' },
    { name: 'Filter', bits: 3, valueLabel: String(filterVal), binary: filterBin, hex: parseInt(filterBin, 2).toString(16).toUpperCase(), colorClass: 'bg-blue-700 text-white' },
    { name: 'Partition', bits: 3, valueLabel: `P=${partition} (GCP ${gcpLen}d)`, binary: partBin, hex: parseInt(partBin, 2).toString(16).toUpperCase(), colorClass: 'bg-indigo-700 text-white' },
    { name: 'Company Prefix', bits: partSpec.gcpBits, valueLabel: gcp, binary: gcpBin, hex: '-', colorClass: 'bg-emerald-700 text-white' },
    { name: 'Ext + Serial Ref', bits: partSpec.ssccSerialBits, valueLabel: extPlusSerial, binary: serBin, hex: '-', colorClass: 'bg-amber-700 text-white' },
    { name: 'Unallocated', bits: 24, valueLabel: '0 (Reserved)', binary: reservedBin, hex: '000000', colorClass: 'bg-slate-400 text-white' },
  ];

  const epcisJsonLd = JSON.stringify(
    {
      '@context': ['https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld'],
      type: 'EPCISDocument',
      schemaVersion: '2.0',
      creationDate: params.timestampIso ?? new Date().toISOString(),
      epcisBody: {
        eventList: [
          {
            type: 'AggregationEvent',
            eventTime: params.timestampIso ?? new Date().toISOString(),
            eventTimeZoneOffset: '+00:00',
            parentID: `https://id.gs1.org/00/${sscc}`,
            action: 'ADD',
            bizStep: 'packing',
            disposition: 'in_progress',
            'gs1:epcUrn': pureIdentityUri,
            'gs1:epcHex': hex,
          },
        ],
      },
    },
    null,
    2,
  );

  return {
    scheme: 'sscc-96',
    headerHex: '31',
    filter: filterVal,
    partition,
    pureIdentityUri,
    tagUri,
    rawUri,
    hex,
    binary,
    totalBits: 96,
    segments,
    epcisJsonLd,
    warnings: [],
  };
}

export function encodeSglnEpc(params: {
  gln13: string;
  gcpLength: number;
  extension: string;
  filter: number;
  timestampIso?: string;
}): EpcEncodingResult {
  const gln = padLeft(digitsOnly(params.gln13), 13);
  const gcpLen = Math.min(Math.max(params.gcpLength, 6), 12);
  const partition = 12 - gcpLen;
  const partSpec = EPC_PARTITION_TABLE[partition];
  const gcp = gln.slice(0, gcpLen);
  const locRef = gln.slice(gcpLen, 12);

  const extClean = params.extension.trim() || '0';
  const isPureNumeric = /^\d+$/.test(extClean);
  const max41Bit = (1n << 41n) - 1n;
  const extNum = isPureNumeric ? BigInt(extClean) : -1n;
  const canUse96 = isPureNumeric && extNum >= 0n && extNum <= max41Bit && !(extClean.length > 1 && extClean.startsWith('0'));

  const filterVal = Math.min(Math.max(params.filter, 0), 7);
  const warnings: string[] = [];

  if (canUse96) {
    const headerBin = '00110010'; // 0x32
    const filterBin = toBigIntBin(BigInt(filterVal), 3);
    const partBin = toBigIntBin(BigInt(partition), 3);
    const gcpBin = toBigIntBin(BigInt(gcp), partSpec.gcpBits);
    const locBin = toBigIntBin(BigInt(locRef || '0'), partSpec.sglnLocBits);
    const extBin = toBigIntBin(extNum, 41);

    const binary = `${headerBin}${filterBin}${partBin}${gcpBin}${locBin}${extBin}`;
    const hex = binaryToHex(binary);

    const pureIdentityUri = `urn:epc:id:sgln:${gcp}.${locRef}.${extClean}`;
    const tagUri = `urn:epc:tag:sgln-96:${filterVal}.${gcp}.${locRef}.${extClean}`;
    const rawUri = `urn:epc:raw:96.x${hex}`;

    const segments: EpcFieldSegment[] = [
      { name: 'Header (0x32)', bits: 8, valueLabel: '0x32 (SGLN-96)', binary: headerBin, hex: '32', colorClass: 'bg-slate-800 text-white' },
      { name: 'Filter', bits: 3, valueLabel: String(filterVal), binary: filterBin, hex: parseInt(filterBin, 2).toString(16).toUpperCase(), colorClass: 'bg-blue-700 text-white' },
      { name: 'Partition', bits: 3, valueLabel: `P=${partition} (GCP ${gcpLen}d)`, binary: partBin, hex: parseInt(partBin, 2).toString(16).toUpperCase(), colorClass: 'bg-indigo-700 text-white' },
      { name: 'Company Prefix', bits: partSpec.gcpBits, valueLabel: gcp, binary: gcpBin, hex: '-', colorClass: 'bg-emerald-700 text-white' },
      { name: 'Location Ref', bits: partSpec.sglnLocBits, valueLabel: locRef || '(none)', binary: locBin, hex: '-', colorClass: 'bg-amber-700 text-white' },
      { name: 'Extension (41-bit)', bits: 41, valueLabel: extClean, binary: extBin, hex: '-', colorClass: 'bg-cyan-700 text-white' },
    ];

    const epcisJsonLd = JSON.stringify(
      {
        '@context': ['https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld'],
        type: 'EPCISDocument',
        schemaVersion: '2.0',
        creationDate: params.timestampIso ?? new Date().toISOString(),
        epcisBody: {
          eventList: [
            {
              type: 'ObjectEvent',
              eventTime: params.timestampIso ?? new Date().toISOString(),
              eventTimeZoneOffset: '+00:00',
              readPoint: { id: pureIdentityUri },
              bizLocation: { id: `https://id.gs1.org/414/${gln}${extClean !== '0' ? `/254/${encodeURIComponent(extClean)}` : ''}` },
              action: 'OBSERVE',
              bizStep: 'receiving',
              'gs1:epcHex': hex,
            },
          ],
        },
      },
      null,
      2,
    );

    return {
      scheme: 'sgln-96',
      headerHex: '32',
      filter: filterVal,
      partition,
      pureIdentityUri,
      tagUri,
      rawUri,
      hex,
      binary,
      totalBits: 96,
      segments,
      epcisJsonLd,
      warnings,
    };
  }

  warnings.push('Alphanumeric GLN extension detected: promoted to SGLN-195 (7-bit ASCII extension).');
  const headerBin = '00111001'; // 0x39
  const filterBin = toBigIntBin(BigInt(filterVal), 3);
  const partBin = toBigIntBin(BigInt(partition), 3);
  const gcpBin = toBigIntBin(BigInt(gcp), partSpec.gcpBits);
  const locBin = toBigIntBin(BigInt(locRef || '0'), partSpec.sglnLocBits);
  const extBin = encodeString7Bit(extClean.slice(0, 20), 140);
  const binary = `${headerBin}${filterBin}${partBin}${gcpBin}${locBin}${extBin}`;
  const hex = binaryToHex(binary.padEnd(200, '0'));

  const pureIdentityUri = `urn:epc:id:sgln:${gcp}.${locRef}.${encodeURIComponent(extClean)}`;
  const tagUri = `urn:epc:tag:sgln-195:${filterVal}.${gcp}.${locRef}.${encodeURIComponent(extClean)}`;
  const rawUri = `urn:epc:raw:195.x${hex}`;

  const segments: EpcFieldSegment[] = [
    { name: 'Header (0x39)', bits: 8, valueLabel: '0x39 (SGLN-195)', binary: headerBin, hex: '39', colorClass: 'bg-slate-800 text-white' },
    { name: 'Filter', bits: 3, valueLabel: String(filterVal), binary: filterBin, hex: parseInt(filterBin, 2).toString(16).toUpperCase(), colorClass: 'bg-blue-700 text-white' },
    { name: 'Partition', bits: 3, valueLabel: `P=${partition}`, binary: partBin, hex: parseInt(partBin, 2).toString(16).toUpperCase(), colorClass: 'bg-indigo-700 text-white' },
    { name: 'Company Prefix', bits: partSpec.gcpBits, valueLabel: gcp, binary: gcpBin, hex: '-', colorClass: 'bg-emerald-700 text-white' },
    { name: 'Location Ref', bits: partSpec.sglnLocBits, valueLabel: locRef || '(none)', binary: locBin, hex: '-', colorClass: 'bg-amber-700 text-white' },
    { name: 'Extension (140-bit ASCII)', bits: 140, valueLabel: extClean.slice(0, 20), binary: extBin.slice(0, 28) + '…', hex: '-', colorClass: 'bg-cyan-700 text-white' },
  ];

  const epcisJsonLd = JSON.stringify(
    {
      '@context': ['https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld'],
      type: 'EPCISDocument',
      schemaVersion: '2.0',
      creationDate: params.timestampIso ?? new Date().toISOString(),
      epcisBody: {
        eventList: [
          {
            type: 'ObjectEvent',
            eventTime: params.timestampIso ?? new Date().toISOString(),
            readPoint: { id: pureIdentityUri },
            action: 'OBSERVE',
            'gs1:epcHex': hex,
          },
        ],
      },
    },
    null,
    2,
  );

  return {
    scheme: 'sgln-195',
    headerHex: '39',
    filter: filterVal,
    partition,
    pureIdentityUri,
    tagUri,
    rawUri,
    hex,
    binary,
    totalBits: 195,
    segments,
    epcisJsonLd,
    warnings,
  };
}

export function buildGs1128(fieldsInput: Array<{ ai: string; label: string; value: string; fixedLength: boolean; maxLength: number }>): Gs1128Result {
  const nonEmpty = fieldsInput.filter((f) => f.value.trim().length > 0);
  const fields: Gs1AiField[] = nonEmpty.map((f, idx) => {
    const isLast = idx === nonEmpty.length - 1;
    return {
      ...f,
      value: f.value.trim(),
      needsFnc1After: !f.fixedLength && !isLast,
    };
  });

  const hri = fields.map((f) => `(${f.ai})${f.value}`).join('');
  const machineString = fields.map((f) => `${f.ai}${f.value}${f.needsFnc1After ? '\u001D' : ''}`).join('');
  const fnc1DisplayString = `<FNC1>${fields.map((f) => `${f.ai}${f.value}${f.needsFnc1After ? '<FNC1>' : ''}`).join('')}`;

  return { hri, machineString, fnc1DisplayString, fields };
}

export function buildDigitalLink(params: {
  domain: string;
  primaryAi: '01' | '00' | '414';
  primaryValue: string;
  lot?: string;
  serial?: string;
  glnExtension?: string;
  expDate?: string;
  prodDate?: string;
  bestBeforeDate?: string;
  count?: string;
}): DigitalLinkResult {
  const cleanDomain = (params.domain || 'https://id.gs1.org').replace(/\/+$/, '');
  const primaryKeyPath = `/${params.primaryAi}/${encodeURIComponent(params.primaryValue)}`;

  const qualifierPaths: string[] = [];
  if (params.primaryAi === '01') {
    if (params.lot?.trim()) qualifierPaths.push(`/10/${encodeURIComponent(params.lot.trim())}`);
    if (params.serial?.trim()) qualifierPaths.push(`/21/${encodeURIComponent(params.serial.trim())}`);
  } else if (params.primaryAi === '414') {
    if (params.glnExtension?.trim()) qualifierPaths.push(`/254/${encodeURIComponent(params.glnExtension.trim())}`);
  }

  const queryPairs: Array<[string, string]> = [];
  if (params.prodDate?.trim()) queryPairs.push(['11', params.prodDate.trim()]);
  if (params.bestBeforeDate?.trim()) queryPairs.push(['15', params.bestBeforeDate.trim()]);
  if (params.expDate?.trim()) queryPairs.push(['17', params.expDate.trim()]);
  if (params.count?.trim()) queryPairs.push(['37', params.count.trim()]);

  const queryAttributes = queryPairs.map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
  const queryString = queryAttributes.length > 0 ? `?${queryAttributes.join('&')}` : '';

  const url = `${cleanDomain}${primaryKeyPath}${qualifierPaths.join('')}${queryString}`;

  return {
    url,
    domain: cleanDomain,
    primaryKeyPath,
    qualifierPaths,
    queryAttributes,
    resolverHint: `${cleanDomain}${primaryKeyPath}?linkType=gs1:pip`,
  };
}

export interface ParsedGs1Input {
  detectedFormat: 'GTIN-8' | 'GTIN-12' | 'GTIN-13' | 'GTIN-14' | 'GLN' | 'SSCC' | 'GS1-128' | 'GS1 Digital Link' | 'EPC Hex' | 'EPC URI' | 'Unknown';
  validChecksum: boolean | null;
  summary: string;
  details: Array<{ label: string; value: string }>;
  checkDigitCheck?: {
    code: string;
    expected: number;
    actual: number;
    breakdown: CheckDigitResult;
  };
  error?: string;
}

export function parseAndValidateGs1(rawInput: string): ParsedGs1Input {
  const input = rawInput.trim();
  if (!input) {
    return { detectedFormat: 'Unknown', validChecksum: null, summary: 'Enter any GS1 identifier, barcode string, Digital Link URL, or 24-char EPC Hex.', details: [] };
  }

  // 1. GS1 Digital Link URL
  if (/^https?:\/\//i.test(input)) {
    try {
      const url = new URL(input);
      const parts = url.pathname.split('/').filter(Boolean);
      const pairs: Array<{ ai: string; val: string }> = [];
      for (let i = 0; i < parts.length - 1; i += 2) {
        pairs.push({ ai: parts[i], val: decodeURIComponent(parts[i + 1]) });
      }
      url.searchParams.forEach((val, key) => {
        if (/^\d{2,4}$/.test(key)) pairs.push({ ai: key, val });
      });

      const primary = pairs.find((p) => p.ai === '01' || p.ai === '00' || p.ai === '414');
      let checkDigitCheck: ParsedGs1Input['checkDigitCheck'] | undefined;
      let validChecksum: boolean | null = null;
      if (primary && /^\d+$/.test(primary.val)) {
        const v = verifyGs1CheckDigit(primary.val);
        validChecksum = v.valid;
        checkDigitCheck = { code: primary.val, expected: v.expectedCheckDigit, actual: v.actualCheckDigit, breakdown: v.breakdown };
      }

      return {
        detectedFormat: 'GS1 Digital Link',
        validChecksum,
        summary: primary ? `Parsed GS1 Digital Link (${pairs.length} AI element${pairs.length === 1 ? '' : 's'}).` : 'Parsed URL, no primary GS1 key AI (00/01/414) found in path.',
        details: [
          { label: 'Resolver Host', value: url.origin },
          ...pairs.map((p) => ({ label: `AI (${p.ai})`, value: p.val })),
        ],
        checkDigitCheck,
      };
    } catch {
      return { detectedFormat: 'Unknown', validChecksum: false, summary: 'Malformed URL syntax.', details: [], error: 'Unable to parse URL.' };
    }
  }

  // 2. EPC URN
  if (/^urn:epc:/i.test(input)) {
    const segments = input.split(':');
    return {
      detectedFormat: 'EPC URI',
      validChecksum: true,
      summary: `EPC URN (${segments[2] ?? 'epc'} · ${segments[3] ?? 'scheme'})`,
      details: [
        { label: 'Namespace', value: segments.slice(0, 3).join(':') },
        { label: 'Scheme', value: segments[3] ?? '-' },
        { label: 'Identity Payload', value: segments.slice(4).join(':') || '-' },
      ],
    };
  }

  // 3. 24-char EPC-96 Hexadecimal
  if (/^[0-9a-fA-F]{24}$/.test(input)) {
    const hex = input.toUpperCase();
    const bin = BigInt('0x' + hex).toString(2).padStart(96, '0');
    const headerHex = hex.slice(0, 2);
    const filter = parseInt(bin.slice(8, 11), 2);
    const partition = parseInt(bin.slice(11, 14), 2);
    const partSpec = EPC_PARTITION_TABLE[partition];

    if (!partSpec) {
      return {
        detectedFormat: 'EPC Hex',
        validChecksum: false,
        summary: `Invalid partition value (${partition}) in 96-bit EPC header.`,
        details: [{ label: 'Header', value: `0x${headerHex}` }, { label: 'Partition', value: String(partition) }],
      };
    }

    const gcpNum = BigInt('0b' + bin.slice(14, 14 + partSpec.gcpBits)).toString().padStart(partSpec.gcpDigits, '0');

    if (headerHex === '30') {
      const itemNum = BigInt('0b' + bin.slice(14 + partSpec.gcpBits, 14 + partSpec.gcpBits + partSpec.sgtinItemBits))
        .toString()
        .padStart(partSpec.sgtinItemDigits, '0');
      const serialNum = BigInt('0b' + bin.slice(58, 96)).toString();
      const indicator = itemNum[0];
      const itemRef = itemNum.slice(1);
      const gtin14Res = calculateGs1CheckDigit(`${indicator}${gcpNum}${itemRef}`);

      return {
        detectedFormat: 'EPC Hex',
        validChecksum: true,
        summary: 'Decoded SGTIN-96 24-character EPC Hex.',
        details: [
          { label: 'EPC Scheme', value: 'SGTIN-96 (Header 0x30)' },
          { label: 'Filter / Partition', value: `Filter ${filter} · Partition ${partition} (GCP ${partSpec.gcpDigits} digits)` },
          { label: 'GS1 Company Prefix', value: gcpNum },
          { label: 'Derived GTIN-14', value: gtin14Res.fullCode },
          { label: 'Serial Number', value: serialNum },
          { label: 'Pure Identity URN', value: `urn:epc:id:sgtin:${gcpNum}.${itemNum}.${serialNum}` },
        ],
        checkDigitCheck: {
          code: gtin14Res.fullCode,
          expected: gtin14Res.checkDigit,
          actual: gtin14Res.checkDigit,
          breakdown: gtin14Res,
        },
      };
    }

    if (headerHex === '31') {
      const serRefNum = BigInt('0b' + bin.slice(14 + partSpec.gcpBits, 14 + partSpec.gcpBits + partSpec.ssccSerialBits))
        .toString()
        .padStart(partSpec.ssccSerialDigits, '0');
      const ssccRes = calculateGs1CheckDigit(`${serRefNum[0]}${gcpNum}${serRefNum.slice(1)}`);
      return {
        detectedFormat: 'EPC Hex',
        validChecksum: true,
        summary: 'Decoded SSCC-96 24-character EPC Hex.',
        details: [
          { label: 'EPC Scheme', value: 'SSCC-96 (Header 0x31)' },
          { label: 'Filter / Partition', value: `Filter ${filter} · Partition ${partition}` },
          { label: 'GS1 Company Prefix', value: gcpNum },
          { label: 'Derived SSCC-18', value: ssccRes.fullCode },
          { label: 'Pure Identity URN', value: `urn:epc:id:sscc:${gcpNum}.${serRefNum}` },
        ],
        checkDigitCheck: {
          code: ssccRes.fullCode,
          expected: ssccRes.checkDigit,
          actual: ssccRes.checkDigit,
          breakdown: ssccRes,
        },
      };
    }

    if (headerHex === '32') {
      const locNum = partSpec.sglnLocDigits > 0
        ? BigInt('0b' + bin.slice(14 + partSpec.gcpBits, 14 + partSpec.gcpBits + partSpec.sglnLocBits))
            .toString()
            .padStart(partSpec.sglnLocDigits, '0')
        : '';
      const extNum = BigInt('0b' + bin.slice(55, 96)).toString();
      const glnRes = calculateGs1CheckDigit(`${gcpNum}${locNum}`);
      return {
        detectedFormat: 'EPC Hex',
        validChecksum: true,
        summary: 'Decoded SGLN-96 24-character EPC Hex.',
        details: [
          { label: 'EPC Scheme', value: 'SGLN-96 (Header 0x32)' },
          { label: 'Filter / Partition', value: `Filter ${filter} · Partition ${partition}` },
          { label: 'Derived GLN-13', value: glnRes.fullCode },
          { label: 'Extension', value: extNum },
          { label: 'Pure Identity URN', value: `urn:epc:id:sgln:${gcpNum}.${locNum}.${extNum}` },
        ],
        checkDigitCheck: {
          code: glnRes.fullCode,
          expected: glnRes.checkDigit,
          actual: glnRes.checkDigit,
          breakdown: glnRes,
        },
      };
    }

    return {
      detectedFormat: 'EPC Hex',
      validChecksum: null,
      summary: `96-bit EPC Hex with header 0x${headerHex}.`,
      details: [
        { label: 'Header', value: `0x${headerHex}` },
        { label: 'Filter', value: String(filter) },
        { label: 'Partition', value: String(partition) },
      ],
    };
  }

  // 4. Parenthesized GS1-128 Element String e.g. (01)04012345678901(10)LOT1
  if (/^\(\d{2,4}\)/.test(input)) {
    const regex = /\((\d{2,4})\)([^()]+)/g;
    const matches: Array<{ ai: string; val: string }> = [];
    let m: RegExpExecArray | null;
    while ((m = regex.exec(input)) !== null) {
      matches.push({ ai: m[1], val: m[2] });
    }
    const primary = matches.find((x) => x.ai === '01' || x.ai === '00' || x.ai === '414');
    let checkDigitCheck: ParsedGs1Input['checkDigitCheck'] | undefined;
    let validChecksum: boolean | null = null;
    if (primary && /^\d+$/.test(primary.val)) {
      const v = verifyGs1CheckDigit(primary.val);
      validChecksum = v.valid;
      checkDigitCheck = { code: primary.val, expected: v.expectedCheckDigit, actual: v.actualCheckDigit, breakdown: v.breakdown };
    }
    return {
      detectedFormat: 'GS1-128',
      validChecksum,
      summary: `Parsed GS1-128 string with ${matches.length} Application Identifier${matches.length === 1 ? '' : 's'}.`,
      details: matches.map((x) => ({ label: `AI (${x.ai})`, value: x.val })),
      checkDigitCheck,
    };
  }

  // 5. Pure numeric GS1 Key (8, 12, 13, 14, 18 digits)
  const digits = digitsOnly(input);
  if (digits.length === input.replace(/[\s-]/g, '').length && [8, 12, 13, 14, 18].includes(digits.length)) {
    const v = verifyGs1CheckDigit(digits);
    const formatMap: Record<number, ParsedGs1Input['detectedFormat']> = {
      8: 'GTIN-8',
      12: 'GTIN-12',
      13: 'GTIN-13',
      14: 'GTIN-14',
      18: 'SSCC',
    };
    const detectedFormat = formatMap[digits.length] ?? 'Unknown';
    return {
      detectedFormat,
      validChecksum: v.valid,
      summary: v.valid
        ? `Valid ${digits.length === 13 ? 'GTIN-13 / GLN-13' : detectedFormat} — Mod-10 check digit (${v.actualCheckDigit}) matches.`
        : `Checksum mismatch for ${digits.length === 13 ? 'GTIN-13 / GLN-13' : detectedFormat}: expected ${v.expectedCheckDigit}, got ${v.actualCheckDigit}.`,
      details: [
        { label: 'Normalized Digits', value: digits },
        { label: 'Length', value: `${digits.length} digits (${digits.length - 1} payload + 1 check)` },
        { label: 'Weighted Sum', value: String(v.breakdown.sum) },
        { label: 'Expected Check Digit', value: String(v.expectedCheckDigit) },
        { label: 'Actual Check Digit', value: String(v.actualCheckDigit) },
      ],
      checkDigitCheck: {
        code: digits,
        expected: v.expectedCheckDigit,
        actual: v.actualCheckDigit,
        breakdown: v.breakdown,
      },
    };
  }

  return {
    detectedFormat: 'Unknown',
    validChecksum: null,
    summary: 'Format not recognized. Try a 8/12/13/14/18-digit GS1 number, (01)... GS1-128 string, https://id.gs1.org/... URL, or 24-char EPC Hex.',
    details: [],
  };
}
