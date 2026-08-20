import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ApiTestConfig, TestResult, TestStatus } from './types';
import apiRegistry from './apiRegistry';
import { loadExamplePayload, runTest } from './runner';

const STATUS_COLOR: Record<TestStatus, string> = {
    idle: '#9e9e9e',
    running: '#fb8c00',
    pass: '#43a047',
    fail: '#e53935',
    skip: '#757575',
};

const STATUS_LABEL: Record<TestStatus, string> = {
    idle: 'IDLE',
    running: '...',
    pass: 'PASS',
    fail: 'FAIL',
    skip: 'SKIP',
};

const SERVICE_COLOR: Record<string, string> = {
    'platform': '#1565c0',
    'channel-service': '#6a1b9a',
    'data-board': '#2e7d32',
    'ai': '#e65100',
    'ips': '#c62828',
    'analytics': '#00695c',
    'ai-tracing': '#bf360c',
    'imbrace': '#37474f',
    'imbrace-ai': '#4527a0',
    'marketplace': '#5d4037',
};

function getServiceTag(url: string): string {
    const m = url.match(/^\/api\/([^/?]+)/);
    return m ? m[1] : 'unknown';
}

// Set of test ids that should ALWAYS be classified as 'fe' on failure regardless
// of HTTP status code — used for endpoints with hardcoded environment-specific
// ids that 404 when the data is stale, but aren't real backend issues.
const ALWAYS_FE_IDS = new Set(apiRegistry.filter((c) => c.markAsFE).map((c) => c.id));

// Categorize a failure:
//   'server' — real backend issue (5xx, 404, network/parse). Counted in ✗.
//   'fe'     — 4xx other than 404; FE sent bad data. Treated as pass.
//   'data'   — HTTP 2xx but response shape didn't match expectedShape (structure mismatch).
function classifyFailure(result: TestResult | undefined): 'server' | 'fe' | 'data' | null {
    if (!result || result.status !== 'fail') return null;
    const code = result.statusCode;
    // Per-entry override: opt this id into 'fe' for any HTTP-status failure
    // (400/401/404/500/etc — anything caused by payload, headers, or stale id).
    // Network errors / parse errors (no statusCode) are NOT overridden — those
    // still surface as real 'server' failures.
    if (ALWAYS_FE_IDS.has(result.id) && code) return 'fe';
    // Structure mismatch — HTTP succeeded but shape was off.
    if (result.structureErrors && result.structureErrors.length > 0 && code && code >= 200 && code < 300) {
        return 'data';
    }
    if (!code) return 'server'; // network / parse error
    if (code >= 500) return 'server';
    if (code === 404) return 'server';
    if (code >= 400 && code < 500) return 'fe';
    return 'server';
}

// Best-guess fallback when an entry doesn't declare its `pages`.
// Maps a registry domain to the app routes that consume those endpoints.
const DOMAIN_PAGES: Record<string, string[]> = {
    Account: ['/profile', '/login'],
    Organization: ['/organizations', '/select-organization'],
    'Business Unit': ['/business-units'],
    Channel: ['/channels'],
    Team: ['/teams', '/teams/my-teams', '/teams/:team_id/members'],
    Conversation: ['/chatroom'],
    Member: ['/members'],
    Contact: ['/crm/:boardId'],
    Notification: ['/chatroom'],
    Campaign: ['/campaigns', '/campaigns/:id'],
    'Board Automation': ['/databoards/:id/automations', '/knowledge-hub-all/:id/automations', '/crm/:id/automations'],
    Databoard: ['/databoards', '/databoards/:id'],
    'Knowledge Hub': ['/knowledge-hub-all', '/knowledge-hub-all/:boardId', '/knowledge-hub-all/drive/:folderId'],
    Templates: ['/templates'],
    Workflow: ['/workflows', '/automations'],
    AI: ['/ai-agent', '/ai-assistants'],
    'Guard Rail': ['/ai-agent'],
    'Physical Store': ['/physical-stores'],
    Resources: ['/resources'],
    Marketplace: ['/journey-templates', '/marketplace'],
    License: ['/account/license'],
};

