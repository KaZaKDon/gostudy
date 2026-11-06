import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

@Injectable()
export class SubscriptionTermsService {
    constructor(private readonly config: ConfigService) {}
    async snapshot() {
        const root = resolve(this.config.get<string>('LEGAL_DOCUMENTS_DIR', '../shared/legal'));
        const manifest = JSON.parse(await readFile(resolve(root, 'manifest.json'), 'utf8'));
        const wanted = [
            { file: 'platform-subscription-offer.md', path: '/legal/offer' },
            { file: 'tariffs.md', path: '/legal/tariffs' },
        ];
        const documents = await Promise.all(wanted.map(async ({ file, path }) => {
            const item = manifest.documents.find((d: { file: string; status: string }) => d.file === file && d.status === 'active');
            if (!item) throw new ServiceUnavailableException('Условия подписки недоступны');
            const text = await readFile(resolve(root, file), 'utf8');
            return { path, version: String(item.version), sha256: createHash('sha256').update(text).digest('hex'), text };
        }));
        const version = createHash('sha256').update(JSON.stringify(documents)).digest('hex');
        return { version, documents };
    }
}
