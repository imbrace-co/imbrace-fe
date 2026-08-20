import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import useDebounce from '@/hooks/useDebounce';
import { schemaQueries } from '@/services/queries/schema';

import type { DocumentSchema } from './types';

/**
 * Live duplicate-name check for schema (Document Model) name inputs.
 * Debounces the typed name 300ms, queries /schemas?search=<name> (server-side
 * case-insensitive match) and returns the schema whose name equals the typed
 * one exactly (case-insensitive), or null. `excludeId` skips the schema being
 * edited so its own current name never counts as a duplicate.
 */
export const useSchemaNameConflict = (
    name: string,
    { excludeId, enabled = true }: { excludeId?: string; enabled?: boolean } = {},
): DocumentSchema | null => {
    const debouncedName = useDebounce(name, 300);
    const normalized = debouncedName.trim().toLowerCase();

    const query = useQuery({
        ...schemaQueries.schemas({ search: debouncedName.trim() }),
        enabled: enabled && !!normalized,
    });

    return useMemo(() => {
        if (!enabled || !normalized) return null;
        return (
            (query.data ?? []).find((s) => {
                const sid = s._id ?? s.id;
                return (
                    (s.name ?? '').trim().toLowerCase() === normalized &&
                    (!excludeId || (sid !== excludeId && s.id !== excludeId))
                );
            }) ?? null
        );
    }, [enabled, normalized, query.data, excludeId]);
};
