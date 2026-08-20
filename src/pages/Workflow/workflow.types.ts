export declare type CodexData = {
    categories?: string[];
    subcategories?: {
        [category: string]: string[];
    };
    alias?: string[];
};

export interface NodeTypeBaseDescription {
    displayName: string;
    name: string;
    icon?: string;
    group: string[];
    description: string;
    documentationUrl?: string;
    subtitle?: string;
    defaultVersion?: number;
    codex?: CodexData;
    presetId?: string;
}
export type NodeParameterValue = string | number | boolean | undefined | null;

export interface NodeParameters {
    [key: string]: NodeParameterValue | NodeParameters | NodeParameterValue[] | NodeParameters[];
}
export declare type NodePropertyTypes =
    | 'boolean'
    | 'collection'
    | 'color'
    | 'dateTime'
    | 'fixedCollection'
    | 'hidden'
    | 'json'
    | 'notice'
    | 'multiOptions'
    | 'number'
    | 'options'
    | 'string';
export declare type CodeAutocompleteTypes = 'function' | 'functionItem';
export declare type EditorTypes = 'code' | 'json';

export interface IWorkflowRequestOperationPaginationBase {
    type: string;
    properties: {
        [key: string]: string | number;
    };
}
export interface IWorkflowRequestOperationPaginationOffset extends IWorkflowRequestOperationPaginationBase {
    type: 'offset';
    properties: {
        limitParameter: string;
        offsetParameter: string;
        pageSize: number;
        rootProperty?: string;
        type: 'body' | 'query';
    };
}
export interface ILoadOptions {
    routing?: {
        operations?: unknown;
        output?: unknown;
        request?: unknown;
    };
}

export interface NodePropertyTypeOptions {
    alwaysOpenEditWindow?: boolean;
    codeAutocomplete?: CodeAutocompleteTypes;
    editor?: EditorTypes;
    loadOptionsDependsOn?: string[];
    loadOptionsMethod?: string;
    loadOptions?: ILoadOptions;
    maxValue?: number;
    minValue?: number;
    multipleValues?: boolean;
    multipleValueButtonText?: string;
    numberPrecision?: number;
    password?: boolean;
    rows?: number;
    showAlpha?: boolean;
    sortable?: boolean;
    [key: string]: unknown;
}
export interface DisplayOptions {
    hide?: {
        [key: string]: NodeParameterValue[] | undefined;
    };
    show?: {
        [key: string]: NodeParameterValue[] | undefined;
    };
}
export interface NodePropertyRouting {
    operations?: unknown;
    output?: unknown;
    request?: unknown;
    send?: unknown;
}
export interface NodePropertyOptions {
    name: string;
    value: string | number | boolean;
    action?: string;
    description?: string;
    routing?: NodePropertyRouting;
}
export interface NodePropertyCollection {
    displayName: string;
    name: string;
    values: NodeProperties[];
}
export interface CredentialTestRequest {
    request: unknown;
    rules?: unknown[];
}
export interface NodeCredentialDescription {
    name: string;
    required?: boolean;
    displayOptions?: DisplayOptions;
    testedBy?: CredentialTestRequest | string;
}
export interface NodeProperties {
    displayName: string;
    name: string;
    type: NodePropertyTypes;
    typeOptions?: NodePropertyTypeOptions;
    default: NodeParameterValue | NodeParameters | NodeParameters[] | NodeParameterValue[];
    description?: string;
    hint?: string;
    displayOptions?: DisplayOptions;
    options?: Array<NodePropertyOptions | NodeProperties | NodePropertyCollection>;
    placeholder?: string;
    isNodeSetting?: boolean;
    noDataExpression?: boolean;
    required?: boolean;
    routing?: NodePropertyRouting;
}

export interface NodeTypeDescription extends NodeTypeBaseDescription {
    version: number;
    defaults: NodeParameters;
    eventTriggerDescription?: string;
    activationMessage?: string;
    inputs: string[];
    inputNames?: string[];
    outputs: string[];
    outputNames?: string[];
    properties: NodeProperties[];
    credentials?: NodeCredentialDescription[];
    maxNodes?: number;
    polling?: boolean;
    requestDefaults?: unknown;
    requestOperations?: unknown;
    hooks?: {
        [key: string]: unknown[] | undefined;
        activate?: unknown[];
        deactivate?: unknown[];
    };
    webhooks?: unknown[];
    translation?: {
        [key: string]: object;
    };
}