function PageChip({ page }: { page: string }) {
    return (
        <span
            title={`Used on ${page}`}
            style={{
                background: '#eceff1',
                color: '#37474f',
                border: '1px solid #cfd8dc',
                borderRadius: 4,
                padding: '1px 6px',
                fontSize: 10,
                fontFamily: 'monospace',
                whiteSpace: 'nowrap',
            }}
        >
            {page}
        </span>
    );
}

function StatusBadge({ status, failKind }: { status: TestStatus; failKind?: 'server' | 'fe' | 'data' | null }) {
    // 4xx caused by bad FE data → "FE" badge (orange).
    // 2xx with structure mismatch → "Data" badge (deep orange).
    const isFE = status === 'fail' && failKind === 'fe';
    const isData = status === 'fail' && failKind === 'data';
    const bg = isFE ? '#fb8c00' : isData ? '#bf360c' : STATUS_COLOR[status];
    const label = isFE ? 'FE' : isData ? 'Data' : STATUS_LABEL[status];
    const title = isFE
        ? '4xx response — FE sent bad data. Counted as pass in totals.'
        : isData
        ? 'HTTP succeeded but response shape did not match expected schema.'
        : undefined;
    return (
        <span
            title={title}
            style={{
                background: bg,
                color: '#fff',
                borderRadius: 4,
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.5,
                minWidth: 40,
                display: 'inline-block',
                textAlign: 'center',
            }}
        >
            {label}
        </span>
    );
}

function ServiceTag({ service }: { service: string }) {
    const color = SERVICE_COLOR[service] ?? '#546e7a';
    return (
        <span
            title={`Service: ${service}`}
            style={{
                background: `${color}15`,
                color: color,
                border: `1px solid ${color}55`,
                borderRadius: 4,
                padding: '1px 6px',
                fontSize: 10,
                fontWeight: 600,
                fontFamily: 'monospace',
                letterSpacing: 0.3,
                whiteSpace: 'nowrap',
            }}
        >
            {service}
        </span>
    );
}

function DomainSummary({ tests, results }: { tests: ApiTestConfig[]; results: Record<string, TestResult> }) {
    let pass = 0, fail = 0, running = 0, idle = 0, fe = 0;
    tests.forEach((t) => {
        const r = results[t.id];
        const s = r?.status ?? 'idle';
        if (s === 'idle') idle++;
        else if (s === 'running') running++;
        else if (s === 'pass') pass++;
        else if (s === 'fail') {
            const kind = classifyFailure(r);
            if (kind === 'fe') {
                // FE-data 4xx → counted as pass
                pass++;
                fe++;
            } else {
                fail++;
            }
        }
    });

    void fe;
    return (
        <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
            {pass ? <span style={{ color: '#43a047', fontWeight: 600 }}>✓ {pass}</span> : null}
            {fail ? <span style={{ color: '#e53935', fontWeight: 600 }}>✗ {fail}</span> : null}
            {running ? <span style={{ color: '#fb8c00', fontWeight: 600 }}>● {running}</span> : null}
            {idle ? <span style={{ color: '#9e9e9e' }}>○ {idle}</span> : null}
        </div>
    );
}

