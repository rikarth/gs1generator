import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Check, Copy } from 'lucide-react';
import { encodeGs1128Barcode } from '../lib/barcode128';

interface Barcode128PreviewProps {
  machineString: string;
  hri: string;
  fnc1DisplayString: string;
}

export function Barcode128Preview({ machineString, hri, fnc1DisplayString }: Barcode128PreviewProps) {
  const [copiedSvg, setCopiedSvg] = useState(false);

  const encoded = useMemo(() => encodeGs1128Barcode(machineString), [machineString]);

  const svgMarkup = useMemo(() => {
    const barHeight = 76;
    const totalHeight = 104;
    const rects = encoded.bars
      .map((b) => `<rect x="${b.x}" y="8" width="${b.width}" height="${barHeight}" fill="#0f172a" />`)
      .join('');
    const escapedHri = hri.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${encoded.totalModules} ${totalHeight}" width="100%" height="${totalHeight}" role="img" aria-label="GS1-128 Barcode ${escapedHri}">
  <rect width="100%" height="100%" fill="#ffffff" />
  ${rects}
  <text x="${encoded.totalModules / 2}" y="${barHeight + 22}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9.5" fill="#0f172a">${escapedHri}</text>
</svg>`;
  }, [encoded, hri]);

  const handleDownloadSvg = () => {
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gs1-128-${hri.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24) || 'barcode'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySvg = async () => {
    await navigator.clipboard.writeText(svgMarkup);
    setCopiedSvg(true);
    setTimeout(() => setCopiedSvg(false), 1600);
  };

  return (
    <div className="border border-slate-200 bg-white rounded-lg p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">GS1-128 (Code 128 + FNC1) Symbol</h4>
          <p className="text-xs text-slate-500 tabular-nums">
            {encoded.symbolValues.length} symbols · {encoded.totalModules} modules · Mod-103 Check Symbol: {encoded.checkSymbol} (Sum {encoded.weightedSum})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopySvg}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            {copiedSvg ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedSvg ? 'Copied SVG' : 'Copy SVG'}
          </button>
          <button
            type="button"
            onClick={handleDownloadSvg}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Download SVG
          </button>
        </div>
      </div>

      <div className="border border-slate-200 rounded-md bg-white p-3 overflow-x-auto">
        <svg
          viewBox={`0 0 ${encoded.totalModules} 104`}
          className="w-full max-w-2xl mx-auto h-28"
          role="img"
          aria-label={`GS1-128 Barcode ${hri}`}
        >
          <rect width="100%" height="100%" fill="#ffffff" />
          {encoded.bars.map((b, idx) => (
            <rect key={idx} x={b.x} y={8} width={b.width} height={76} fill="#0f172a" />
          ))}
          <text
            x={encoded.totalModules / 2}
            y={98}
            textAnchor="middle"
            fontFamily="IBM Plex Mono, monospace"
            fontSize="9"
            fill="#0f172a"
          >
            {hri}
          </text>
        </svg>
      </div>

      <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-2.5 font-mono break-all">
        <span className="font-sans font-medium text-slate-500 mr-2">FNC1 Stream:</span>
        {fnc1DisplayString}
      </div>
    </div>
  );
}

interface QrLinkPreviewProps {
  url: string;
}

export function QrLinkPreview({ url }: QrLinkPreviewProps) {
  const [svgString, setSvgString] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    QRCode.toString(url, {
      type: 'svg',
      margin: 2,
      width: 176,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((svg) => {
        if (active) setSvgString(svg);
      })
      .catch(() => {
        if (active) setSvgString('');
      });
    return () => {
      active = false;
    };
  }, [url]);

  const handleDownload = () => {
    if (!svgString) return;
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = 'gs1-digital-link-qr.svg';
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  const handleCopy = async () => {
    if (!svgString) return;
    await navigator.clipboard.writeText(svgString);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="border border-slate-200 bg-white rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div
        className="w-36 h-36 shrink-0 border border-slate-200 rounded-md bg-white flex items-center justify-center overflow-hidden p-1"
        dangerouslySetInnerHTML={{ __html: svgString }}
      />
      <div className="flex-1 min-w-0 space-y-2">
        <h4 className="text-sm font-semibold text-slate-900">GS1 Digital Link 2D QR Carrier</h4>
        <p className="text-xs text-slate-600 leading-relaxed">
          Scannable by both consumer smartphone cameras (resolving to product web pages) and point-of-sale / warehouse GS1 Digital Link parsers.
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied SVG' : 'Copy QR SVG'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Download QR
          </button>
        </div>
      </div>
    </div>
  );
}
