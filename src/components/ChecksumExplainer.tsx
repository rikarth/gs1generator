import { CheckDigitResult } from '../lib/gs1';

interface ChecksumExplainerProps {
  title?: string;
  result: CheckDigitResult;
  expectedLabel?: string;
  actualDigit?: number;
}

export function ChecksumExplainer({
  title = 'GS1 Modulo-10 Check Digit Verification',
  result,
  actualDigit,
}: ChecksumExplainerProps) {
  const hasMismatch = actualDigit !== undefined && actualDigit !== result.checkDigit;

  return (
    <div className="border border-slate-200 bg-white rounded-lg p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
          <p className="text-xs text-slate-500">
            Right-to-left alternating weights (×3, ×1) · Payload: {result.payload.length} digits + Check Digit: 1 digit
          </p>
        </div>
        <div
          className={`text-xs font-medium px-2.5 py-1 rounded-md border tabular-nums ${
            hasMismatch
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {hasMismatch
            ? `Checksum Mismatch (Expected ${result.checkDigit}, Got ${actualDigit})`
            : `Valid Check Digit: ${result.checkDigit}`}
        </div>
      </div>

      {/* Horizontal Digit-by-Digit Matrix */}
      <div className="overflow-x-auto pb-1">
        <table className="w-full text-center border-collapse font-mono text-xs tabular-nums">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-1.5 px-2 text-left font-sans font-medium whitespace-nowrap">Position (R→L)</th>
              {result.steps.map((s) => (
                <th key={s.indexFromLeft} className="py-1.5 px-1.5 font-normal">
                  N{s.positionFromRight + 1}
                </th>
              ))}
              <th className="py-1.5 px-2 font-semibold text-blue-700 bg-blue-50/70">N1 (Check)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-2 px-2 text-left font-sans text-slate-600 font-medium whitespace-nowrap">Digit</td>
              {result.steps.map((s) => (
                <td key={s.indexFromLeft} className="py-2 px-1.5 font-semibold text-slate-900 text-sm">
                  {s.digit}
                </td>
              ))}
              <td className="py-2 px-2 font-bold text-blue-700 bg-blue-50/70 text-sm">
                {result.checkDigit}
              </td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-1.5 px-2 text-left font-sans text-slate-500 whitespace-nowrap">Weight</td>
              {result.steps.map((s) => (
                <td
                  key={s.indexFromLeft}
                  className={`py-1.5 px-1.5 ${s.weight === 3 ? 'text-blue-700 font-semibold' : 'text-slate-500'}`}
                >
                  ×{s.weight}
                </td>
              ))}
              <td className="py-1.5 px-2 text-slate-400 bg-blue-50/70">—</td>
            </tr>
            <tr>
              <td className="py-1.5 px-2 text-left font-sans text-slate-500 whitespace-nowrap">Product</td>
              {result.steps.map((s) => (
                <td key={s.indexFromLeft} className="py-1.5 px-1.5 text-slate-700">
                  {s.product}
                </td>
              ))}
              <td className="py-1.5 px-2 font-semibold text-blue-700 bg-blue-50/70">
                ={result.checkDigit}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Formula & Explanation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
        <div className="bg-slate-50 border border-slate-200 rounded-md p-2.5">
          <div className="text-slate-500">1. Weighted Sum</div>
          <div className="font-mono font-semibold text-slate-900 mt-0.5 tabular-nums">
            Σ(digit × weight) = {result.sum}
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-md p-2.5">
          <div className="text-slate-500">2. Modulo 10 Remainder</div>
          <div className="font-mono font-semibold text-slate-900 mt-0.5 tabular-nums">
            {result.sum} mod 10 = {result.modulo}
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-md p-2.5">
          <div className="text-slate-500">3. Check Digit Complement</div>
          <div className="font-mono font-semibold text-blue-700 mt-0.5 tabular-nums">
            (10 − {result.modulo}) mod 10 = {result.checkDigit}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed">
        Because weights alternate ×3 and ×1 starting from the rightmost data digit (N2), zero-padding a GTIN-12 or GTIN-13 on the left to form a GTIN-14 (with indicator 0) preserves the exact same check digit. This guarantees 100% detection of single-digit errors and detects ~89% of adjacent digit transpositions.
      </p>
    </div>
  );
}
