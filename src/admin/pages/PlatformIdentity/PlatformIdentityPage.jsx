import { useEffect, useState } from 'react';
import { useAdminAuth } from '../../auth/useAdminAuth.js';
import { platformIdentityApi } from '../../services/platformIdentityApi.js';
import './platform-identity.css';
const fields = [["legalName", "Полное наименование ИП"], ["shortLegalName", "Краткое наименование ИП"], ["inn", "ИНН"], ["ogrnip", "ОГРНИП"], ["registrationDate", "Дата регистрации (ДД.ММ.ГГГГ)"], ["registeringAuthority", "Регистрирующий орган"], ["city", "Населённый пункт"], ["supportEmail", "Email поддержки"], ["supportPhone", "Телефон (+7…)"]];
export function PlatformIdentityPage() {
    const { user } = useAdminAuth();
    const canEdit = user?.role?.toLowerCase() === 'admin';
    const [form, setForm] = useState(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        let active = true;
        platformIdentityApi.read().then((result) => { if (active) setForm(result.data); })
            .catch((reason) => { if (active) setError(reason.message); });
        return () => { active = false; };
    }, []);
    async function submit(event) {
        event.preventDefault(); setSaving(true); setError(''); setNotice('');
        try {
            const body = Object.fromEntries(fields.map(([key]) => [key, form[key]]));
            const result = await platformIdentityApi.save({ ...body, revision: form.revision });
            window.dispatchEvent(new Event('gostudy:identity-updated'));
            setForm(result.data); setNotice('Реквизиты и контакты сохранены. Публичные страницы обновлены.');
        } catch (reason) { setError(reason.message); }
        finally { setSaving(false); }
    }
    return <section className="identity-admin">
        <h1>Реквизиты и контакты</h1>
        <p>Данные продавца в подвале, на страницах сайта и в SEO. Изменения сохраняются в базе данных.</p>
        <p>Редакции оферты, согласий и других юридических документов обновляются отдельно. Эти настройки не меняют отправителя SMTP.</p>
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        {!form && !error && <p>Загрузка…</p>}
        {form && <form onSubmit={submit}>
            <fieldset disabled={!canEdit || saving}>
                {fields.map(([key, label]) => <label key={key}>{label}
                    <input required maxLength={key === 'supportEmail' ? 320 : 500}
                        type={key === 'supportEmail' ? 'email' : key === 'supportPhone' ? 'tel' : 'text'}
                        value={form[key] || ''} onChange={(event) => { setNotice(''); setForm({ ...form, [key]: event.target.value }); }} />
                </label>)}
                {canEdit && <button type="submit">{saving ? 'Сохранение…' : 'Сохранить'}</button>}
            </fieldset>
            {!canEdit && <p>Изменять данные может только администратор.</p>}
        </form>}
    </section>;
}
