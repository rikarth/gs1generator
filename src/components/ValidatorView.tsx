import { useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
import { parseAndValidateGs1 } from '../lib/gs1';
import { ChecksumExplainer } from './ChecksumExplainer';

const SAMPLE_INPUTS = [
  { label: 'Valid GTIN-13', value: '6291041500213' },
  { label: 'Valid SSCC-18', value: '006141411234567890' },
  { label: 'Bad Checksum GTIN-14', value: '10614141000419' },
  { label: 'GS1-128 String', value: '(01)10614141000415(10)LOT42A(17)271231(21)SN9081' },
  { label: 'GS1 Digital Link', value: 'https://id.gs1.org/01/00614141123452/10/BATCH99/21/50042?17=280630' },
  { label: 'SGTIN-96 EPC Hex', value: '3034257BF7194E4000001A85' },
];

export function ValidatorView() {
  const [input, setInput] = useState('10614141000415');
  const parsed = useMemo(() => parseAndValidateGs1(input), [input]);

  return (
    <div className="space-y-6">
      <div className="border border-slate-200 bg-white rounded-lg p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Universal GS1 Parser & Checksum Verifier</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Paste any GTIN-8/12/13/14, GLN-13, SSCC-18, parenthesized GS1-128 element string, GS1 Digital Link URL, EPC URN, or 24-character EPC-96 Hex.
          </p>
        </div>

        <div>
          <label htmlFor="validator-input" className="block text-xs font-medium text-slate-700 mb-1.5">
            GS1 Code, URI, or EPC Hex Payload
          </label>
          <input
            id="validator-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. 6291041500213 or (01)10614141000415(21)1001 or 3034257BF7194E4000001A85"
            className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Test samples:</span>
          {SAMPLE_INPUTS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setInput(s.value)}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Verification Status Banner & Details */}
      <div className="border border-slate-200 bg-white rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {parsed.validChecksum === true ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : parsed.validChecksum === false ? (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            ) : (
              <HelpCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Detected Format</span>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-slate-900">{parsed.detectedFormat}</span>
              </div>
              <p className="text-sm font-medium text-slate-900 mt-0.5">{parsed.summary}</p>
            </div>
          </div>

          {parsed.validChecksum !== null && (
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-md border whitespace-nowrap shrink-0 ${
                parsed.validChecksum
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              {parsed.validChecksum ? 'Checksum Verified' : 'Invalid Checksum'}
            </span>
          )}
        </div>

        {parsed.details.length > 0 && (
          <div className="border-t border-slate-100 pt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {parsed.details.map((d, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                <div className="text-xs text-slate-500">{d.label}</div>
                <div className="font-mono text-xs sm:text-sm text-slate-900 break-all mt-0.5">{d.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {parsed.checkDigitCheck && (
        <ChecksumExplainer
          title={`Mod-10 Verification for ${parsed.checkDigitCheck.code}`}
          result={parsed.checkDigitCheck.breakdown}
          actualDigit={parsed.checkDigitCheck.actual}
        />
      )}
    </div>
  );
}