function ResultRow({ config, result, onRun }: { config: ApiTestConfig; result?: TestResult; onRun: (config: ApiTestConfig, payload?: string) => void }) {
    const [expanded, setExpanded] = useState(false);
    const [payloadOpen, setPayloadOpen] = useState(false);
    const [payloadText, setPayloadText] = useState(
        config.samplePayload ? JSON.stringify(config.samplePayload, null, 2) : '{\n  \n}',
    );
    const [payloadError, setPayloadError] = useState('');
    const [loadingPayload, setLoadingPayload] = useState(false);
    const hasLoadedRef = useRef(false);

    useEffect(() => {
        if (!payloadOpen || !config.sourceGetUrl || hasLoadedRef.current) return;
        hasLoadedRef.current = true;
        setLoadingPayload(true);
        loadExamplePayload(config.sourceGetUrl).then((data) => {
            if (data) setPayloadText(JSON.stringify(data, null, 2));
            setLoadingPayload(false);
        });
    }, [payloadOpen, config.sourceGetUrl]);
    const status = result?.status ?? 'idle';
    const failKind = classifyFailure(result);
    const isMutating = !config.safe;
    const methodColor = { GET: '#1565c0', POST: '#2e7d32', PUT: '#e65100', DELETE: '#c62828', PATCH: '#6a1b9a' }[config.method] ?? '#555';
    const methodBg = { GET: '#e3f2fd', POST: '#e8f5e9', PUT: '#fff3e0', DELETE: '#ffebee', PATCH: '#f3e5f5' }[config.method] ?? '#f5f5f5';
    const serviceTag = getServiceTag(config.getUrl());
    const pages = config.pages && config.pages.length > 0 ? config.pages : (DOMAIN_PAGES[config.domain] || []);

    const handleRun = () => {
        if (isMutating) {
            try {
                JSON.parse(payloadText);
                setPayloadError('');
                onRun(config, payloadText);
            } catch {
                setPayloadError('Invalid JSON');
                return;
            }
        } else {
            onRun(config);
        }
    };

    const [copied, setCopied] = useState(false);
    const handleCopyCurl = (e: React.MouseEvent) => {
        e.stopPropagation();
        const token = localStorage.getItem('imbrace-access-token') || '';
        const orgId = document.cookie.match(/org_id=([^;]+)/)?.[1] || '';
        const url = result?.url ?? config.getUrl();
        const headers = [
            `-H 'Content-Type: application/json'`,
            token ? `-H 'Authorization: Bearer ${token}'` : '',
            orgId ? `-H 'x-organization-id: ${orgId}'` : '',
        ].filter(Boolean).join(' \\\n  ');
        const body = isMutating ? ` \\\n  -d '${payloadText.replace(/'/g, `'\\''`)}'` : '';
        const curl = `curl -X ${config.method} '${window.location.origin}${url}' \\\n  ${headers}${body}`;
        navigator.clipboard.writeText(curl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };

    return (
        <div style={{ borderBottom: '1px solid #f0f0f0', opacity: isMutating && status === 'idle' ? 0.85 : 1 }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 16px 8px 32px',
                    cursor: result ? 'pointer' : 'default',
                    background: status === 'fail' ? '#fff8f8' : status === 'pass' ? '#f8fff8' : status === 'running' ? '#fff8e1' : '#fff',
                }}
                onClick={() => result && setExpanded((p) => !p)}
            >
                <StatusBadge status={status} failKind={failKind} />
                <span style={{ fontSize: 11, fontWeight: 700, color: methodColor, background: methodBg, padding: '2px 6px', borderRadius: 3, minWidth: 60, textAlign: 'center' }}>
                    {config.method}
                </span>
                <ServiceTag service={serviceTag} />
                <span style={{ flex: 1, fontSize: 13, color: '#333' }}>
                    {config.name}
                    {pages.length > 0 && (
                        <span
                            title={`Used on:\n${pages.join('\n')}`}
                            style={{ marginLeft: 8, fontSize: 10, color: '#7986cb', cursor: 'help', fontFamily: 'monospace' }}
                        >
                            ⓘ {pages.length} page{pages.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </span>
                <span style={{ fontSize: 11, color: '#999', fontFamily: 'monospace' }}>
                    {result?.responseTime != null ? `${result.responseTime}ms` : ''}
                </span>
                {result?.statusCode && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: result.statusCode >= 400 ? '#e53935' : '#43a047' }}>
                        {result.statusCode}
                    </span>
                )}
                {isMutating && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setPayloadOpen((p) => !p); }}
                        style={{ background: 'transparent', border: '1px solid #bbb', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer', color: methodColor }}
                    >
                        {payloadOpen ? 'Payload ▲' : 'Payload ▼'}
                    </button>
                )}
                <button
                    onClick={(e) => { e.stopPropagation(); handleRun(); }}
                    style={{ background: isMutating ? methodColor : 'transparent', color: isMutating ? '#fff' : '#666', border: isMutating ? 'none' : '1px solid #bbb', borderRadius: 4, padding: '2px 10px', fontSize: 11, cursor: 'pointer', fontWeight: isMutating ? 600 : 400 }}
                >
                    {isMutating ? 'Run' : '↺ Run'}
                </button>
                <button
                    onClick={handleCopyCurl}
                    title="Copy as curl"
                    style={{ background: 'transparent', border: '1px solid #bbb', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer', color: copied ? '#43a047' : '#666', fontFamily: 'monospace' }}
                >
                    {copied ? '✓ curl' : 'curl'}
                </button>
                {result && <span style={{ fontSize: 12, color: '#bbb' }}>{expanded ? '▲' : '▼'}</span>}
            </div>

            {isMutating && payloadOpen && (
                <div style={{ background: '#f8f8f8', padding: '12px 16px 12px 32px', borderTop: '1px solid #f0f0f0' }}>
                    <div style={{ fontSize: 11, color: '#555', marginBottom: 6, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        Request Body (JSON)
                        {loadingPayload && <span style={{ color: '#fb8c00', fontWeight: 400 }}>Loading real data…</span>}
                        {!loadingPayload && config.sourceGetUrl && (
                            <button
                                onClick={() => {
                                    setLoadingPayload(true);
                                    loadExamplePayload(config.sourceGetUrl ?? '').then((data) => {
                                        if (data) setPayloadText(JSON.stringify(data, null, 2));
                                        setLoadingPayload(false);
                                    });
                                }}
                                style={{ background: 'transparent', border: '1px solid #bbb', borderRadius: 3, padding: '1px 8px', fontSize: 10, cursor: 'pointer', color: '#1565c0' }}
                            >
                                ↺ Reload from API
                            </button>
                        )}
                    </div>
                    <textarea
                        value={loadingPayload ? 'Loading real data from API…' : payloadText}
                        onChange={(e) => !loadingPayload && setPayloadText(e.target.value)}
                        rows={8}
                        style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, padding: 8, borderRadius: 4, border: payloadError ? '1px solid #e53935' : '1px solid #ddd', boxSizing: 'border-box', resize: 'vertical', background: '#1e1e1e', color: loadingPayload ? '#888' : '#d4d4d4' }}
                        spellCheck={false}
                    />
                    {payloadError && <div style={{ color: '#e53935', fontSize: 11, marginTop: 4 }}>{payloadError}</div>}
                </div>
            )}

            {expanded && result && (
                <div style={{ background: '#fafafa', padding: '12px 16px 16px 32px', borderTop: '1px solid #f0f0f0' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#555', marginBottom: 8 }}>
                        {config.method} {config.getUrl()}
                    </div>
                    {pages.length > 0 && (
                        <div style={{ marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, color: '#555', fontWeight: 600 }}>Used on:</span>
                            {pages.map((p) => <PageChip key={p} page={p} />)}
                            {!config.pages && (
                                <span style={{ fontSize: 10, color: '#bbb', fontStyle: 'italic' }}>(default mapping by domain)</span>
                            )}
                        </div>
                    )}
                    {result.error && (
                        <div style={{ background: '#ffebee', border: '1px solid #ffcdd2', borderRadius: 4, padding: '8px 12px', color: '#c62828', fontSize: 12, marginBottom: 8 }}>
                            <strong>Error:</strong> {result.error}
                        </div>
                    )}
                    {result.structureErrors && result.structureErrors.length > 0 && (
                        <div style={{ background: '#fff3e0', border: '1px solid #ffe0b2', borderRadius: 4, padding: '8px 12px', marginBottom: 8 }}>
                            <div style={{ fontWeight: 700, fontSize: 12, color: '#e65100', marginBottom: 6 }}>
                                Structure Mismatch ({result.structureErrors.length})
                            </div>
                            {result.structureErrors.map((e, i) => (
                                <div key={i} style={{ fontSize: 11, color: '#bf360c', marginBottom: 2 }}>
                                    <code style={{ background: '#ffe0b2', padding: '0 4px', borderRadius: 2 }}>{e.field}</code>
                                    {' '}— expected <strong>{e.expected}</strong>, got <strong>{e.actual}</strong>
                                </div>
                            ))}
                        </div>
                    )}
                    {result.responsePreview && (
                        <pre style={{ background: '#263238', color: '#aed6f1', borderRadius: 4, padding: 12, fontSize: 11, overflow: 'auto', maxHeight: 240, margin: 0 }}>
                            {result.responsePreview}
                        </pre>
                    )}
                </div>
            )}
        </div>
    );
}

function SidebarDomainLink({
    domain,
    tests,
    results,
}: {
    domain: string;
    tests: ApiTestConfig[];
    results: Record<string, TestResult>;
}) {
    const [hovered, setHovered] = useState(false);
    const hasFailures = tests.some((t) => {
        const r = results[t.id];
        return r?.status === 'fail' && classifyFailure(r) !== 'fe';
    });
    const hasPass = tests.some((t) => results[t.id]?.status === 'pass');
    const baseColor = hasFailures ? '#ef9a9a' : hasPass ? '#a5d6a7' : '#c5cae9';
    const baseBg = hasFailures ? '#b71c1c22' : 'transparent';
    return (
        <a
            href={`#domain-${domain.replace(/\s+/g, '-')}`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                padding: '8px 16px',
                cursor: 'pointer',
                background: hovered ? '#3949ab' : baseBg,
                color: hovered ? '#fff' : baseColor,
                fontSize: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                textDecoration: 'none',
                borderLeft: hovered ? '3px solid #7986cb' : '3px solid transparent',
                transition: 'background 0.12s ease, color 0.12s ease, border-left-color 0.12s ease',
            }}
        >
            <span>{domain}</span>
            <DomainSummary tests={tests} results={results} />
        </a>
    );
}

