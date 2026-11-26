import { useMemo, useState } from 'react';
import { Download, RefreshCw, Copy, Check } from 'lucide-react';
import {
  buildDigitalLink,
  buildGln,
  buildGs1128,
  buildGtin,
  buildSscc,
  digitsOnly,
  encodeSglnEpc,
  encodeSgtinEpc,
  encodeSsccEpc,
} from '../lib/gs1';
import { copyToClipboard } from '../lib/clipboard';

type BatchTarget = 'GTIN-13' | 'GTIN-14' | 'SGTIN' | 'SSCC' | 'GLN';

interface BatchRow {
  index: number;
  primaryCode: string;
  checkDigit: number;
  serialOrExt: string;
  gs1128: string;
  epcUri: string;
  epcHex: string;
  digitalLink: string;
}

export function BatchGeneratorView() {
  const [target, setTarget] = useState<BatchTarget>('SGTIN');
  const [gcp, setGcp] = useState('0614141');
  const [baseRef, setBaseRef] = useState('12345');
  const [indicator, setIndicator] = useState('0');
  const [startSerial, setStartSerial] = useState('10001');
  const [lot, setLot] = useState('LOT26A');
  const [expDate, setExpDate] = useState('271231');
  const [count, setCount] = useState(12);
  const [mode, setMode] = useState<'sequential' | 'random'>('sequential');
  const [seedNonce, setSeedNonce] = useState(1);
  const [copiedCsv, setCopiedCsv] = useState(false);

  const rows = useMemo<BatchRow[]>(() => {
    const qty = Math.min(Math.max(Number(count) || 1, 1), 100);
    const cleanGcp = digitsOnly(gcp) || '0614141';
    const gcpLen = Math.min(Math.max(cleanGcp.length, 6), 12);
    const baseNum = BigInt(digitsOnly(baseRef) || '1');
    const serBase = BigInt(digitsOnly(startSerial) || '10001');

    // Deterministic pseudo-random offset based on seedNonce + i so regeneration works cleanly
    const pseudoRand = (idx: number, mod: number) => {
      const x = Math.sin((seedNonce + 1) * 9301 + idx * 49297) * 233280;
      return Math.floor((x - Math.floor(x)) * mod);
    };

    const list: BatchRow[] = [];
    for (let i = 0; i < qty; i++) {
      const stepOffset = BigInt(i);
      const randItemOffset = BigInt(pseudoRand(i, 89999));
      const randSerOffset = BigInt(pseudoRand(i + 101, 9999999));

      if (target === 'GTIN-13' || target === 'GTIN-14') {
        const itemNum = mode === 'sequential' ? baseNum + stepOffset : baseNum + randItemOffset;
        const res = buildGtin({
          variant: target,
          gcp: cleanGcp,
          itemRef: itemNum.toString(),
          indicator,
        });
        const gs1128 = buildGs1128([
          { ai: '01', label: 'GTIN-14', value: res.gtin14, fixedLength: true, maxLength: 14 },
          ...(lot ? [{ ai: '10', label: 'Lot', value: lot, fixedLength: false, maxLength: 20 }] : []),
          ...(expDate ? [{ ai: '17', label: 'Exp', value: expDate, fixedLength: true, maxLength: 6 }] : []),
        ]);
        const dl = buildDigitalLink({
          domain: 'https://id.gs1.org',
          primaryAi: '01',
          primaryValue: res.gtin14,
          lot,
          expDate,
        });
        list.push({
          index: i + 1,
          primaryCode: res.fullCode,
          checkDigit: res.checkDigit,
          serialOrExt: lot || '—',
          gs1128: gs1128.hri,
          epcUri: `urn:epc:idpat:sgtin:${res.gcpPadded}.${target === 'GTIN-14' ? indicator : '0'}${res.itemRefPadded}.*`,
          epcHex: '— (Class-level)',
          digitalLink: dl.url,
        });
      } else if (target === 'SGTIN') {
        const res = buildGtin({
          variant: 'GTIN-14',
          gcp: cleanGcp,
          itemRef: baseNum.toString(),
          indicator,
        });
        const serialNum = mode === 'sequential' ? (serBase + stepOffset).toString() : (serBase + randSerOffset).toString();
        const epc = encodeSgtinEpc({
          gtin14: res.gtin14,
          gcpLength: gcpLen,
          serial: serialNum,
          filter: 1,
        });
        const gs1128 = buildGs1128([
          { ai: '01', label: 'GTIN-14', value: res.gtin14, fixedLength: true, maxLength: 14 },
          ...(lot ? [{ ai: '10', label: 'Lot', value: lot, fixedLength: false, maxLength: 20 }] : []),
          { ai: '21', label: 'Serial', value: serialNum, fixedLength: false, maxLength: 20 },
        ]);
        const dl = buildDigitalLink({
          domain: 'https://id.gs1.org',
          primaryAi: '01',
          primaryValue: res.gtin14,
          lot,
          serial: serialNum,
          expDate,
        });
        list.push({
          index: i + 1,
          primaryCode: res.gtin14,
          checkDigit: res.checkDigit,
          serialOrExt: serialNum,
          gs1128: gs1128.hri,
          epcUri: epc.pureIdentityUri,
          epcHex: epc.hex,
          digitalLink: dl.url,
        });
      } else if (target === 'SSCC') {
        const serRef = mode === 'sequential' ? (serBase + stepOffset).toString() : (serBase + randSerOffset).toString();
        const res = buildSscc({
          extensionDigit: indicator,
          gcp: cleanGcp,
          serialRef: serRef,
        });
        const epc = encodeSsccEpc({
          sscc18: res.fullCode,
          gcpLength: gcpLen,
          filter: 6,
        });
        const dl = buildDigitalLink({
          domain: 'https://id.gs1.org',
          primaryAi: '00',
          primaryValue: res.fullCode,
        });
        list.push({
          index: i + 1,
          primaryCode: res.fullCode,
          checkDigit: res.checkDigit,
          serialOrExt: `Ext ${res.extensionDigit}`,
          gs1128: `(00)${res.fullCode}`,
          epcUri: epc.pureIdentityUri,
          epcHex: epc.hex,
          digitalLink: dl.url,
        });
      } else {
        // GLN
        const locNum = mode === 'sequential' ? baseNum + stepOffset : baseNum + randItemOffset;
        const res = buildGln({
          gcp: cleanGcp,
          locationRef: locNum.toString(),
        });
        const epc = encodeSglnEpc({
          gln13: res.fullCode,
          gcpLength: gcpLen,
          extension: '0',
          filter: 1,
        });
        const dl = buildDigitalLink({
          domain: 'https://id.gs1.org',
          primaryAi: '414',
          primaryValue: res.fullCode,
        });
        list.push({
          index: i + 1,
          primaryCode: res.fullCode,
          checkDigit: res.checkDigit,
          serialOrExt: res.locationRefPadded,
          gs1128: `(414)${res.fullCode}`,
          epcUri: epc.pureIdentityUri,
          epcHex: epc.hex,
          digitalLink: dl.url,
        });
      }
    }
    return list;
  }, [target, gcp, baseRef, indicator, startSerial, lot, expDate, count, mode, seedNonce]);

  const toCsv = () => {
    const header = ['Index', 'Type', 'PrimaryCode', 'CheckDigit', 'SerialOrExtension', 'GS1_128_HRI', 'EPC_URI', 'EPC_Hex', 'GS1_Digital_Link'];
    const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [
      header.join(','),
      ...rows.map((r) =>
        [r.index, target, r.primaryCode, r.checkDigit, r.serialOrExt, r.gs1128, r.epcUri, r.epcHex, r.digitalLink]
          .map(escape)
          .join(','),
      ),
    ];
    return lines.join('\n');
  };

  const handleDownloadCsv = () => {
    const blob = new Blob([toCsv()], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gs1-batch-${target.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gs1-batch-${target.toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCsv = async () => {
    const ok = await copyToClipboard(toCsv());
    if (ok) {
      setCopiedCsv(true);
      setTimeout(() => setCopiedCsv(false), 1500);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border border-slate-200 bg-white rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Batch Supply Chain Identifier Generator</h2>
            <p className="text-xs text-slate-500">
              Generate up to 100 validated GS1 records with synchronized Mod-10 check digits, EPC-96 hex payloads, GS1-128 strings, and Digital Links.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {mode === 'random' && (
              <button
                type="button"
                onClick={() => setSeedNonce((s) => s + 1)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reshuffle
              </button>
            )}
            <button
              type="button"
              onClick={handleCopyCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              {copiedCsv ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedCsv ? 'Copied CSV' : 'Copy CSV'}
            </button>
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={handleDownloadJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Identifier Type</label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value as BatchTarget)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="SGTIN">SGTIN (GTIN-14 + Serial + EPC)</option>
              <option value="SSCC">SSCC-18 (Logistics Pallet)</option>
              <option value="GTIN-13">GTIN-13 (EAN-13 Retail)</option>
              <option value="GTIN-14">GTIN-14 (Case / Carton)</option>
              <option value="GLN">GLN-13 (Physical Location)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">GS1 Company Prefix (6–12 digits)</label>
            <input
              type="text"
              value={gcp}
              onChange={(e) => setGcp(digitsOnly(e.target.value).slice(0, 12))}
              className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="0614141"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {target === 'SSCC' ? 'Start Serial Reference' : target === 'GLN' ? 'Start Location Ref' : 'Item Reference'}
            </label>
            <input
              type="text"
              value={target === 'SSCC' ? startSerial : baseRef}
              onChange={(e) =>
                target === 'SSCC'
                  ? setStartSerial(digitsOnly(e.target.value).slice(0, 11))
                  : setBaseRef(digitsOnly(e.target.value).slice(0, 7))
              }
              className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Quantity</label>
              <input
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(e) => setCount(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Sequence</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'sequential' | 'random')}
                className="w-full px-2.5 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="sequential">Sequential</option>
                <option value="random">Randomized</option>
              </select>
            </div>
          </div>

          {target === 'SGTIN' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Start Serial (AI 21)</label>
                <input
                  type="text"
                  value={startSerial}
                  onChange={(e) => setStartSerial(digitsOnly(e.target.value).slice(0, 11))}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Batch / Lot (AI 10)</label>
                <input
                  type="text"
                  value={lot}
                  onChange={(e) => setLot(e.target.value.slice(0, 20))}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Expiry YYMMDD (AI 17)</label>
                <input
                  type="text"
                  value={expDate}
                  onChange={(e) => setExpDate(digitsOnly(e.target.value).slice(0, 6))}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </>
          )}

          {(target === 'GTIN-14' || target === 'SGTIN' || target === 'SSCC') && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {target === 'SSCC' ? 'Extension Digit (0–9)' : 'Packaging Indicator (0–9)'}
              </label>
              <input
                type="text"
                maxLength={1}
                value={indicator}
                onChange={(e) => setIndicator(digitsOnly(e.target.value).slice(0, 1) || '0')}
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          )}
        </div>
      </div>

      {/* High-density table */}
      <div className="border border-slate-200 bg-white rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="py-2.5 px-3 font-semibold text-right w-12">#</th>
                <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Primary Key</th>
                <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">Check</th>
                <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Serial / Ref</th>
                <th className="py-2.5 px-3 font-semibold whitespace-nowrap">GS1-128 HRI</th>
                <th className="py-2.5 px-3 font-semibold whitespace-nowrap">EPC-96 Hex</th>
                <th className="py-2.5 px-3 font-semibold whitespace-nowrap">GS1 Digital Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums font-mono">
              {rows.map((r) => (
                <tr key={r.index} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 px-3 text-right text-slate-400">{r.index}</td>
                  <td className="py-2 px-3 font-medium text-slate-900 whitespace-nowrap select-all">{r.primaryCode}</td>
                  <td className="py-2 px-3 text-right font-semibold text-emerald-700">{r.checkDigit}</td>
                  <td className="py-2 px-3 text-slate-700 whitespace-nowrap">{r.serialOrExt}</td>
                  <td className="py-2 px-3 text-slate-700 whitespace-nowrap select-all">{r.gs1128}</td>
                  <td className="py-2 px-3 text-slate-800 whitespace-nowrap select-all">{r.epcHex}</td>
                  <td className="py-2 px-3 text-blue-700 whitespace-nowrap max-w-xs truncate" title={r.digitalLink}>
                    {r.digitalLink}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
