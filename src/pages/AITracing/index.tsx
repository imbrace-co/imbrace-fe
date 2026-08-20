import { Button, FieldSelect, Space, Typography } from '@imbrace/ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCookie } from 'typescript-cookie';

import PageLayout from '@/components/PageLayout';
import {
    getAITracingTags,
    getAITracingTagValues,
    getAITracingTraceById,
    getAITracingTraceQLSearch,
    getAITracingTraces,
} from '@/services/api/ai-tracing';
import { ImbraceAITracing } from '@/services/axios';
import apiFetch from '@/services/axios/handler';
import { useAppSelector } from '@/redux/store';

import styles from './index.module.scss';
import { env } from '@/env';

type TraceSummary = {
    traceID: string;
    rootTraceName?: string;
    rootServiceName?: string;
    durationMs?: number;
    startTimeUnixNano?: string;
};

type TraceListResponse = {
    traces: TraceSummary[];
    metrics?: Record<string, any>;
    timestamp?: string;
};

type TempoTrace = {
    batches?: Array<{
        scopeSpans?: Array<{
            scope?: { name?: string; version?: string };
            spans?: Array<any>;
        }>;
    }>;
};

type TraceDetailsResponse = {
    trace: TempoTrace;
    timestamp?: string;
};

const getErrorMessage = (err: unknown) => {
    const anyErr = err as any;
    // axios-style
    const respData = anyErr?.response?.data;
    if (respData) {
        if (typeof respData === 'string') return respData;
        if (typeof respData?.message === 'string') return respData.message;
        if (typeof respData?.error === 'string') return respData.error;
        try {
            return JSON.stringify(respData);
        } catch {
            // ignore
        }
    }
    if (typeof anyErr?.message === 'string') return anyErr.message;
    return 'Unknown error';
};

type SpanView = {
    spanId: string;
    name: string;
    startTimeUnixNano?: string;
    endTimeUnixNano?: string;
    scope?: { name?: string; version?: string };
    attributes?: Array<{ key: string; value: any }>;
    events?: Array<{ name: string; timeUnixNano?: string }>;
};

const TIME_RANGES: Array<{ value: string; text: string }> = [
    { value: '300', text: 'Last 5 minutes' },
    { value: '900', text: 'Last 15 minutes' },
    { value: '3600', text: 'Last 1 hour' },
    { value: '21600', text: 'Last 6 hours' },
    { value: '86400', text: 'Last 24 hours' },
    { value: '259200', text: 'Last 3 days' },
    { value: '604800', text: 'Last 1 week' },
];

const LIMITS: Array<{ value: string; text: string }> = [
    { value: '10', text: '10' },
    { value: '20', text: '20' },
    { value: '50', text: '50' },
    { value: '100', text: '100' },
];

const buildTraceQLQuery = (params: { service: string; spanTag?: string; spanValue?: string }) => {
    const { service, spanTag, spanValue } = params;
    if (spanTag && spanValue) {
        return `{resource.service.name="${service}" && .${spanTag}="${spanValue}"}`;
    }
    if (spanTag) {
        return `{resource.service.name="${service}" && .${spanTag}!=nil}`;
    }
    return `{resource.service.name="${service}"}`;
};

const toMs = (nano?: string | number) => {
    if (!nano) return 0;
    const n = typeof nano === 'string' ? parseInt(nano, 10) : nano;
    if (!Number.isFinite(n)) return 0;
    return n / 1_000_000;
};

const formatTime = (nano?: string) => {
    const ms = toMs(nano);
    if (!ms) return '-';
    return new Date(ms).toLocaleTimeString();
};

const formatNanoTime = (nano?: string) => {
    const ms = toMs(nano);
    if (!ms) return '-';
    const date = new Date(ms);
    return `${date.toLocaleTimeString()}.${Math.floor(ms % 1000)}`;
};

const calculateDuration = (start?: string, end?: string) => {
    const startNs = start ? parseInt(start, 10) : 0;
    const endNs = end ? parseInt(end, 10) : 0;
    const durationNs = endNs - startNs;
    if (!Number.isFinite(durationNs) || durationNs <= 0) return '-';

    const durationMs = durationNs / 1_000_000;
    if (durationMs < 1) return `${(durationNs / 1000).toFixed(0)}μs`;
    if (durationMs < 1000) return `${durationMs.toFixed(2)}ms`;
    return `${(durationMs / 1000).toFixed(2)}s`;
};

