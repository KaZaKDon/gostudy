import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadClassroomIceServers } from '../../../../src/pages/Classroom/api/classroomMedia.js';

afterEach(() => vi.unstubAllGlobals());

describe('classroom media configuration client', () => {
    it('fetches fresh configuration using the session and caller cancellation signal', async () => {
        vi.stubGlobal('sessionStorage', { getItem: () => 'test-session' });
        const iceServers = [{ urls: 'turn:example.com:3478', username: 'temporary', credential: 'temporary' }];
        const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, ice_servers: iceServers })));
        vi.stubGlobal('fetch', fetch);
        const signal = new AbortController().signal;
        await expect(loadClassroomIceServers(12, signal)).resolves.toEqual(iceServers);
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/classroom/media-config?lesson_id=12'), {
            method: 'GET', headers: { 'Content-Type': 'application/json', 'X-Auth-Token': 'test-session' },
            body: undefined, signal,
        });
    });

    it('surfaces authorization failures rather than returning fallback credentials', async () => {
        vi.stubGlobal('sessionStorage', { getItem: () => '' });
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
            JSON.stringify({ success: false, message: 'Урок не найден' }), { status: 404 },
        )));
        await expect(loadClassroomIceServers(12)).rejects.toThrow('Урок не найден');
    });

    it('rejects a response without ICE configuration', async () => {
        vi.stubGlobal('sessionStorage', { getItem: () => '' });
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }))));
        await expect(loadClassroomIceServers(12)).rejects.toThrow('Видеосвязь временно недоступна');
    });

    it('propagates cancellation so leaving the room cannot return delayed credentials', async () => {
        vi.stubGlobal('sessionStorage', { getItem: () => 'test-session' });
        vi.stubGlobal('fetch', vi.fn((_url, { signal }) => new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
        })));
        const controller = new AbortController();
        const pending = loadClassroomIceServers(12, controller.signal);
        controller.abort();
        await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    });
});
