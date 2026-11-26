import { EPC_PARTITION_TABLE } from '../lib/gs1';

export function AlgorithmReferenceView() {
  return (
    <div className="space-y-6">
      <div className="border border-slate-200 bg-white rounded-lg p-5 space-y-3">
        <h2 className="text-base font-semibold text-slate-900">1. GS1 Modulo-10 Check Digit Algorithm</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Every numeric GS1 Identification Key (GTIN-8, GTIN-12, GTIN-13, GTIN-14, GLN-13, SSCC-18) uses the identical right-to-left Modulo-10 check digit algorithm defined in Section 7.9 of the GS1 General Specifications.
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded-md p-4 font-mono text-xs text-slate-800 space-y-1.5 leading-relaxed">
          <div>1. Strip the rightmost check digit position (N1). Label remaining data digits N2, N3, ... from right to left.</div>
          <div>2. Multiply every even position (N2, N4, N6, ...) by weight 3, and every odd position (N3, N5, N7, ...) by weight 1.</div>
          <div>3. Sum all weighted products: S = Σ (digit_i × weight_i).</div>
          <div>4. Compute Check Digit C = (10 − (S mod 10)) mod 10.</div>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Why right-to-left? Anchoring the ×3 weight at N2 guarantees that zero-padding a GTIN-12 or GTIN-13 on the left to create a 14-digit database key or GTIN-14 (with indicator 0) leaves every data digit in the same parity position, preserving the exact same check digit.
        </p>
      </div>

      <div className="border border-slate-200 bg-white rounded-lg p-5 space-y-3">
        <h2 className="text-base font-semibold text-slate-900">2. Key Anatomy & Structures</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3 font-semibold">GS1 Key</th>
                <th className="py-2 px-3 font-semibold">Digits</th>
                <th className="py-2 px-3 font-semibold">AI</th>
                <th className="py-2 px-3 font-semibold">Internal Structure</th>
                <th className="py-2 pl-3 font-semibold">Primary Supply Chain Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-2.5 pr-3 font-semibold text-slate-900 whitespace-nowrap">GTIN-8 / 12 / 13 / 14</td>
                <td className="py-2.5 px-3 font-mono tabular-nums">8–14</td>
                <td className="py-2.5 px-3 font-mono">(01)</td>
                <td className="py-2.5 px-3 font-mono">Indicator(0–9) + GCP + Item Ref + Check</td>
                <td className="py-2.5 pl-3 text-slate-600">Trade items from consumer retail units (EAN/UPC) to outer cartons (ITF-14 / GS1-128).</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-3 font-semibold text-slate-900 whitespace-nowrap">GLN</td>
                <td className="py-2.5 px-3 font-mono tabular-nums">13</td>
                <td className="py-2.5 px-3 font-mono">(414)</td>
                <td className="py-2.5 px-3 font-mono">GCP (6–12d) + Location Ref + Check</td>
                <td className="py-2.5 pl-3 text-slate-600">Legal entities, warehouses, loading docks, and read-point locations (optional AI 254 extension).</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-3 font-semibold text-slate-900 whitespace-nowrap">SSCC</td>
                <td className="py-2.5 px-3 font-mono tabular-nums">18</td>
                <td className="py-2.5 px-3 font-mono">(00)</td>
                <td className="py-2.5 px-3 font-mono">Ext(1d) + GCP + Serial Ref + Check</td>
                <td className="py-2.5 pl-3 text-slate-600">Unique license plate for pallets, logistics units, and mixed-SKU shipping containers.</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-3 font-semibold text-slate-900 whitespace-nowrap">SGTIN</td>
                <td className="py-2.5 px-3 font-mono tabular-nums">14 + SN</td>
                <td className="py-2.5 px-3 font-mono">(01)+(21)</td>
                <td className="py-2.5 px-3 font-mono">GTIN-14 + Serial (1–20 chars)</td>
                <td className="py-2.5 pl-3 text-slate-600">Item-level serialization for pharma track-and-trace (DSCSA/FMD), apparel RFID, and recalls.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="border border-slate-200 bg-white rounded-lg p-5 space-y-3">
        <h2 className="text-base font-semibold text-slate-900">3. EPC Tag Data Standard (TDS) Partition Table</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Because UHF Gen2 RFID tags store a fixed 96-bit binary payload while GS1 Company Prefixes vary from 6 to 12 digits, EPC schemes encode a 3-bit <strong>Partition (P)</strong> value (0–6) specifying exact bit boundaries between Company Prefix and Reference digits.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs tabular-nums">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3 font-semibold">Partition (P)</th>
                <th className="py-2 px-3 font-semibold">GCP Digits</th>
                <th className="py-2 px-3 font-semibold">GCP Bits</th>
                <th className="py-2 px-3 font-semibold">SGTIN Item Digits / Bits</th>
                <th className="py-2 px-3 font-semibold">SSCC Serial Digits / Bits</th>
                <th className="py-2 pl-3 font-semibold">SGLN Loc Digits / Bits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {Object.entries(EPC_PARTITION_TABLE).map(([p, spec]) => (
                <tr key={p}>
                  <td className="py-2 pr-3 font-semibold text-slate-900">P = {p}</td>
                  <td className="py-2 px-3">{spec.gcpDigits}</td>
                  <td className="py-2 px-3">{spec.gcpBits} bits</td>
                  <td className="py-2 px-3">{spec.sgtinItemDigits}d / {spec.sgtinItemBits} bits</td>
                  <td className="py-2 px-3">{spec.ssccSerialDigits}d / {spec.ssccSerialBits} bits</td>
                  <td className="py-2 pl-3">{spec.sglnLocDigits}d / {spec.sglnLocBits} bits</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-slate-200 bg-white rounded-lg p-5 space-y-2.5">
          <h2 className="text-base font-semibold text-slate-900">4. GS1-128 &amp; FNC1 Framing</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            GS1-128 uses ISO/IEC 15417 Code 128 prefixed with a special non-data <strong>FNC1</strong> character (symbol value 102) right after Start C/B to signal GS1 Application Identifier syntax.
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">
            Fixed-length AIs (like <code className="font-mono text-slate-900">00</code>, <code className="font-mono text-slate-900">01</code>, <code className="font-mono text-slate-900">17</code>, <code className="font-mono text-slate-900">414</code>) never require a separator. Variable-length AIs (like <code className="font-mono text-slate-900">10</code> Lot or <code className="font-mono text-slate-900">21</code> Serial) require an <code className="font-mono text-slate-900">FNC1</code> (ASCII <code className="font-mono text-slate-900">0x1D</code> Group Separator) immediately following the value if another AI follows. Every symbol includes a Modulo-103 check symbol before the Stop pattern.
          </p>
        </div>

        <div className="border border-slate-200 bg-white rounded-lg p-5 space-y-2.5">
          <h2 className="text-base font-semibold text-slate-900">5. GS1 Digital Link Grammar</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            GS1 Digital Link encodes GS1 Application Identifiers into standard HTTP(S) URIs so a single QR or DataMatrix code serves both web browsers and supply chain scanners:
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-md p-3 font-mono text-xs text-slate-800 break-all">
            https://id.gs1.org/<span className="text-blue-700 font-semibold">01/&#123;GTIN-14&#125;</span>/<span className="text-emerald-700">10/&#123;LOT&#125;/21/&#123;SERIAL&#125;</span>?<span className="text-amber-700">17=YYMMDD&amp;37=QTY</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Primary identification keys (<code className="font-mono">01</code>, <code className="font-mono">00</code>, <code className="font-mono">414</code>) and key qualifiers (<code className="font-mono">10</code>, <code className="font-mono">21</code>, <code className="font-mono">254</code>) belong in the URL path; data attributes (<code className="font-mono">11</code>, <code className="font-mono">15</code>, <code className="font-mono">17</code>, <code className="font-mono">37</code>) belong in the query string.
          </p>
        </div>
      </div>
    </div>
  );
}