const formatAttributeValue = (value: any) => {
    if (value === null || value === undefined) return '';
    if (value.stringValue !== undefined) return value.stringValue;
    if (value.intValue !== undefined) return value.intValue;
    if (value.doubleValue !== undefined) return Number(value.doubleValue).toFixed(2);
    if (value.boolValue !== undefined) return String(value.boolValue);
    if (value.arrayValue !== undefined) return JSON.stringify(value.arrayValue, null, 2);
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
};

const extractSpans = (trace: TempoTrace): SpanView[] => {
    if (!trace?.batches) return [];

    const spans: SpanView[] = [];
    trace.batches.forEach((batch) => {
        batch.scopeSpans?.forEach((scopeSpan) => {
            scopeSpan.spans?.forEach((span: any, idx: number) => {
                const spanId = span.spanId || `${span.name || 'span'}-${idx}-${span.startTimeUnixNano || ''}`;
                spans.push({
                    ...span,
                    spanId,
                    scope: scopeSpan.scope,
                });
            });
        });
    });

    spans.sort((a, b) => {
        const aTime = a.startTimeUnixNano ? parseInt(a.startTimeUnixNano, 10) : 0;
        const bTime = b.startTimeUnixNano ? parseInt(b.startTimeUnixNano, 10) : 0;
        return aTime - bTime;
    });

    return spans;
};

const DEFAULT_SERVICE = `ai-trace-${env.VITE_APP_ENV}`;
const POLL_INTERVAL_MS = 5000;

