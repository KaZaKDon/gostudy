import { CircleHelp, CreditCard, Mail, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

import { PLATFORM_IDENTITY } from '../../config/platformIdentity.js';
import {
    PublicInfoLayout,
    PublicInfoSection,
} from './PublicInfoLayout.jsx';

export function SupportPage() {
    return (
        <PublicInfoLayout
            eyebrow="GoStudy · помощь пользователям"
            title="Поддержка"
            lead="Напишите нам, если возник вопрос по аккаунту, работе платформы, подписке или платежу. Страница доступна без авторизации."
        >
            <PublicInfoSection icon={Mail} title="Связаться с поддержкой" accent>
                <p>
                    Основной канал связи — электронная почта:{' '}
                    <a href={`mailto:${PLATFORM_IDENTITY.supportEmail}`}>
                        {PLATFORM_IDENTITY.supportEmail}
                    </a>
                    .
                </p>
                <p>
                    В письме укажите адрес электронной почты вашего аккаунта,
                    раздел GoStudy, в котором возник вопрос, и краткое описание
                    ситуации. Не отправляйте пароль и полные данные банковской
                    карты.
                </p>
                <p>
                    Системные письма могут приходить с адреса{' '}
                    <strong>{PLATFORM_IDENTITY.automaticEmail}</strong>. Ответы и
                    обращения принимаются через адрес поддержки.
                </p>
            </PublicInfoSection>

            <PublicInfoSection icon={CreditCard} title="Подписка и платежи">
                <ul>
                    <li>подключение и статус подписки;</li>
                    <li>дата следующего списания;</li>
                    <li>отключение автоматического продления;</li>
                    <li>неуспешный или повторный платёж;</li>
                    <li>запрос возврата.</li>
                </ul>
                <p>
                    Подробный порядок опубликован на странице{' '}
                    <Link to="/payment-and-refunds">«Оплата и возврат»</Link>.
                </p>
            </PublicInfoSection>

            <PublicInfoSection icon={CircleHelp} title="Технические вопросы">
                <p>
                    Для ускорения проверки приложите снимок экрана, укажите
                    браузер или устройство и время возникновения ошибки. Не
                    прикладывайте документы и персональные данные, если они не
                    нужны для рассмотрения конкретного обращения.
                </p>
            </PublicInfoSection>

            <PublicInfoSection icon={ShieldCheck} title="Безопасность">
                <p>
                    При подозрении на посторонний доступ сначала смените пароль,
                    завершите лишние сеансы в настройках безопасности и сразу
                    сообщите в поддержку.
                </p>
            </PublicInfoSection>
        </PublicInfoLayout>
    );
}
