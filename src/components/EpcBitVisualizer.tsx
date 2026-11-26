import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { EpcEncodingResult } from '../lib/gs1';

interface EpcBitVisualizerProps {
  epc: EpcEncodingResult;
}

function CopyableLine({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="font-mono text-xs sm:text-sm text-slate-900 break-all select-all mt-0.5">{value}</div>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

export function EpcBitVisualizer({ epc }: EpcBitVisualizerProps) {
  const [copiedSchema, setCopiedSchema] = useState(false);

  const handleCopySchema = async () => {
    await navigator.clipboard.writeText(epc.epcisJsonLd);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 1500);
  };

  return (
    <div className="space-y-4">
      {epc.warnings.length > 0 && (
        <div className="border border-amber-200 bg-amber-50 text-amber-900 rounded-lg p-3 text-xs leading-relaxed">
          {epc.warnings.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
      )}

      {/* URIs & Hex Output */}
      <div className="border border-slate-200 bg-white rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
          <h4 className="text-sm font-semibold text-slate-900">
            EPC Tag Data Standard ({epc.scheme.toUpperCase()})
          </h4>
          <span className="text-xs text-slate-500 tabular-nums">
            Header 0x{epc.headerHex} · Filter {epc.filter} · Partition {epc.partition} · {epc.totalBits} bits
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          <CopyableLine label="EPC Pure Identity URI (Software / EPCIS)" value={epc.pureIdentityUri} />
          <CopyableLine label="EPC Tag URI (RFID Encoding)" value={epc.tagUri} />
          <CopyableLine label="EPC Raw Hex URI" value={epc.rawUri} />
          <CopyableLine label={`RFID Gen2 Hexadecimal (${epc.hex.length} hex chars)`} value={epc.hex} />
        </div>
      </div>

      {/* Bit-Level Allocation Bar & Table */}
      <div className="border border-slate-200 bg-white rounded-lg p-4 space-y-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Binary Bit-Field Allocation ({epc.totalBits}-bit Schema)</h4>
          <p className="text-xs text-slate-500">
            Proportional bit layout packed via EPC TDS partition mapping (P = 12 − GCP digits)
          </p>
        </div>

        {/* Visual Bit Strip */}
        <div className="flex w-full h-7 rounded-md overflow-hidden border border-slate-200">
          {epc.segments.map((seg) => (
            <div
              key={seg.name}
              style={{ width: `${(seg.bits / epc.totalBits) * 100}%` }}
              title={`${seg.name}: ${seg.bits} bits (${seg.valueLabel})`}
              className={`${seg.colorClass} flex items-center justify-center text-[10px] font-mono font-medium px-1 truncate border-r border-white/20 last:border-r-0`}
            >
              {seg.bits >= 12 ? `${seg.bits}b` : ''}
            </div>
          ))}
        </div>

        {/* Segment Breakdown Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3 font-medium">Field</th>
                <th className="py-2 px-3 font-medium text-right">Bits</th>
                <th className="py-2 px-3 font-medium">Decoded Value</th>
                <th className="py-2 pl-3 font-medium">Binary Representation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {epc.segments.map((seg) => (
                <tr key={seg.name} className="hover:bg-slate-50">
                  <td className="py-2 pr-3 font-medium text-slate-900 whitespace-nowrap">{seg.name}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-700">{seg.bits}</td>
                  <td className="py-2 px-3 font-mono text-slate-800 whitespace-nowrap">{seg.valueLabel}</td>
                  <td className="py-2 pl-3 font-mono text-slate-600 break-all">{seg.binary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* EPCIS 2.0 JSON-LD Schema */}
      <div className="border border-slate-200 bg-white rounded-lg p-4 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">EPCIS 2.0 JSON-LD Event Schema</h4>
            <p className="text-xs text-slate-500">Ready for GS1 EPCIS 2.0 traceability capture endpoints</p>
          </div>
          <button
            type="button"
            onClick={handleCopySchema}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            {copiedSchema ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedSchema ? 'Copied JSON-LD' : 'Copy JSON-LD'}
          </button>
        </div>
        <pre className="bg-slate-950 text-slate-100 rounded-md p-3 text-xs font-mono overflow-x-auto leading-relaxed">
          {epc.epcisJsonLd}
        </pre>
      </div>
    </div>
  );
}
