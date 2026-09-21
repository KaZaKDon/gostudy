const { Test } = require('@nestjs/testing');

process.env.DATABASE_URL = process.env.DATABASE_URL
    || 'postgresql://gostudy:gostudy@127.0.0.1:5432/gostudy?schema=public';

const { AppModule } = require('../dist/app.module');
const {
    PrismaService,
} = require('../dist/common/prisma/prisma.service');

async function checkModuleGraph() {
    const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
    })
        .overrideProvider(PrismaService)
        .useValue({})
        .compile();

    moduleRef.get(AppModule, { strict: false });
    await moduleRef.close();
    process.stdout.write('NestJS module dependency graph: OK\n');
}

checkModuleGraph().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
