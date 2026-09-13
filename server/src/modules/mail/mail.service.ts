import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private readonly transporter: Transporter | null;

    constructor(private readonly config: ConfigService) {
        const host = config.get<string>('SMTP_HOST', '').trim();
        const username = config.get<string>('SMTP_USERNAME', '').trim();
        const password = config.get<string>('SMTP_PASSWORD', '');

        this.transporter = host && username && password
            ? nodemailer.createTransport({
                host,
                port: Number(config.get('SMTP_PORT', 587)),
                secure: config.get<string>('SMTP_SECURE', 'false') === 'true',
                auth: {
                    user: username,
                    pass: password,
                },
            })
            : null;
    }

    async sendVerificationEmail(
        email: string,
        displayName: string,
        verificationUrl: string,
    ): Promise<boolean> {
        if (!this.transporter) {
            if (this.config.get('NODE_ENV') === 'development') {
                this.logger.log(
                    `Локальный режим: ссылка подтверждения для ${email}: ${verificationUrl}`,
                );
            } else {
                this.logger.warn(
                    'SMTP не настроен. Письмо подтверждения не отправлено.',
                );
            }
            return false;
        }

        try {
            await this.transporter.sendMail({
                from: this.getFrom(),
                to: email,
                subject: 'Подтвердите электронную почту — GoStudy',
                text: [
                    `Здравствуйте, ${displayName}!`,
                    '',
                    'Подтвердите электронную почту для завершения регистрации:',
                    verificationUrl,
                    '',
                    'Ссылка действует 24 часа.',
                    `Поддержка: ${this.config.get('SUPPORT_EMAIL')}`,
                ].join('\n'),
                html: [
                    `<p>Здравствуйте, ${this.escapeHtml(displayName)}!</p>`,
                    '<p>Подтвердите электронную почту для завершения регистрации GoStudy.</p>',
                    `<p><a href="${this.escapeHtml(verificationUrl)}">Подтвердить почту</a></p>`,
                    '<p>Ссылка действует 24 часа.</p>',
                ].join(''),
            });

            return true;
        } catch (error) {
            this.logger.error(
                `Не удалось отправить письмо на ${email}`,
                error instanceof Error ? error.stack : undefined,
            );
            return false;
        }
    }

    async sendPasswordResetEmail(
        email: string,
        displayName: string,
        resetUrl: string,
        expiresInMinutes: number,
    ): Promise<boolean> {
        if (!this.transporter) {
            if (this.config.get('NODE_ENV') === 'development') {
                this.logger.log(
                    `Локальный режим: ссылка восстановления для ${email}: ${resetUrl}`,
                );
            } else {
                this.logger.warn(
                    'SMTP не настроен. Письмо восстановления не отправлено.',
                );
            }
            return false;
        }

        try {
            await this.transporter.sendMail({
                from: this.getFrom(),
                to: email,
                subject: 'Восстановление пароля — GoStudy',
                text: [
                    `Здравствуйте, ${displayName}!`,
                    '',
                    'Для установки нового пароля перейдите по ссылке:',
                    resetUrl,
                    '',
                    `Ссылка действует ${expiresInMinutes} минут.`,
                    'Если вы не запрашивали восстановление, просто проигнорируйте это письмо.',
                    `Поддержка: ${this.config.get('SUPPORT_EMAIL')}`,
                ].join('\n'),
                html: [
                    `<p>Здравствуйте, ${this.escapeHtml(displayName)}!</p>`,
                    '<p>Для установки нового пароля GoStudy перейдите по ссылке:</p>',
                    `<p><a href="${this.escapeHtml(resetUrl)}">Установить новый пароль</a></p>`,
                    `<p>Ссылка действует ${expiresInMinutes} минут.</p>`,
                    '<p>Если вы не запрашивали восстановление, просто проигнорируйте это письмо.</p>',
                ].join(''),
            });

            return true;
        } catch (error) {
            this.logger.error(
                `Не удалось отправить письмо восстановления на ${email}`,
                error instanceof Error ? error.stack : undefined,
            );
            return false;
        }
    }

    private getFrom(): string {
        return `GoStudy <${this.config.get<string>('MAIL_FROM', 'noreply@gostudyonline.ru')}>`;
    }

    private escapeHtml(value: string): string {
        return value
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }
}