interface DomainSectionProps {
    domain: string;
    tests: ApiTestConfig[];
    results: Record<string, TestResult>;
    onRun: (config: ApiTestConfig, payload?: string) => Promise<void> | void;
    onRunGroup: (domain: string) => void;
    runningGroup: string | null;
    runningGlobal: boolean;
    defaultExpanded: boolean;
}

function DomainSection({ domain, tests, results, onRun, onRunGroup, runningGroup, runningGlobal, defaultExpanded }: DomainSectionProps) {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const services = useMemo(() => Array.from(new Set(tests.map((t) => getServiceTag(t.getUrl())))), [tests]);
    const isRunning = runningGroup === domain || runningGlobal;

    return (
        <div id={`domain-${domain.replace(/\s+/g, '-')}`} style={{ borderBottom: '1px solid #e0e0e0' }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 16px',
                    background: '#f5f5fa',
                    cursor: 'pointer',
                    borderTop: '2px solid #1a237e',
                }}
                onClick={() => setExpanded((p) => !p)}
            >
                <span style={{ fontSize: 14, color: '#1a237e' }}>{expanded ? '▼' : '▶'}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1a237e' }}>{domain}</span>
                <span style={{ fontSize: 11, color: '#888' }}>({tests.length} endpoint{tests.length !== 1 ? 's' : ''})</span>
                <div style={{ display: 'flex', gap: 4 }}>
                    {services.map((s) => (
                        <ServiceTag key={s} service={s} />
                    ))}
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <DomainSummary tests={tests} results={results} />
                    <button
                        onClick={(e) => { e.stopPropagation(); onRunGroup(domain); }}
                        disabled={isRunning}
                        style={{
                            background: isRunning ? '#bdbdbd' : '#1a237e',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            padding: '4px 12px',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: isRunning ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {runningGroup === domain ? 'Running…' : `Run All (${tests.length})`}
                    </button>
                </div>
            </div>

            {expanded && (
                <div style={{ background: '#fff' }}>
                    {tests.map((config) => (
                        <ResultRow
                            key={config.id}
                            config={config}
                            result={results[config.id]}
                            onRun={onRun}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function ApiMonitor() {
    const [results, setResults] = useState<Record<string, TestResult>>({});
    const [runningGlobal, setRunningGlobal] = useState(false);
    const [runningGroup, setRunningGroup] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    // Filter for the visible rows: a status-code chip ('404', '500', 'Data', 'ERR'),
    // or 'all' to show everything. Only entries whose latest result matches the
    // selected code remain visible.
    const [errorFilter, setErrorFilter] = useState<string>('all');
    const abortRef = useRef(false);

    const allDomains = useMemo(() => Array.from(new Set(apiRegistry.map((a) => a.domain))), []);

    // Build the visible test set after applying the URL search and the error-code filter.
    const visibleRegistry = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return apiRegistry.filter((cfg) => {
            if (term) {
                const url = cfg.getUrl().toLowerCase();
                const name = cfg.name.toLowerCase();
                if (!url.includes(term) && !name.includes(term)) return false;
            }
            if (errorFilter !== 'all') {
                const r = results[cfg.id];
                if (!r || r.status !== 'fail') return false;
                const kind = classifyFailure(r);
                if (errorFilter === 'Data') {
                    if (kind !== 'data') return false;
                } else if (errorFilter === 'ERR') {
                    if (kind !== 'server' || r.statusCode) return false;
                } else {
                    if (String(r.statusCode) !== errorFilter) return false;
                    if (kind === 'fe') return false;
                }
            }
            return true;
        });
    }, [searchTerm, errorFilter, results]);

    const domains = useMemo(
        () => allDomains.filter((d) => visibleRegistry.some((a) => a.domain === d)),
        [allDomains, visibleRegistry],
    );
    const testsByDomain = useMemo(() => {
        const map: Record<string, ApiTestConfig[]> = {};
        domains.forEach((d) => {
            map[d] = visibleRegistry.filter((a) => a.domain === d);
        });
        return map;
    }, [domains, visibleRegistry]);

    const updateResult = useCallback((result: TestResult) => {
        setResults((prev) => ({ ...prev, [result.id]: result }));
    }, []);

    const setRunning = useCallback((id: string, url: string) => {
        setResults((prev) => ({ ...prev, [id]: { id, status: 'running', url } }));
    }, []);

    // Run a list of tests sequentially, updating UI immediately after each one finishes.
    const runSequential = useCallback(
        async (tests: ApiTestConfig[]) => {
            for (const config of tests) {
                if (abortRef.current) break;
                setRunning(config.id, config.getUrl());
                const result = await runTest(config);
                updateResult(result);
            }
        },
        [setRunning, updateResult],
    );

    const runSingle = useCallback(
        async (config: ApiTestConfig, payloadText?: string) => {
            let payload: Record<string, unknown> | undefined;
            if (payloadText) {
                try { payload = JSON.parse(payloadText); } catch { /* ignore */ }
            }
            const cfg = payload ? { ...config, samplePayload: payload } : config;
            setRunning(config.id, config.getUrl());
            const result = await runTest(cfg);
            updateResult(result);
        },
        [setRunning, updateResult],
    );

    const runGroup = useCallback(
        async (domain: string) => {
            if (runningGlobal || runningGroup) return;
            const tests = testsByDomain[domain] || [];
            if (tests.length === 0) return;
            abortRef.current = false;
            setRunningGroup(domain);
            await runSequential(tests);
            setRunningGroup(null);
        },
        [runningGlobal, runningGroup, testsByDomain, runSequential],
    );

    const runAllNow = useCallback(async () => {
        if (runningGlobal || runningGroup) return;
        if (apiRegistry.length === 0) return;
        abortRef.current = false;
        setRunningGlobal(true);
        await runSequential(apiRegistry);
        setRunningGlobal(false);
    }, [runningGlobal, runningGroup, runSequential]);

    const stopAll = useCallback(() => {
        abortRef.current = true;
    }, []);

    const totalCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        Object.values(results).forEach((r) => {
            counts[r.status] = (counts[r.status] || 0) + 1;
        });
        return counts;
    }, [results]);

    // Server-side failures bucketed by HTTP status code (5xx, 404, network errors),
    // plus a synthetic "Data" bucket for 2xx-with-structure-mismatch failures.
    // 4xx other than 404 = bad FE data — excluded from the header counter.
    const errorBreakdown = useMemo(() => {
        const map: Record<string, number> = {};
        Object.values(results).forEach((r) => {
            const kind = classifyFailure(r);
            if (kind === 'server') {
                const key = r.statusCode ? String(r.statusCode) : 'ERR';
                map[key] = (map[key] || 0) + 1;
            } else if (kind === 'data') {
                map['Data'] = (map['Data'] || 0) + 1;
            }
        });
        return map;
    }, [results]);
    const errorCodes = useMemo(
        () => Object.entries(errorBreakdown).sort(([a], [b]) => a.localeCompare(b)),
        [errorBreakdown],
    );
    const serverFailCount = useMemo(
        () => Object.values(results).filter((r) => {
            const k = classifyFailure(r);
            return k === 'server' || k === 'data';
        }).length,
        [results],
    );
    const feFailCount = useMemo(
        () => Object.values(results).filter((r) => classifyFailure(r) === 'fe').length,
        [results],
    );

    const totalRunnable = apiRegistry.length;

    return (
        <div style={{ display: 'flex', height: '100%', background: '#f5f5f5', fontFamily: 'Inter, sans-serif' }}>
            {/* Sidebar — quick jump nav */}
            <div
                style={{
                    width: 220,
                    background: '#1a237e',
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'auto',
                }}
            >
                <div style={{ padding: '20px 16px 12px', color: '#fff', fontSize: 14, fontWeight: 700, letterSpacing: 0.5 }}>
                    API Monitor
                </div>
                <div style={{ padding: '0 8px 8px', color: '#9fa8da', fontSize: 11 }}>
                    Click to jump to group
                </div>
                {domains.map((domain) => {
                    const tests = testsByDomain[domain] || [];
                    const dr: Record<string, TestResult> = {};
                    tests.forEach((t) => { if (results[t.id]) dr[t.id] = results[t.id]; });
                    return (
                        <SidebarDomainLink
                            key={domain}
                            domain={domain}
                            tests={tests}
                            results={dr}
                        />
                    );
                })}
            </div>

            {/* Main */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Top bar */}
                <div
                    style={{
                        background: '#fff',
                        borderBottom: '1px solid #e0e0e0',
                        padding: '12px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        flexShrink: 0,
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#1a237e' }}>
                                {(searchTerm || errorFilter !== 'all')
                                    ? `Endpoints (${visibleRegistry.length} of ${apiRegistry.length})`
                                    : `All Endpoints (${apiRegistry.length})`}
                            </div>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search URL or name…"
                                style={{
                                    padding: '6px 12px',
                                    border: '1px solid #c5cae9',
                                    borderRadius: 4,
                                    fontSize: 14,
                                    width: 320,
                                    outline: 'none',
                                }}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid #bbb',
                                        borderRadius: 3,
                                        padding: '4px 10px',
                                        fontSize: 13,
                                        cursor: 'pointer',
                                        color: '#666',
                                    }}
                                >
                                    × clear
                                </button>
                            )}
                        </div>
                        <div style={{ fontSize: 13, color: '#757575', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span>Runnable now: <strong>{totalRunnable}</strong></span>
                            {((totalCounts.pass || 0) + feFailCount) ? (
                                <span style={{ color: '#43a047' }}>✓ {(totalCounts.pass || 0) + feFailCount}</span>
                            ) : null}
                            {serverFailCount ? (
                                <span title="Server-side failures (5xx + 404 + network)" style={{ color: '#e53935', fontWeight: 600 }}>✗ {serverFailCount}</span>
                            ) : null}
                            {totalCounts.running ? <span style={{ color: '#fb8c00' }}>● {totalCounts.running} running</span> : null}
                            {errorCodes.length > 0 && (
                                <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginLeft: 4 }}>
                                    <span style={{ color: '#999' }}>by code (click to filter):</span>
                                    {/* "all" reset chip — only shown when a code filter is active */}
                                    {errorFilter !== 'all' && (
                                        <span
                                            onClick={() => setErrorFilter('all')}
                                            title="Clear filter"
                                            style={{
                                                background: '#eceff1',
                                                color: '#37474f',
                                                border: '1px solid #cfd8dc',
                                                borderRadius: 4,
                                                padding: '3px 10px',
                                                fontSize: 13,
                                                fontWeight: 700,
                                                fontFamily: 'monospace',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            × all
                                        </span>
                                    )}
                                    {errorCodes.map(([code, n]) => {
                                        const c = code === 'Data' ? '#bf360c'
                                            : code === 'ERR' ? '#9c27b0'
                                            : code.startsWith('5') ? '#b71c1c'
                                            : code.startsWith('4') ? '#e65100'
                                            : '#757575';
                                        const titleText = code === 'Data'
                                            ? `${n} response${n !== 1 ? 's' : ''} with structure mismatch (HTTP 2xx). Click to filter list.`
                                            : code === 'ERR'
                                            ? `${n} network/parse error${n !== 1 ? 's' : ''}. Click to filter list.`
                                            : `${n} response${n !== 1 ? 's' : ''} with HTTP ${code}. Click to filter list.`;
                                        const active = errorFilter === code;
                                        return (
                                            <span
                                                key={code}
                                                onClick={() => setErrorFilter(active ? 'all' : code)}
                                                title={titleText}
                                                style={{
                                                    background: active ? c : `${c}15`,
                                                    color: active ? '#fff' : c,
                                                    border: `1px solid ${active ? c : `${c}55`}`,
                                                    borderRadius: 4,
                                                    padding: '3px 10px',
                                                    fontSize: 13,
                                                    fontWeight: 700,
                                                    fontFamily: 'monospace',
                                                    cursor: 'pointer',
                                                    boxShadow: active ? '0 0 0 2px rgba(0,0,0,0.05)' : 'none',
                                                }}
                                            >
                                                {code}: {n}
                                            </span>
                                        );
                                    })}
                                </span>
                            )}
                        </div>
                    </div>

                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
                        {(runningGlobal || runningGroup) ? (
                            <button
                                onClick={stopAll}
                                style={{
                                    background: '#c62828',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 6,
                                    padding: '8px 20px',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Stop
                            </button>
                        ) : (
                            <button
                                onClick={runAllNow}
                                style={{
                                    background: '#1a237e',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 6,
                                    padding: '8px 20px',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                ▶ Run All ({totalRunnable})
                            </button>
                        )}
                    </div>
                </div>

                {/* Sections */}
                <div style={{ flex: 1, overflow: 'auto', background: '#fff' }}>
                    {domains.length === 0 ? (
                        <div style={{ padding: '40px 24px', textAlign: 'center', color: '#9e9e9e', fontSize: 13 }}>
                            No endpoints match the current
                            {searchTerm && <> search “<strong>{searchTerm}</strong>”</>}
                            {searchTerm && errorFilter !== 'all' && ' and'}
                            {errorFilter !== 'all' && <> error code <strong>{errorFilter}</strong></>}.
                        </div>
                    ) : (
                        domains.map((domain) => (
                            <DomainSection
                                key={domain}
                                domain={domain}
                                tests={testsByDomain[domain] || []}
                                results={results}
                                onRun={runSingle}
                                onRunGroup={runGroup}
                                runningGroup={runningGroup}
                                runningGlobal={runningGlobal}
                                defaultExpanded={true}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
