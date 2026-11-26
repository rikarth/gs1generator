import { useMemo, useState } from 'react';
import {
  Barcode,
  Box,
  Check,
  Copy,
  FileJson,
  Layers,
  Link2,
  MapPin,
  Menu,
  Package,
  Radio,
  RefreshCw,
  ShieldCheck,
  BookOpen,
  X,
} from 'lucide-react';
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
  EPC_FILTER_DESCRIPTIONS,
} from './lib/gs1';
import { Barcode128Preview, QrLinkPreview } from './components/BarcodePreview';
import { ChecksumExplainer } from './components/ChecksumExplainer';
import { EpcBitVisualizer } from './components/EpcBitVisualizer';
import { BatchGeneratorView } from './components/BatchGeneratorView';
import { ValidatorView } from './components/ValidatorView';
import { AlgorithmReferenceView } from './components/AlgorithmReferenceView';
import { copyToClipboard } from './lib/clipboard';

type StudioTab = 'gtin' | 'gln' | 'sscc' | 'sgtin' | 'epc' | 'gs1-128' | 'digital-link';
type AppSection = StudioTab | 'batch' | 'validator' | 'algorithms';

interface NavItem {
  id: AppSection;
  label: string;
  group: 'Generators' | 'Utilities';
  icon: typeof Package;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'gtin', label: 'GTIN (8 / 12 / 13 / 14)', group: 'Generators', icon: Package },
  { id: 'gln', label: 'GLN (Location)', group: 'Generators', icon: MapPin },
  { id: 'sscc', label: 'SSCC (Logistics Unit)', group: 'Generators', icon: Box },
  { id: 'sgtin', label: 'SGTIN (Serialized)', group: 'Generators', icon: Barcode },
  { id: 'epc', label: 'EPC & EPC Schema', group: 'Generators', icon: Radio },
  { id: 'gs1-128', label: 'GS1-128 Barcode', group: 'Generators', icon: Layers },
  { id: 'digital-link', label: 'GS1 Digital Link', group: 'Generators', icon: Link2 },
  { id: 'batch', label: 'Batch Generator', group: 'Utilities', icon: FileJson },
  { id: 'validator', label: 'Validator & Parser', group: 'Utilities', icon: ShieldCheck },
  { id: 'algorithms', label: 'Algorithm Reference', group: 'Utilities', icon: BookOpen },
];

function CopyChip({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : label ?? 'Copy'}
    </button>
  );
}

