import { describe, expect, it, vi } from 'vitest';

import { ClassroomRealtimeService } from './classroom-realtime.service';

describe('ClassroomRealtimeService', () => {
    it('publishes an event only to subscribers of the selected lesson', () => {
        vi.useFakeTimers();
        const realtime = new ClassroomRealtimeService();
        const firstLesson = vi.fn();
        const secondLesson = vi.fn();
        const firstSubscription = realtime.stream(12, 7).subscribe(firstLesson);
        const secondSubscription = realtime.stream(13, 8).subscribe(secondLesson);

        firstLesson.mockClear();
        secondLesson.mockClear();
        realtime.publish(12, 'message');

        expect(firstLesson).toHaveBeenCalledWith(expect.objectContaining({
            type: 'classroom',
            data: expect.objectContaining({
                lesson_id: 12,
                reason: 'message',
            }),
        }));
        expect(secondLesson).not.toHaveBeenCalled();

        firstSubscription.unsubscribe();
        secondSubscription.unsubscribe();
        vi.useRealTimers();
    });

    it('stops delivery after the stream is closed', () => {
        vi.useFakeTimers();
        const realtime = new ClassroomRealtimeService();
        const listener = vi.fn();
        const subscription = realtime.stream(12, 7).subscribe(listener);

        subscription.unsubscribe();
        listener.mockClear();
        realtime.publish(12, 'workspace');

        expect(listener).not.toHaveBeenCalled();
        vi.useRealTimers();
    });

    it('delivers a media signal only to its recipient', () => {
        vi.useFakeTimers();
        const realtime = new ClassroomRealtimeService();
        const teacher = vi.fn();
        const student = vi.fn();
        const teacherSubscription = realtime.stream(12, 7).subscribe(teacher);
        const studentSubscription = realtime.stream(12, 9).subscribe(student);

        teacher.mockClear();
        student.mockClear();
        realtime.publishToUser(12, 9, { signal_type: 'offer' });

        expect(teacher).not.toHaveBeenCalled();
        expect(student).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                reason: 'media_signal',
                payload: { signal_type: 'offer' },
            }),
        }));

        teacherSubscription.unsubscribe();
        studentSubscription.unsubscribe();
        vi.useRealTimers();
    });
});
