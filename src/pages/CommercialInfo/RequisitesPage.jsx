import { Building2, CalendarDays, Mail, ScrollText } from 'lucide-react';

import { usePlatformIdentity } from '../../features/platform-identity/usePlatformIdentity.js';
import {
    PublicInfoLayout,
    PublicInfoSection,
} from './PublicInfoLayout.jsx';


export function RequisitesPage() {
    const identity = usePlatformIdentity();
    const requisites = [
        ['Наименование', identity.legalName],
        ['Населённый пункт', identity.city],
        ['ИНН', identity.inn],
        ['ОГРНИП', identity.ogrnip],
        ['Дата государственной регистрации', identity.registrationDate],
    ];
    return (
        <PublicInfoLayout
            eyebrow="GoStudy · сведения о продавце"
            title="Реквизиты"
            lead="Продавцом подписки на доступ к платформе GoStudy является зарегистрированный в Российской Федерации индивидуальный предприниматель."
        >
            <PublicInfoSection icon={Building2} title="Сведения об операторе" accent>
                <dl className="public-info-details">
                    {requisites.map(([label, value]) => (
                        <div key={label}>
                            <dt>{label}</dt>
                            <dd>{value}</dd>
                        </div>
                    ))}
                </dl>
            </PublicInfoSection>

            <PublicInfoSection icon={ScrollText} title="Регистрация">
                <p>{identity.registeringAuthority}.</p>
                <p>
                    Основной вид деятельности по ОКВЭД 62.01 — разработка
                    компьютерного программного обеспечения.
                </p>
            </PublicInfoSection>

            <PublicInfoSection icon={Mail} title="Контакты">
                <p>
                    Электронная почта для обращений пользователей, вопросов
                    по подписке и юридически значимых сообщений:{' '}
                    <a href={`mailto:${identity.supportEmail}`}>
                        {identity.supportEmail}
                    </a>
                    .
                </p>
                <p>
                    Телефон для связи по вопросам работы платформы, подписки
                    и платежей:{' '}
                    <a href={identity.supportPhoneHref}>
                        {identity.supportPhone}
                    </a>
                    .
                </p>
            </PublicInfoSection>

            <PublicInfoSection icon={CalendarDays} title="Платёжная модель GoStudy">
                <p>
                    {identity.shortLegalName} продаёт пользователю
                    доступ к программной платформе по подписке. GoStudy не
                    принимает оплату за уроки и не выполняет расчёты между
                    учеником и преподавателем.
                </p>
            </PublicInfoSection>
        </PublicInfoLayout>
    );
}
