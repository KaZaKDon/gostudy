import {
    Injectable,
    type MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';

export type ClassroomRealtimeReason =
    | 'presence'
    | 'lesson'
    | 'message'
    | 'files'
    | 'workspace'
    | 'board'
    | 'media_signal';

type ClassroomRealtimeEvent = {
    lesson_id: number;
    reason: ClassroomRealtimeReason | 'connected' | 'heartbeat';
    emitted_at: string;
    payload?: unknown;
};

type Listener = {
    userId: number;
    notify: (event: ClassroomRealtimeEvent) => void;
};

const HEARTBEAT_INTERVAL_MS = 20_000;

@Injectable()
export class ClassroomRealtimeService {
    private readonly listeners = new Map<number, Set<Listener>>();

    stream(lessonId: number, userId: number): Observable<MessageEvent> {
        return new Observable<MessageEvent>((subscriber) => {
            const listener: Listener = {
                userId,
                notify: (event) => subscriber.next({
                    type: 'classroom',
                    data: event,
                }),
            };
            const room = this.listeners.get(lessonId) ?? new Set<Listener>();
            room.add(listener);
            this.listeners.set(lessonId, room);

            listener.notify(this.event(lessonId, 'connected'));
            const heartbeat = setInterval(() => {
                listener.notify(this.event(lessonId, 'heartbeat'));
            }, HEARTBEAT_INTERVAL_MS);

            return () => {
                clearInterval(heartbeat);
                room.delete(listener);

                if (room.size === 0) {
                    this.listeners.delete(lessonId);
                }
            };
        });
    }

    publish(
        lessonId: number,
        reason: ClassroomRealtimeReason,
        payload?: unknown,
    ): void {
        const event = this.event(lessonId, reason, payload);

        for (const listener of this.listeners.get(lessonId) ?? []) {
            listener.notify(event);
        }
    }

    publishToUser(lessonId: number, userId: number, payload: unknown): void {
        const event = this.event(lessonId, 'media_signal', payload);

        for (const listener of this.listeners.get(lessonId) ?? []) {
            if (listener.userId === userId) {
                listener.notify(event);
            }
        }
    }

    private event(
        lessonId: number,
        reason: ClassroomRealtimeEvent['reason'],
        payload?: unknown,
    ): ClassroomRealtimeEvent {
        return {
            lesson_id: lessonId,
            reason,
            emitted_at: new Date().toISOString(),
            ...(payload === undefined ? {} : { payload }),
        };
    }
}