const AITracing = () => {
    const service = DEFAULT_SERVICE;
    const [timeRange, setTimeRange] = useState('86400');
    const [limit, setLimit] = useState('50');

    const [spanTag, setSpanTag] = useState<string>('');
    const [spanValue, setSpanValue] = useState<string>('');

    const organizationId = useAppSelector((state) => state.Account.organizationId);
    const orgId = useMemo(() => organizationId || getCookie('org_id') || '', [organizationId]);

    const [loadingTraces, setLoadingTraces] = useState(false);
    const [error, setError] = useState<string>('');
    const [metrics, setMetrics] = useState<Record<string, any>>({});
    const [lastUpdate, setLastUpdate] = useState<string>('-');
    const [traces, setTraces] = useState<TraceSummary[]>([]);

    const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
    const [selectedTraceInfo, setSelectedTraceInfo] = useState<TraceSummary | null>(null);
    const [loadingTraceDetails, setLoadingTraceDetails] = useState(false);
    const [selectedTraceSpans, setSelectedTraceSpans] = useState<SpanView[] | null>(null);

    const spansCacheRef = useRef<Map<string, { trace: TempoTrace; spans: SpanView[] }>>(new Map());
    const collapsedSpanIdsRef = useRef<Set<string>>(new Set());
    const [, forceRerender] = useState(0);

    const totalTraces = traces.length;
    const inspectedTraces = metrics?.inspectedTraces ?? 0;

    const traceIdsSignature = useMemo(() => traces.map((t) => t.traceID).join(','), [traces]);
    const pollingLabel = useMemo(() => `${Math.round(POLL_INTERVAL_MS / 1000)}s`, []);

    const fetchTraces = useCallback(async () => {
        setError('');
        setLoadingTraces(true);
        try {
            let response;
            if (spanTag && spanValue) {
                const q = buildTraceQLQuery({ service, spanTag, spanValue });
                response = await apiFetch<TraceListResponse>(
                    getAITracingTraceQLSearch.api({ q, timeRange, limit, orgId }),
                    getAITracingTraceQLSearch.method,
                    {},
                    ImbraceAITracing,
                );
            } else if (spanTag) {
                const q = buildTraceQLQuery({ service, spanTag });
                response = await apiFetch<TraceListResponse>(
                    getAITracingTraceQLSearch.api({ q, timeRange, limit, orgId }),
                    getAITracingTraceQLSearch.method,
                    {},
                    ImbraceAITracing,
                );
            } else {
                response = await apiFetch<TraceListResponse>(
                    getAITracingTraces.api({ service, timeRange, limit, orgId }),
                    getAITracingTraces.method,
                    {},
                    ImbraceAITracing,
                );
            }

            const data = response.data;
            const nextTraces = data?.traces || [];
            const nextSignature = nextTraces.map((t) => t.traceID).join(',');

            setMetrics(data?.metrics || {});
            setLastUpdate(data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString());

            setTraces((prev) => {
                const prevSignature = prev.map((t) => t.traceID).join(',');
                if (prevSignature === nextSignature && selectedTraceId) return prev;
                return nextTraces;
            });

            // keep selection if still exists
            if (selectedTraceId && !nextTraces.some((t) => t.traceID === selectedTraceId)) {
                setSelectedTraceId(null);
                setSelectedTraceInfo(null);
                setSelectedTraceSpans(null);
            } else if (selectedTraceId) {
                const info = nextTraces.find((t) => t.traceID === selectedTraceId) || null;
                setSelectedTraceInfo(info);
            }
        } catch (e) {
            setError(`Failed to load traces: ${getErrorMessage(e)}`);
        } finally {
            setLoadingTraces(false);
        }
    }, [limit, orgId, selectedTraceId, spanTag, spanValue, timeRange]);

    const loadTraceDetails = useCallback(
        async (traceId: string, info: TraceSummary | null) => {
            setSelectedTraceId(traceId);
            setSelectedTraceInfo(info);
            setSelectedTraceSpans(null);
            setLoadingTraceDetails(true);
            try {
                if (!spansCacheRef.current.has(traceId)) {
                    const { data } = await apiFetch<TraceDetailsResponse>(
                        getAITracingTraceById.api(traceId, orgId),
                        getAITracingTraceById.method,
                        {},
                        ImbraceAITracing,
                    );
                    const spans = extractSpans(data.trace);
                    spansCacheRef.current.set(traceId, { trace: data.trace, spans });
                }

                const cached = spansCacheRef.current.get(traceId);
                setSelectedTraceSpans(cached?.spans || []);
                collapsedSpanIdsRef.current = new Set((cached?.spans || []).map((s) => s.spanId)); // default collapsed
                forceRerender((x) => x + 1);
            } catch (e) {
                setSelectedTraceSpans([]);
                setError(`Failed to load trace details: ${getErrorMessage(e)}`);
            } finally {
                setLoadingTraceDetails(false);
            }
        },
        [orgId],
    );

    const toggleSpan = (spanId: string) => {
        const next = new Set(collapsedSpanIdsRef.current);
        if (next.has(spanId)) next.delete(spanId);
        else next.add(spanId);
        collapsedSpanIdsRef.current = next;
        forceRerender((x) => x + 1);
    };

    // Initial load: services + tags + traces polling
    const pollingCbRef = useRef(fetchTraces);
    useEffect(() => {
        pollingCbRef.current = fetchTraces;
    }, [fetchTraces]);

    useEffect(() => {
        if (!orgId) return;
        // first fetch immediately
        pollingCbRef.current();
        const interval = window.setInterval(() => pollingCbRef.current(), POLL_INTERVAL_MS);
        return () => window.clearInterval(interval);
    }, [orgId]);

    // refetch immediately when filters change
    useEffect(() => {
        fetchTraces();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgId, timeRange, limit, spanTag, spanValue]);

    const grafanaExploreUrl = useMemo(() => {
        if (!selectedTraceId) return '';
        // same as HTML viewer default
        const left = encodeURIComponent(JSON.stringify({ queries: [{ query: selectedTraceId }] }));
        return `http://localhost:3001/explore?left=${left}`;
    }, [selectedTraceId]);

    return (
        <PageLayout title="AI Tracing" contentHightAuto={false}>
            <div className={styles.container}>
                <div className={styles.controlsCard}>
                    <div className={styles.controlsRow}>
                        <div className={styles.controlItem}>
                            <FieldSelect
                                queryKey={['aiTracingTimeRange']}
                                fullWidth
                                formControlSx={{ width: '100%' }}
                                placeholder="Click to select"
                                label="Time Range"
                                popoverProps={{ disablePortal: false }}
                                value={timeRange}
                                closeOnSelect
                                request={async () => TIME_RANGES}
                                onChange={(val) => setTimeRange((val as string) || '86400')}
                            />
                        </div>

                        <div className={styles.controlItem}>
                            <FieldSelect
                                queryKey={['aiTracingLimit']}
                                fullWidth
                                formControlSx={{ width: '100%' }}
                                placeholder="Click to select"
                                label="Limit"
                                popoverProps={{ disablePortal: false }}
                                value={limit}
                                closeOnSelect
                                request={async () => LIMITS}
                                onChange={(val) => setLimit((val as string) || '50')}
                            />
                        </div>

                        <div className={styles.controlItem}>
                            <FieldSelect
                                queryKey={['aiTracingTags', { orgId }]}
                                fullWidth
                                formControlSx={{ width: '100%' }}
                                placeholder="Click to select"
                                label="Span Tag Filter"
                                popoverProps={{ disablePortal: false }}
                                value={spanTag}
                                closeOnSelect
                                emptyText="No tags"
                                request={async () => {
                                    const { data } = await apiFetch<{ tags: string[] }>(
                                        getAITracingTags.api({ orgId }),
                                        getAITracingTags.method,
                                        {},
                                        ImbraceAITracing,
                                    );
                                    const tags = (data?.tags || []).filter((t) => t.startsWith('ai.'));
                                    return [{ value: '', text: 'No filter' }, ...tags.map((t) => ({ value: t, text: t }))];
                                }}
                                onChange={(val) => {
                                    const next = (val as string) || '';
                                    setSpanTag(next);
                                    setSpanValue('');
                                }}
                            />
                        </div>

                        {spanTag && (
                            <div className={styles.controlItem}>
                                <FieldSelect
                                    queryKey={['aiTracingTagValues', { orgId, spanTag, timeRange }]}
                                    fullWidth
                                    formControlSx={{ width: '100%' }}
                                    placeholder="Click to select"
                                    label="Tag Value"
                                    popoverProps={{ disablePortal: false }}
                                    value={spanValue}
                                    closeOnSelect
                                    emptyText="No values"
                                    request={async () => {
                                        if (!spanTag) return [{ value: '', text: 'Any' }];
                                        const { data } = await apiFetch<{ values: any[] }>(
                                            getAITracingTagValues.api(spanTag, { timeRange, orgId }),
                                            getAITracingTagValues.method,
                                            {},
                                            ImbraceAITracing,
                                        );
                                        const values = (data?.values || [])
                                            .map((v) => (typeof v === 'string' ? v : v?.value))
                                            .filter(Boolean);
                                        return [{ value: '', text: 'Any' }, ...values.map((v) => ({ value: v, text: v }))];
                                    }}
                                    onChange={(val) => setSpanValue((val as string) || '')}
                                />
                            </div>
                        )}

                        <Space size={12} style={{ marginTop: 2 }}>
                            <Button text="Refresh Now" onClick={fetchTraces} />
                            {spanTag && (
                                <Button
                                    text="Clear Filter"
                                    variant="outlined"
                                    onClick={() => {
                                        setSpanTag('');
                                        setSpanValue('');
                                    }}
                                />
                            )}
                        </Space>

                        <div className={styles.status}>
                            <Typography variant="BodyTight" style={{ color: 'var(--color-light-6)' }}>
                                Polling: {pollingLabel}
                            </Typography>
                            <div className={`${styles.statusDot} ${loadingTraces ? styles.statusDotActive : ''}`} />
                        </div>
                    </div>
                </div>

                {error && <div className={styles.errorBox}>{error}</div>}

                <div className={styles.statsRow}>
                    <div className={styles.statCard}>
                        <Typography variant="BodyTight" style={{ color: 'var(--color-light-5)' }}>
                            Total Traces
                        </Typography>
                        <Typography variant="Heading2" style={{ marginTop: 4 }}>
                            {totalTraces}
                        </Typography>
                    </div>
                    <div className={styles.statCard}>
                        <Typography variant="BodyTight" style={{ color: 'var(--color-light-5)' }}>
                            Inspected
                        </Typography>
                        <Typography variant="Heading2" style={{ marginTop: 4 }}>
                            {inspectedTraces}
                        </Typography>
                    </div>
                    <div className={styles.statCard}>
                        <Typography variant="BodyTight" style={{ color: 'var(--color-light-5)' }}>
                            Last Update
                        </Typography>
                        <Typography variant="SubHeading2" style={{ marginTop: 6 }}>
                            {lastUpdate}
                        </Typography>
                    </div>
                </div>

                <div className={styles.tracesContainer}>
                    <div className={styles.tracesList} data-current-traces={traceIdsSignature}>
                        {loadingTraces && traces.length === 0 ? (
                            <div style={{ padding: 16 }}>
                                <Typography variant="Body" style={{ color: 'var(--color-light-6)' }}>
                                    Loading traces...
                                </Typography>
                            </div>
                        ) : traces.length === 0 ? (
                            <div style={{ padding: 16 }}>
                                <Typography variant="Body" style={{ color: 'var(--color-light-6)' }}>
                                    No traces found
                                </Typography>
                            </div>
                        ) : (
                            traces.map((t) => {
                                const selected = selectedTraceId === t.traceID;
                                return (
                                    <div
                                        key={t.traceID}
                                        className={`${styles.traceItem} ${selected ? styles.traceItemSelected : ''}`}
                                        onClick={() => loadTraceDetails(t.traceID, t)}
                                    >
                                        <div className={styles.traceNameRow}>
                                            <Typography variant="SubHeading2" style={{ color: 'var(--color-light-8)' }}>
                                                {t.rootTraceName || 'Unknown'}
                                            </Typography>
                                            <Typography variant="SubHeading2" style={{ color: 'var(--color-warning-1)' }}>
                                                {typeof t.durationMs === 'number' ? `${t.durationMs}ms` : '-'}
                                            </Typography>
                                        </div>
                                        <div className={styles.traceMetaRow}>
                                            <Typography className={styles.mono} variant="BodyTight" style={{ color: 'var(--color-primary-1)' }}>
                                                {(t.traceID || '').slice(0, 16)}...
                                            </Typography>
                                            <Typography variant="BodyTight" style={{ color: 'var(--color-light-6)' }}>
                                                {formatTime(t.startTimeUnixNano)}
                                            </Typography>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className={styles.spansPanel}>
                        {!selectedTraceId ? (
                            traces.length > 0 ? (
                                <div className={styles.emptyPanel}>
                                    <Typography variant="Body">← Select a trace to view spans</Typography>
                                </div>
                            ) : null
                        ) : loadingTraceDetails ? (
                            <div className={styles.emptyPanel}>
                                <Typography variant="Body" style={{ color: 'var(--color-light-6)' }}>
                                    Loading trace details...
                                </Typography>
                            </div>
                        ) : !selectedTraceSpans || selectedTraceSpans.length === 0 ? (
                            <div className={styles.emptyPanel}>
                                <Typography variant="Body" style={{ color: 'var(--color-light-6)' }}>
                                    No spans found for this trace
                                </Typography>
                            </div>
                        ) : (
                            <Space direction="vertical" size={12} style={{ width: '100%', alignItems: 'stretch' }}>
                                <Typography variant="Heading2">Trace Details</Typography>

                                <div className={styles.section}>
                                    <div className={styles.sectionTitle}>Overview</div>
                                    <div className={styles.detailRow}>
                                        <div className={styles.detailLabel}>
                                            <Typography variant="BodyTight">Trace ID:</Typography>
                                        </div>
                                        <div className={`${styles.detailValue} ${styles.mono}`}>
                                            <Typography variant="BodyTight" className={styles.mono}>
                                                {selectedTraceId}
                                            </Typography>
                                        </div>
                                    </div>
                                    <div className={styles.detailRow}>
                                        <div className={styles.detailLabel}>
                                            <Typography variant="BodyTight">Service:</Typography>
                                        </div>
                                        <div className={styles.detailValue}>
                                            <Typography variant="BodyTight" className={styles.mono}>
                                                {selectedTraceInfo?.rootServiceName || '-'}
                                            </Typography>
                                        </div>
                                    </div>
                                    <div className={styles.detailRow}>
                                        <div className={styles.detailLabel}>
                                            <Typography variant="BodyTight">Operation:</Typography>
                                        </div>
                                        <div className={styles.detailValue}>
                                            <Typography variant="BodyTight" className={styles.mono}>
                                                {selectedTraceInfo?.rootTraceName || '-'}
                                            </Typography>
                                        </div>
                                    </div>
                                    <div className={styles.detailRow}>
                                        <div className={styles.detailLabel}>
                                            <Typography variant="BodyTight">Duration:</Typography>
                                        </div>
                                        <div className={styles.detailValue}>
                                            <Typography variant="BodyTight" className={styles.mono}>
                                                {typeof selectedTraceInfo?.durationMs === 'number'
                                                    ? `${selectedTraceInfo.durationMs}ms (${(selectedTraceInfo.durationMs / 1000).toFixed(2)}s)`
                                                    : '-'}
                                            </Typography>
                                        </div>
                                    </div>
                                    <div className={styles.detailRow}>
                                        <div className={styles.detailLabel}>
                                            <Typography variant="BodyTight">Start Time:</Typography>
                                        </div>
                                        <div className={styles.detailValue}>
                                            <Typography variant="BodyTight" className={styles.mono}>
                                                {selectedTraceInfo?.startTimeUnixNano
                                                    ? new Date(toMs(selectedTraceInfo.startTimeUnixNano)).toLocaleString()
                                                    : '-'}
                                            </Typography>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.section}>
                                    <div className={styles.sectionTitle}>Spans ({selectedTraceSpans.length})</div>

                                    {selectedTraceSpans.map((span) => {
                                        const collapsed = collapsedSpanIdsRef.current.has(span.spanId);
                                        return (
                                            <div key={span.spanId} className={styles.spanItem} onClick={() => toggleSpan(span.spanId)}>
                                                <div className={styles.spanHeader}>
                                                    <div className={styles.spanName}>
                                                        <span
                                                            className={`${styles.toggleChevron} ${
                                                                collapsed ? styles.toggleChevronCollapsed : ''
                                                            }`}
                                                        >
                                                            ▼
                                                        </span>
                                                        <span>{span.name}</span>
                                                    </div>
                                                    <Typography variant="BodyTight" style={{ color: 'var(--color-warning-1)' }}>
                                                        {calculateDuration(span.startTimeUnixNano, span.endTimeUnixNano)}
                                                    </Typography>
                                                </div>

                                                {!collapsed && (
                                                    <div className={styles.spanDetails}>
                                                        <Typography variant="BodyTight" style={{ color: 'var(--color-light-6)' }}>
                                                            {span.scope?.name || 'unknown'}
                                                            {span.scope?.version ? ` v${span.scope.version}` : ''}
                                                        </Typography>

                                                        {Array.isArray(span.attributes) && span.attributes.length > 0 && (
                                                            <div style={{ marginTop: 8 }}>
                                                                {span.attributes.map((attr, idx) => (
                                                                    <div key={`${attr.key}-${idx}`} className={styles.attrRow}>
                                                                        <span className={styles.attrKey}>{attr.key}:</span>
                                                                        <span className={`${styles.attrValue} ${styles.mono}`}>
                                                                            {formatAttributeValue(attr.value)}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {Array.isArray(span.events) && span.events.length > 0 && (
                                                            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--color-light-2)' }}>
                                                                {span.events.map((ev, idx) => (
                                                                    <div key={`${ev.name}-${idx}`} className={styles.attrRow}>
                                                                        <span className={styles.attrKey} style={{ color: 'var(--color-green-1)' }}>
                                                                            {ev.name}
                                                                        </span>
                                                                        <span className={styles.attrValue}>{formatNanoTime(ev.timeUnixNano)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </Space>
                        )}
                    </div>
                </div>
            </div>
        </PageLayout>
    );
};

export default AITracing;


