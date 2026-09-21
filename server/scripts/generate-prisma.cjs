const { spawnSync } = require('node:child_process');

const prismaCli = require.resolve('prisma/build/index.js');
const environment = {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL
        || 'postgresql://gostudy:gostudy@127.0.0.1:5432/gostudy?schema=public',
};
const result = spawnSync(
    process.execPath,
    [prismaCli, 'generate'],
    {
        env: environment,
        stdio: 'inherit',
    },
);

if (result.error) {
    throw result.error;
}

process.exit(result.status ?? 1);
