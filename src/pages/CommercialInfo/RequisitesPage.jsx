import { Building2, CalendarDays, Mail, ScrollText } from 'lucide-react';

import { PLATFORM_IDENTITY } from '../../config/platformIdentity.js';
import {
    PublicInfoLayout,
    PublicInfoSection,
} from './PublicInfoLayout.jsx';

const REQUISITES = [
    ['Наименование', PLATFORM_IDENTITY.legalName],
    ['ИНН', PLATFORM_IDENTITY.inn],
    ['ОГРНИП', PLATFORM_IDENTITY.ogrnip],
    ['Дата государственной регистрации', PLATFORM_IDENTITY.registrationDate],
];

export function RequisitesPage() {
    return (
        <PublicInfoLayout
            eyebrow="GoStudy · сведения о продавце"
            title="Реквизиты"
            lead="Продавцом подписки на доступ к платформе GoStudy является зарегистрированный в Российской Федерации индивидуальный предприниматель."
        >
            <PublicInfoSection icon={Building2} title="Сведения об операторе" accent>
                <dl className="public-info-details">
                    {REQUISITES.map(([label, value]) => (
                        <div key={label}>
                            <dt>{label}</dt>
                            <dd>{value}</dd>
                        </div>
                    ))}
                </dl>
            </PublicInfoSection>

            <PublicInfoSection icon={ScrollText} title="Регистрация">
                <p>{PLATFORM_IDENTITY.registeringAuthority}.</p>
                <p>
                    Основной вид деятельности по ОКВЭД 62.01 — разработка
                    компьютерного программного обеспечения.
                </p>
            </PublicInfoSection>

            <PublicInfoSection icon={Mail} title="Контакты">
                <p>
                    Электронная почта для обращений пользователей, вопросов
                    по подписке и юридически значимых сообщений:{' '}
                    <a href={`mailto:${PLATFORM_IDENTITY.supportEmail}`}>
                        {PLATFORM_IDENTITY.supportEmail}
                    </a>
                    .
                </p>
            </PublicInfoSection>

            <PublicInfoSection icon={CalendarDays} title="Платёжная модель GoStudy">
                <p>
                    {PLATFORM_IDENTITY.shortLegalName} продаёт пользователю
                    доступ к программной платформе по подписке. GoStudy не
                    принимает оплату за уроки и не выполняет расчёты между
                    учеником и преподавателем.
                </p>
            </PublicInfoSection>
        </PublicInfoLayout>
    );
}