export interface NodeIssues {
    execution?: boolean;
    credentials?: Record<string, string[]>;
    parameters?: Record<string, string[]>;
    typeUnknown?: boolean;
    [key: string]: undefined | boolean | Record<string, string[]>;
}
export interface NodeCredentialsDetails {
    id: string | null;
    name: string;
}
export interface NodeCredentials {
    [key: string]: NodeCredentialsDetails;
}
export interface Node {
    name: string;
    typeVersion: number;
    type: string;
    position: [number, number];
    disabled?: boolean;
    notes?: string;
    notesInFlow?: boolean;
    retryOnFail?: boolean;
    maxTries?: number;
    waitBetweenTries?: number;
    alwaysOutputData?: boolean;
    executeOnce?: boolean;
    continueOnFail?: boolean;
    parameters: NodeParameters;
    credentials?: NodeCredentials;
    webhookId?: string;
}

/** custom react flow node type */
export interface RFNode extends Node {
    icon?: string;
    defaults?: NodeParameters;
    label?: string;
    handleCount?: number;
    isPlacement?: boolean;
    issues?: NodeIssues;
}

export interface CredentialType {
    name: string;
    displayName: string;
    icon?: string;
    extends?: string[];
    properties: NodeProperties[];
    documentationUrl?: string;
    __overwrittenProperties?: string[];
    authenticate?: IAuthenticate;
    test?: unknown;
}
export interface IAuthenticateBase {
    type: string;
    properties: {
        [key: string]: string;
    };
}
export interface IAuthenticateBasicAuth extends IAuthenticateBase {
    type: 'basicAuth';
    properties: {
        userPropertyName?: string;
        passwordPropertyName?: string;
    };
}
export interface IAuthenticateBearer extends IAuthenticateBase {
    type: 'bearer';
    properties: {
        tokenPropertyName?: string;
    };
}
export interface IAuthenticateHeaderAuth extends IAuthenticateBase {
    type: 'headerAuth';
    properties: {
        name: string;
        value: string;
    };
}
export interface IAuthenticateQueryAuth extends IAuthenticateBase {
    type: 'queryAuth';
    properties: {
        key: string;
        value: string;
    };
}

export declare type IHttpRequestMethods = 'DELETE' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT';
export declare type GenericValue = string | object | number | boolean | undefined | null;
export interface IDataObject {
    [key: string]: GenericValue | IDataObject | GenericValue[] | IDataObject[];
}
export declare type IWorkflowHttpResponse = IDataObject | Buffer | GenericValue | GenericValue[] | null;
export interface IWorkflowHttpFullResponse {
    body: IWorkflowHttpResponse;
    headers: IDataObject;
    statusCode: number;
    statusMessage?: string;
}
export declare type IExecuteResponsePromiseData = IDataObject | IWorkflowHttpFullResponse;
export declare type CredentialInformation = string | number | boolean | IDataObject;
export interface ICredentialDataDecryptedObject {
    [key: string]: CredentialInformation;
}
export interface IHttpRequestOptions {
    url: string;
    baseURL?: string;
    headers?: IDataObject;
    method?: IHttpRequestMethods;
    body?: FormData | GenericValue | GenericValue[] | Buffer | URLSearchParams;
    qs?: IDataObject;
    arrayFormat?: 'indices' | 'brackets' | 'repeat' | 'comma';
    auth?: {
        username: string;
        password: string;
    };
    disableFollowRedirect?: boolean;
    encoding?: 'arraybuffer' | 'blob' | 'document' | 'json' | 'text' | 'stream';
    skipSslCertificateValidation?: boolean;
    returnFullResponse?: boolean;
    ignoreHttpStatusErrors?: boolean;
    proxy?: {
        host: string;
        port: number;
        auth?: {
            username: string;
            password: string;
        };
        protocol?: string;
    };
    timeout?: number;
    json?: boolean;
}
export declare type IAuthenticate =
    | ((credentials: ICredentialDataDecryptedObject, requestOptions: IHttpRequestOptions) => Promise<IHttpRequestOptions>)
    | IAuthenticateBasicAuth
    | IAuthenticateBearer
    | IAuthenticateHeaderAuth
    | IAuthenticateQueryAuth;

export interface CredentialNodeAccess {
    nodeType: string;
    user?: string;
    date?: Date;
}
export interface CredentialsDecrypted {
    id: string | number;
    name: string;
    type: string;
    nodesAccess: CredentialNodeAccess[];
    data?: ICredentialDataDecryptedObject;
}
export interface CredentialsEncrypted {
    id?: string | number;
    name: string;
    type: string;
    nodesAccess: CredentialNodeAccess[];
    data?: string;
}

export interface CredentialsResponse extends CredentialsEncrypted {
    id: string;
    createdAt: number | string;
    updatedAt: number | string;
}
export interface NodeCredentialsDetails {
    id: string | null;
    name: string;
}
export interface Workflow {
    active: boolean;
    connections: Record<string, { main: { node: string; type: string; index: number }[][] }>;
    createdAt?: string;
    id: string;
    name: string;
    nodes: RFNode[];
    settings: Record<string, unknown>;
    staticData?: null;
    tags: { id: string; name: string }[];
    updatedAt?: string;
}

export interface ParameterDependencies {
    [key: string]: string[];
}
