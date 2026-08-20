declare global {
    interface Window {
        readonly env: NodeJS.Process['env'];
    }
}

export const env = { ...import.meta.env, ...window.env };

(async () => {
    try {
        const apiEndpoint = '/config';
        console.log('env.ts: Fetching fromm :', apiEndpoint);

        const response = await fetch(apiEndpoint);
        if (!response.ok) {
            throw new Error(`Failed to load environment: ${response.status}`);
        }
        const apiEnv = await response.json();

        Object.assign(env, apiEnv);
        console.log('env.ts: Updated env', env); // Log final env

        Object.defineProperty(window, 'env', {
            value: env,
            writable: false,
        });
    } catch (error) {
        console.error('Error loading environment from API:', error);
    }
})();