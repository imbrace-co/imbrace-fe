import type { Transition } from 'history';
import { useCallback } from 'react';

import { dialog } from '@/components/Dialog';

import { useBlocker } from './useBlocker';

interface PromptObj {
    title: string;
    content: string;
    confirmText: string;
    cancelText: string;
    saveExitFn: (tx?: Transition) => Promise<boolean | void>;
    discardFn: () => Promise<void>;
}

export default function usePrompt(
    promptObj: PromptObj,
    when = true,
    onConfirm?: () => boolean | void,
    shouldPrompt?: (tx: Transition) => Promise<boolean> | boolean,
) {
    const blocker = useCallback(
        async (tx: Transition) => {
            if (shouldPrompt && !(await shouldPrompt(tx))) {
                return tx.retry();
            }

            // If there’s an error in the form, this modal will not show up
            // but discard the changes directly and proceed leaving this page
            if (onConfirm && !onConfirm()) {
                return tx.retry();
            }

            const result = await new Promise<boolean>((resolve) => {
                dialog({
                    title: promptObj.title,
                    content: promptObj.content,
                    onConfirm: async () => {
                        const success = await promptObj.saveExitFn(tx);
                        if (!success) {
                            return;
                        }
                        resolve(true);
                    },
                    onClose: async () => {
                        await promptObj.discardFn();
                        resolve(true);
                    },
                    // onClose: () => {
                    //     resolve(true);
                    // },
                    confirmText: promptObj.confirmText,
                    cancelText: promptObj.cancelText,
                });
            });

            if (result) {
                tx.retry();
            }
        },
        [promptObj, onConfirm, shouldPrompt],
    );

    useBlocker(blocker, when);
}