export default function App() {
  const [activeSection, setActiveSection] = useState<AppSection>('sgtin');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Shared Supply Chain Identity Parameters
  const [gtinVariant, setGtinVariant] = useState<'GTIN-8' | 'GTIN-12' | 'GTIN-13' | 'GTIN-14'>('GTIN-14');
  const [gcp, setGcp] = useState('0614141');
  const [itemRef, setItemRef] = useState('12345');
  const [indicator, setIndicator] = useState('1');
  const [locationRef, setLocationRef] = useState('00042');
  const [glnExtension, setGlnExtension] = useState('101');
  const [ssccExtension, setSsccExtension] = useState('0');
  const [ssccSerialRef, setSsccSerialRef] = useState('123456789');
  const [serialNumber, setSerialNumber] = useState('409281');

  // EPC Parameters
  const [epcSchemeType, setEpcSchemeType] = useState<'sgtin' | 'sscc' | 'sgln'>('sgtin');
  const [epcFilter, setEpcFilter] = useState(1);

  // GS1-128 & Digital Link Attributes
  const [lotNumber, setLotNumber] = useState('BATCH26A');
  const [prodDate, setProdDate] = useState('');
  const [bestBeforeDate, setBestBeforeDate] = useState('');
  const [expDate, setExpDate] = useState('271231');
  const [itemCount, setItemCount] = useState('24');
  const [gs1128Primary, setGs1128Primary] = useState<'01' | '00' | '414'>('01');
  const [digitalLinkDomain, setDigitalLinkDomain] = useState('https://id.gs1.org');
  const [digitalLinkPrimary, setDigitalLinkPrimary] = useState<'01' | '00' | '414'>('01');

  const gcpLength = Math.min(Math.max(digitsOnly(gcp).length || 7, 6), 12);

  // Derived GS1 Keys (all Mod-10 verified)
  const gtinResult = useMemo(
    () =>
      buildGtin({
        variant: activeSection === 'gtin' ? gtinVariant : 'GTIN-14',
        gcp,
        itemRef,
        indicator,
      }),
    [activeSection, gtinVariant, gcp, itemRef, indicator],
  );

  const glnResult = useMemo(() => buildGln({ gcp, locationRef }), [gcp, locationRef]);

  const ssccResult = useMemo(
    () => buildSscc({ extensionDigit: ssccExtension, gcp, serialRef: ssccSerialRef }),
    [ssccExtension, gcp, ssccSerialRef],
  );

  // EPC Encoding
  const epcResult = useMemo(() => {
    const scheme = activeSection === 'sscc' ? 'sscc' : activeSection === 'gln' ? 'sgln' : activeSection === 'epc' ? epcSchemeType : 'sgtin';
    if (scheme === 'sscc') {
      return encodeSsccEpc({
        sscc18: ssccResult.fullCode,
        gcpLength,
        filter: epcFilter,
      });
    }
    if (scheme === 'sgln') {
      return encodeSglnEpc({
        gln13: glnResult.fullCode,
        gcpLength,
        extension: glnExtension,
        filter: epcFilter,
      });
    }
    return encodeSgtinEpc({
      gtin14: gtinResult.gtin14,
      gcpLength,
      serial: serialNumber,
      filter: epcFilter,
    });
  }, [activeSection, epcSchemeType, ssccResult.fullCode, glnResult.fullCode, glnExtension, gtinResult.gtin14, gcpLength, serialNumber, epcFilter]);

  // GS1-128 Builder
  const gs1128Result = useMemo(() => {
    const primaryMode =
      activeSection === 'sscc'
        ? '00'
        : activeSection === 'gln'
          ? '414'
          : activeSection === 'gs1-128'
            ? gs1128Primary
            : '01';

    const fields: Array<{ ai: string; label: string; value: string; fixedLength: boolean; maxLength: number }> = [];
    if (primaryMode === '00') {
      fields.push({ ai: '00', label: 'SSCC-18', value: ssccResult.fullCode, fixedLength: true, maxLength: 18 });
    } else if (primaryMode === '414') {
      fields.push({ ai: '414', label: 'GLN-13', value: glnResult.fullCode, fixedLength: true, maxLength: 13 });
      if (glnExtension.trim()) {
        fields.push({ ai: '254', label: 'GLN Extension', value: glnExtension.trim(), fixedLength: false, maxLength: 20 });
      }
    } else {
      fields.push({ ai: '01', label: 'GTIN-14', value: gtinResult.gtin14, fixedLength: true, maxLength: 14 });
      if (lotNumber.trim()) fields.push({ ai: '10', label: 'Batch / Lot', value: lotNumber.trim(), fixedLength: false, maxLength: 20 });
      if (prodDate.trim()) fields.push({ ai: '11', label: 'Prod Date', value: prodDate.trim(), fixedLength: true, maxLength: 6 });
      if (bestBeforeDate.trim()) fields.push({ ai: '15', label: 'Best Before', value: bestBeforeDate.trim(), fixedLength: true, maxLength: 6 });
      if (expDate.trim()) fields.push({ ai: '17', label: 'Expiration Date', value: expDate.trim(), fixedLength: true, maxLength: 6 });
      if (activeSection === 'sgtin' || activeSection === 'gs1-128' || activeSection === 'epc') {
        if (serialNumber.trim()) fields.push({ ai: '21', label: 'Serial Number', value: serialNumber.trim(), fixedLength: false, maxLength: 20 });
      }
      if (itemCount.trim() && activeSection === 'gs1-128') {
        fields.push({ ai: '37', label: 'Count', value: itemCount.trim(), fixedLength: false, maxLength: 8 });
      }
    }

    return buildGs1128(fields);
  }, [
    activeSection,
    gs1128Primary,
    ssccResult.fullCode,
    glnResult.fullCode,
    glnExtension,
    gtinResult.gtin14,
    lotNumber,
    prodDate,
    bestBeforeDate,
    expDate,
    serialNumber,
    itemCount,
  ]);

  // GS1 Digital Link Builder
  const digitalLinkResult = useMemo(() => {
    const primaryAi =
      activeSection === 'sscc'
        ? '00'
        : activeSection === 'gln'
          ? '414'
          : activeSection === 'digital-link'
            ? digitalLinkPrimary
            : '01';

    const primaryValue =
      primaryAi === '00' ? ssccResult.fullCode : primaryAi === '414' ? glnResult.fullCode : gtinResult.gtin14;

    return buildDigitalLink({
      domain: digitalLinkDomain,
      primaryAi,
      primaryValue,
      lot: primaryAi === '01' ? lotNumber : undefined,
      serial: primaryAi === '01' && (activeSection === 'sgtin' || activeSection === 'digital-link' || activeSection === 'epc') ? serialNumber : undefined,
      glnExtension: primaryAi === '414' ? glnExtension : undefined,
      prodDate: primaryAi === '01' ? prodDate : undefined,
      bestBeforeDate: primaryAi === '01' ? bestBeforeDate : undefined,
      expDate: primaryAi === '01' ? expDate : undefined,
      count: primaryAi === '01' && activeSection === 'digital-link' ? itemCount : undefined,
    });
  }, [
    activeSection,
    digitalLinkPrimary,
    digitalLinkDomain,
    ssccResult.fullCode,
    glnResult.fullCode,
    gtinResult.gtin14,
    lotNumber,
    serialNumber,
    glnExtension,
    prodDate,
    bestBeforeDate,
    expDate,
    itemCount,
  ]);

  const handleRandomize = () => {
    const randDigits = (len: number) =>
      Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join('');
    setGcp(`0${randDigits(6)}`);
    setItemRef(randDigits(5));
    setLocationRef(randDigits(5));
    setSsccSerialRef(randDigits(9));
    setSerialNumber(String(Math.floor(100000 + Math.random() * 899999)));
    setLotNumber(`LOT${Math.floor(10 + Math.random() * 89)}X`);
  };

  const applyPreset = (preset: 'retail' | 'pharma' | 'pallet' | 'warehouse') => {
    if (preset === 'retail') {
      setActiveSection('gtin');
      setGtinVariant('GTIN-13');
      setGcp('6291041');
      setItemRef('50021');
      setIndicator('0');
      setLotNumber('LOT2601');
      setExpDate('271231');
    } else if (preset === 'pharma') {
      setActiveSection('sgtin');
      setGcp('0300012');
      setItemRef('34567');
      setIndicator('0');
      setSerialNumber('8841209341');
      setLotNumber('RX409A');
      setExpDate('280630');
      setEpcFilter(1);
    } else if (preset === 'pallet') {
      setActiveSection('sscc');
      setGcp('0614141');
      setSsccExtension('3');
      setSsccSerialRef('000491827');
      setEpcFilter(6);
    } else {
      setActiveSection('gln');
      setGcp('0614141');
      setLocationRef('00812');
      setGlnExtension('402');
      setEpcFilter(1);
    }
  };

  const activeNavLabel = NAV_ITEMS.find((n) => n.id === activeSection)?.label ?? 'Generator';
  const isGeneratorView = !['batch', 'validator', 'algorithms'].includes(activeSection);

  // Determine which Checksum result to show in Generator View
  const activeChecksumResult =
    activeSection === 'sscc' || (activeSection === 'epc' && epcSchemeType === 'sscc') || (activeSection === 'gs1-128' && gs1128Primary === '00') || (activeSection === 'digital-link' && digitalLinkPrimary === '00')
      ? ssccResult
      : activeSection === 'gln' || (activeSection === 'epc' && epcSchemeType === 'sgln') || (activeSection === 'gs1-128' && gs1128Primary === '414') || (activeSection === 'digital-link' && digitalLinkPrimary === '414')
        ? glnResult
        : gtinResult;

  const activePrimaryDisplay =
    activeSection === 'sscc'
      ? { title: 'SSCC-18 (Serial Shipping Container Code)', code: ssccResult.fullCode, ai: '(00)' }
      : activeSection === 'gln'
        ? { title: 'GLN-13 (Global Location Number)', code: glnResult.fullCode, ai: '(414)' }
        : activeSection === 'gtin'
          ? { title: `${gtinVariant} (Global Trade Item Number)`, code: gtinResult.fullCode, ai: '(01)' }
          : { title: 'GTIN-14 Base Key', code: gtinResult.gtin14, ai: '(01)' };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-slate-200">
        <div className="h-14 flex items-center px-5 border-b border-slate-200">
          <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
            GS1 Workbench
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {(['Generators', 'Utilities'] as const).map((group) => (
            <div key={group} className="space-y-1">
              <div className="px-2.5 pb-1 text-xs font-semibold text-slate-400 tracking-wide">
                {group}
              </div>
              {NAV_ITEMS.filter((i) => i.group === group).map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium rounded-md transition-colors text-left ${
                      active
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 text-xs text-slate-500 space-y-1">
          <div className="font-medium text-slate-700">Standards Supported</div>
          <div>GS1 GenSpec · Mod-10 · TDS 2.0</div>
          <div>GS1-128 FNC1 · Digital Link 1.2</div>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/40" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-72 max-w-full bg-white h-full border-r border-slate-200 flex flex-col">
            <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200">
              <span className="text-base font-bold text-slate-900">GS1 Workbench</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-5">
              {(['Generators', 'Utilities'] as const).map((group) => (
                <div key={group} className="space-y-1">
                  <div className="px-2.5 pb-1 text-xs font-semibold text-slate-400">{group}</div>
                  {NAV_ITEMS.filter((i) => i.group === group).map((item) => {
                    const Icon = item.icon;
                    const active = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveSection(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium rounded-md transition-colors text-left ${
                          active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb on left, 1-2 primary actions on right */}
        <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 -ml-1.5 text-slate-600 hover:text-slate-900"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-500 hidden sm:inline whitespace-nowrap">Supply Chain</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="font-semibold text-slate-900 truncate">{activeNavLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRandomize}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Randomize
            </button>
            <button
              type="button"
              onClick={() => setActiveSection(activeSection === 'batch' ? 'sgtin' : 'batch')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
            >
              {activeSection === 'batch' ? 'Single Studio' : 'Batch Export'}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {activeSection === 'batch' && <BatchGeneratorView />}
          {activeSection === 'validator' && <ValidatorView />}
          {activeSection === 'algorithms' && <AlgorithmReferenceView />}

          {isGeneratorView && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Parameter Configuration */}
              <div className="lg:col-span-4 space-y-4">
                <div className="border border-slate-200 bg-white rounded-lg p-4 space-y-4">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Identifier Parameters</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Adjust company prefix and reference digits; checksums update live.
                    </p>
                  </div>

                  {/* Quick Industry Presets */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-slate-500">Quick Presets</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => applyPreset('retail')}
                        className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 text-left truncate"
                      >
                        Retail GTIN-13
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('pharma')}
                        className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 text-left truncate"
                      >
                        Pharma SGTIN
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('pallet')}
                        className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 text-left truncate"
                      >
                        Pallet SSCC-18
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('warehouse')}
                        className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 text-left truncate"
                      >
                        Facility GLN
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 space-y-3">
                    {activeSection === 'gtin' && (
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">GTIN Format</label>
                        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-md">
                          {(['GTIN-8', 'GTIN-12', 'GTIN-13', 'GTIN-14'] as const).map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setGtinVariant(v)}
                              className={`py-1.5 text-xs font-medium rounded transition-colors ${
                                gtinVariant === v ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {v.replace('GTIN-', '')}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeSection === 'epc' && (
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">EPC Identity Scheme</label>
                        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-md">
                          {([
                            { id: 'sgtin', label: 'SGTIN' },
                            { id: 'sscc', label: 'SSCC' },
                            { id: 'sgln', label: 'SGLN' },
                          ] as const).map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => setEpcSchemeType(s.id)}
                              className={`py-1.5 text-xs font-medium rounded transition-colors ${
                                epcSchemeType === s.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeSection === 'gs1-128' && (
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Primary Key AI</label>
                        <select
                          value={gs1128Primary}
                          onChange={(e) => setGs1128Primary(e.target.value as '01' | '00' | '414')}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          <option value="01">(01) GTIN-14 Trade Item</option>
                          <option value="00">(00) SSCC-18 Logistics Unit</option>
                          <option value="414">(414) GLN-13 Location</option>
                        </select>
                      </div>
                    )}

                    {activeSection === 'digital-link' && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Resolver Base Domain</label>
                          <input
                            type="url"
                            value={digitalLinkDomain}
                            onChange={(e) => setDigitalLinkDomain(e.target.value)}
                            className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                            placeholder="https://id.gs1.org"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Primary Key AI</label>
                          <select
                            value={digitalLinkPrimary}
                            onChange={(e) => setDigitalLinkPrimary(e.target.value as '01' | '00' | '414')}
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                          >
                            <option value="01">(01) GTIN-14 Trade Item</option>
                            <option value="00">(00) SSCC-18 Logistics Unit</option>
                            <option value="414">(414) GLN-13 Location</option>
                          </select>
                        </div>
                      </>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-700">GS1 Company Prefix (GCP)</label>
                        <span className="text-xs text-slate-400 tabular-nums">{gcpLength} digits · P={12 - gcpLength}</span>
                      </div>
                      <input
                        type="text"
                        value={gcp}
                        onChange={(e) => setGcp(digitsOnly(e.target.value).slice(0, 12))}
                        className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="0614141"
                      />
                    </div>

                    {/* GTIN / SGTIN specific fields */}
                    {(activeSection === 'gtin' ||
                      activeSection === 'sgtin' ||
                      (activeSection === 'epc' && epcSchemeType === 'sgtin') ||
                      (activeSection === 'gs1-128' && gs1128Primary === '01') ||
                      (activeSection === 'digital-link' && digitalLinkPrimary === '01')) && (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          {(activeSection !== 'gtin' || gtinVariant === 'GTIN-14') && (
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Indicator</label>
                              <input
                                type="text"
                                maxLength={1}
                                value={indicator}
                                onChange={(e) => setIndicator(digitsOnly(e.target.value).slice(0, 1) || '0')}
                                className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                              />
                            </div>
                          )}
                          <div className={activeSection === 'gtin' && gtinVariant !== 'GTIN-14' ? 'col-span-3' : 'col-span-2'}>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Item Reference</label>
                            <input
                              type="text"
                              value={itemRef}
                              onChange={(e) => setItemRef(digitsOnly(e.target.value).slice(0, 7))}
                              className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* GLN fields */}
                    {(activeSection === 'gln' ||
                      (activeSection === 'epc' && epcSchemeType === 'sgln') ||
                      (activeSection === 'gs1-128' && gs1128Primary === '414') ||
                      (activeSection === 'digital-link' && digitalLinkPrimary === '414')) && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Location Ref</label>
                          <input
                            type="text"
                            value={locationRef}
                            onChange={(e) => setLocationRef(digitsOnly(e.target.value).slice(0, 6))}
                            className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Extension (AI 254)</label>
                          <input
                            type="text"
                            value={glnExtension}
                            onChange={(e) => setGlnExtension(e.target.value.slice(0, 20))}
                            className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />
                        </div>
                      </div>
                    )}

                    {/* SSCC fields */}
                    {(activeSection === 'sscc' ||
                      (activeSection === 'epc' && epcSchemeType === 'sscc') ||
                      (activeSection === 'gs1-128' && gs1128Primary === '00') ||
                      (activeSection === 'digital-link' && digitalLinkPrimary === '00')) && (
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Ext Digit</label>
                          <input
                            type="text"
                            maxLength={1}
                            value={ssccExtension}
                            onChange={(e) => setSsccExtension(digitsOnly(e.target.value).slice(0, 1) || '0')}
                            className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-slate-700 mb-1">Serial Reference</label>
                          <input
                            type="text"
                            value={ssccSerialRef}
                            onChange={(e) => setSsccSerialRef(digitsOnly(e.target.value).slice(0, 11))}
                            className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />
                        </div>
                      </div>
                    )}

                    {/* Serial Number (AI 21) */}
                    {(activeSection === 'sgtin' ||
                      (activeSection === 'epc' && epcSchemeType === 'sgtin') ||
                      (activeSection === 'gs1-128' && gs1128Primary === '01') ||
                      (activeSection === 'digital-link' && digitalLinkPrimary === '01')) && (
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Serial Number (AI 21 · numeric for 96-bit EPC)
                        </label>
                        <input
                          type="text"
                          value={serialNumber}
                          onChange={(e) => setSerialNumber(e.target.value.slice(0, 20))}
                          className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                          placeholder="409281"
                        />
                      </div>
                    )}

                    {/* EPC Filter Value */}
                    {(activeSection === 'sgtin' || activeSection === 'epc' || activeSection === 'sscc' || activeSection === 'gln') && (
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">EPC Filter Value (3-bit RFID class)</label>
                        <select
                          value={epcFilter}
                          onChange={(e) => setEpcFilter(Number(e.target.value))}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          {EPC_FILTER_DESCRIPTIONS[
                            activeSection === 'sscc' || (activeSection === 'epc' && epcSchemeType === 'sscc')
                              ? 'sscc'
                              : activeSection === 'gln' || (activeSection === 'epc' && epcSchemeType === 'sgln')
                                ? 'sgln'
                                : 'sgtin'
                          ].map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Supply Chain Attributes (AI 10, 17, 11, 15, 37) */}
                    {(activeSection === 'sgtin' ||
                      (activeSection === 'gs1-128' && gs1128Primary === '01') ||
                      (activeSection === 'digital-link' && digitalLinkPrimary === '01')) && (
                      <div className="border-t border-slate-100 pt-3 space-y-2.5">
                        <div className="text-xs font-medium text-slate-500">Trade Item Attributes (Optional)</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Lot / Batch (AI 10)</label>
                            <input
                              type="text"
                              value={lotNumber}
                              onChange={(e) => setLotNumber(e.target.value.slice(0, 20))}
                              className="w-full px-2.5 py-1.5 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Expiry YYMMDD (17)</label>
                            <input
                              type="text"
                              value={expDate}
                              onChange={(e) => setExpDate(digitsOnly(e.target.value).slice(0, 6))}
                              className="w-full px-2.5 py-1.5 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                              placeholder="271231"
                            />
                          </div>
                        </div>

                        {(activeSection === 'gs1-128' || activeSection === 'digital-link') && (
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Prod (11)</label>
                              <input
                                type="text"
                                value={prodDate}
                                onChange={(e) => setProdDate(digitsOnly(e.target.value).slice(0, 6))}
                                className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                                placeholder="YYMMDD"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Best Bef (15)</label>
                              <input
                                type="text"
                                value={bestBeforeDate}
                                onChange={(e) => setBestBeforeDate(digitsOnly(e.target.value).slice(0, 6))}
                                className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                                placeholder="YYMMDD"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Count (37)</label>
                              <input
                                type="text"
                                value={itemCount}
                                onChange={(e) => setItemCount(digitsOnly(e.target.value).slice(0, 8))}
                                className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                                placeholder="24"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Live Outputs, Carriers, EPC Bits & Algorithm Math */}
              <div className="lg:col-span-8 space-y-5">
                {/* Primary Key Card */}
                <div className="border border-slate-200 bg-white rounded-lg p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-500">
                        {activePrimaryDisplay.ai} · Validated Mod-10 Checksum
                      </div>
                      <h1 className="text-lg font-bold text-slate-900 mt-0.5">{activePrimaryDisplay.title}</h1>
                    </div>
                    <CopyChip value={activePrimaryDisplay.code} label="Copy Code" />
                  </div>

                  {/* Large Tabular Code Readout with Check Digit Highlight */}
                  <div className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="font-mono text-2xl sm:text-3xl font-semibold tracking-wider tabular-nums">
                      <span className="text-slate-900">{activeChecksumResult.payload}</span>
                      <span className="text-blue-700 underline decoration-blue-300 decoration-2 underline-offset-4">
                        {activeChecksumResult.checkDigit}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 tabular-nums">
                      Data: {activeChecksumResult.payload.length} digits · Check digit:{' '}
                      <span className="font-mono font-semibold text-blue-700">{activeChecksumResult.checkDigit}</span>
                    </div>
                  </div>

                  {/* Quick Secondary Formats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="border border-slate-200 rounded-md p-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-slate-500">GS1-128 Element String</span>
                        <CopyChip value={gs1128Result.hri} />
                      </div>
                      <div className="font-mono text-xs text-slate-900 break-all select-all">{gs1128Result.hri}</div>
                    </div>

                    <div className="border border-slate-200 rounded-md p-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-slate-500">GS1 Digital Link URI</span>
                        <CopyChip value={digitalLinkResult.url} />
                      </div>
                      <div className="font-mono text-xs text-blue-700 break-all select-all">{digitalLinkResult.url}</div>
                    </div>
                  </div>
                </div>

                {/* Barcode & QR Carrier Section */}
                {(activeSection === 'gtin' ||
                  activeSection === 'gln' ||
                  activeSection === 'sscc' ||
                  activeSection === 'sgtin' ||
                  activeSection === 'gs1-128') && (
                  <Barcode128Preview
                    machineString={gs1128Result.machineString}
                    hri={gs1128Result.hri}
                    fnc1DisplayString={gs1128Result.fnc1DisplayString}
                  />
                )}

                {(activeSection === 'digital-link' || activeSection === 'sgtin' || activeSection === 'gtin') && (
                  <QrLinkPreview url={digitalLinkResult.url} />
                )}

                {activeSection === 'digital-link' && (
                  <div className="border border-slate-200 bg-white rounded-lg p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-slate-900">URI Grammar Breakdown</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                        <div className="text-slate-500">Primary Key Path</div>
                        <div className="font-mono font-semibold text-slate-900 mt-1 break-all">
                          {digitalLinkResult.primaryKeyPath}
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                        <div className="text-slate-500">Key Qualifiers (Path)</div>
                        <div className="font-mono text-slate-900 mt-1 break-all">
                          {digitalLinkResult.qualifierPaths.length > 0
                            ? digitalLinkResult.qualifierPaths.join('')
                            : 'None'}
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                        <div className="text-slate-500">Data Attributes (Query)</div>
                        <div className="font-mono text-slate-900 mt-1 break-all">
                          {digitalLinkResult.queryAttributes.length > 0
                            ? `?${digitalLinkResult.queryAttributes.join('&')}`
                            : 'None'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* EPC & EPC Schema Section */}
                {(activeSection === 'epc' || activeSection === 'sgtin' || activeSection === 'sscc' || activeSection === 'gln') && (
                  <EpcBitVisualizer epc={epcResult} />
                )}

                {/* Step-by-Step Mod-10 Algorithm Verification */}
                <ChecksumExplainer
                  title={`Mod-10 Check Digit Proof (${activePrimaryDisplay.code})`}
                  result={activeChecksumResult}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
