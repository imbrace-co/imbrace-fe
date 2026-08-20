export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type TestStatus = 'idle' | 'running' | 'pass' | 'fail' | 'skip';

export type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null' | 'any';

export interface ExpectedShape {
    [key: string]: FieldType | ExpectedShape;
}

export interface ApiTestConfig {
    id: string;
    name: string;
    domain: string;
    method: HttpMethod;
    getUrl: () => string;
    safe: boolean;
    expectedShape?: ExpectedShape;
    samplePayload?: Record<string, unknown>;
    sourceGetUrl?: string; // GET URL to fetch real example data for payload editor
    idSourceUrl?: string;  // GET URL to fetch first real item ID, replaces :id in getUrl()
    skip?: boolean;
    skipReason?: string;
    pages?: string[];      // App pages where this API is consumed, e.g. ['/teams', '/teams/:team_id/members']
    markAsFE?: boolean;    // When true, any failure (incl. 5xx/404) is classified as 'fe' — shown as 'FE' badge,
                           // counted as pass in totals. Use for endpoints whose 404/5xx are caused by stale
                           // hardcoded ids or environment-specific data, not real backend issues.
}

export interface StructureError {
    field: string;
    expected: string;
    actual: string;
}

export interface TestResult {
    id: string;
    status: TestStatus;
    statusCode?: number;
    responseTime?: number;
    error?: string;
    structureErrors?: StructureError[];
    responsePreview?: string;
    url: string;
}
