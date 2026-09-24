const { ESLint } = require('eslint');
const path = require('path');

const removeIgnoredFiles = async (files) => {
    const eslint = new ESLint();
    const isIgnored = await Promise.all(
        files.map((file) => {
            return eslint.isPathIgnored(file);
        }),
    );
    const filteredFiles = files.filter((_, i) => !isIgnored[i]);
    return filteredFiles.join(' ');
};

const typeCheck = (files) => {
    const cwd = process.cwd();
    const relativePaths = files.map((file) => path.relative(cwd, file)).join(' ');
    return `tsc-files --noEmit ${relativePaths}`;
};

module.exports = {
    '**/*.ts?(x)': (files) => typeCheck(files),
    '**/*.{ts,tsx,js,jsx}': async (files) => {
        try {
            const filesToLint = await removeIgnoredFiles(files);
            return [`eslint --max-warnings=0 ${filesToLint}`];
        } catch (error) {
            console.log(error);
        }
    },
    'src/**/*.{js,ts,tsx,json,css,scss,md}': ['prettier --write'],
};
