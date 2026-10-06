import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const DIRECT_LESSON_PAYMENT_NOTICE =
    'Оплата занятий производится напрямую между учеником и преподавателем. GoStudy не принимает оплату за уроки и не удерживает комиссию с занятий.';

@Injectable()
export class TeacherFinancePolicyService {
    private readonly lessonSettlementsEnabled: boolean;

    constructor(config: ConfigService) {
        const configured = config.get('LESSON_SETTLEMENTS_ENABLED', false);

        this.lessonSettlementsEnabled = ['true', '1', 'yes', 'on'].includes(
            String(configured).trim().toLowerCase(),
        );
    }

    isLessonSettlementsEnabled(): boolean {
        return this.lessonSettlementsEnabled;
    }

    publicState() {
        return {
            enabled: this.lessonSettlementsEnabled,
            mode: this.lessonSettlementsEnabled ? 'platform' : 'direct',
            notice: this.lessonSettlementsEnabled
                ? 'Расчёты по занятиям проводятся через GoStudy.'
                : DIRECT_LESSON_PAYMENT_NOTICE,
        } as const;
    }
}
