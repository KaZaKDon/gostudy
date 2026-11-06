import { Injectable } from '@nestjs/common';
import { fiscalEnvelope } from './subscription-receipt';

@Injectable()
export class RobokassaFiscalClient {
    async send(operation: 'Attach' | 'Status', payload: unknown, password1: string): Promise<Record<string, unknown>> {
        const response = await fetch(`https://ws.roboxchange.com/RoboFiscal/Receipt/${operation}`, {
            method: 'POST', headers: { 'Content-Type': 'text/plain; charset=utf-8', Accept: 'application/json' },
            body: fiscalEnvelope(payload, password1), signal: AbortSignal.timeout(15000), redirect: 'error',
        });
        // Never include gateway response bodies, email, passwords or the signed envelope in logs.
        if (!response.ok) throw new Error('Fiscal HTTP failure');
        const value: unknown = await response.json();
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid fiscal response');
        return value as Record<string, unknown>;
    }
}
