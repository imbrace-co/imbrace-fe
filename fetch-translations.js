import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { setTimeout as sleep } from 'timers/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supported languages — must match the files published by imbrace-translations-public.
const languages = ['en', 'cn', 'zh'];

// Translations are published to GitHub Pages from imbraceltd/imbrace-translations-public.
// To update a key: edit the source in that repo and push — Pages rebuilds, and the
// next build/start here picks up the new copy. Override with TRANSLATIONS_BASE_URL.
const jsonBaseUrl = process.env.TRANSLATIONS_BASE_URL || 'https://imbraceltd.github.io/imbrace-translations-public';

const localesDir = path.join(__dirname, 'public/locale');
if (!fs.existsSync(localesDir)) {
    fs.mkdirSync(localesDir, { recursive: true });
}

async function downloadToFile(url, filePath, { retries = 2 } = {}) {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
            if (!res.ok) {
                throw new Error(`HTTP ${res.status} ${res.statusText}`);
            }
            const buffer = Buffer.from(await res.arrayBuffer());
            await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
            await fs.promises.writeFile(filePath, buffer);
            return;
        } catch (error) {
            lastError = error;
            if (attempt < retries) {
                await sleep(500 * (attempt + 1));
            }
        }
    }
    throw lastError;
}

console.log(`Fetching translations from ${jsonBaseUrl}`);

for (const lang of languages) {
    const jsonUrl = `${jsonBaseUrl}/${lang}.json`;
    const localPath = path.join(localesDir, `${lang}.json`);
    try {
        await downloadToFile(jsonUrl, localPath);
        console.log(`  ✓ ${lang}.json`);
    } catch (error) {
        // Fall back to the committed copy when offline / Pages is unreachable, so a
        // clean checkout can still build without network access. Only fail hard when
        // there is no local copy to fall back to.
        if (fs.existsSync(localPath)) {
            console.warn(`  ! ${lang}.json fetch failed (${error?.message || String(error)}); using committed copy.`);
        } else {
            console.error(`  ✗ ${lang}.json fetch failed and no committed copy exists: ${error?.message || String(error)}`);
            process.exit(1);
        }
    }
}
