import type { ExpectedShape, FieldType, StructureError } from './types';

function getActualType(value: unknown): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
}

function matchesType(value: unknown, expected: FieldType): boolean {
    if (expected === 'any') return true;
    return getActualType(value) === expected;
}

export function validateShape(
    data: unknown,
    shape: ExpectedShape,
    prefix = '',
): StructureError[] {
    const errors: StructureError[] = [];

    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        errors.push({
            field: prefix || 'root',
            expected: 'object',
            actual: getActualType(data),
        });
        return errors;
    }

    const obj = data as Record<string, unknown>;

    for (const [key, expectedType] of Object.entries(shape)) {
        const fieldPath = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];

        if (value === undefined) {
            errors.push({ field: fieldPath, expected: String(expectedType), actual: 'missing' });
            continue;
        }

        if (typeof expectedType === 'object') {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                errors.push(...validateShape(value, expectedType as ExpectedShape, fieldPath));
            } else {
                errors.push({ field: fieldPath, expected: 'object', actual: getActualType(value) });
            }
        } else {
            if (!matchesType(value, expectedType as FieldType)) {
                errors.push({ field: fieldPath, expected: expectedType as string, actual: getActualType(value) });
            }
        }
    }

    return errors;
}

export function extractPreview(data: unknown): string {
    try {
        return JSON.stringify(data, null, 2).slice(0, 500);
    } catch {
        return String(data).slice(0, 500);
    }
}
