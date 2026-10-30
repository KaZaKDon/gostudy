#!/usr/bin/env bash
# GoStudy VPS: compile and check before an additive migration and deployment.
set -euo pipefail
[[ $(id -u) -eq 0 ]] || { echo 'Запустите через sudo bash.'; exit 1; }
cd /srv/gostudy/app
[[ -f /etc/gostudy/database.env && -f /etc/gostudy/frontend.env ]]
grep -q 'include /etc/nginx/snippets/gostudy-seo.conf;' /etc/nginx/sites-available/gostudy
# These two files contain the private hex DB URL and public Vite build settings.
# app.env belongs to systemd and must never be evaluated as shell commands.
set -a
source /etc/gostudy/database.env
source /etc/gostudy/frontend.env
set +a
run_as_builder() {
    sudo --preserve-env=DATABASE_URL,VITE_NODE_API_BASE_URL,VITE_LESSON_SETTLEMENTS_ENABLED -H -u ubuntu "$@"
}
run_as_builder npm --prefix server run prisma:generate
run_as_builder npm run lint
run_as_builder npm run server:lint
run_as_builder npm run server:test
run_as_builder npm --prefix server run test:modules
run_as_builder npm run build
run_as_builder node server/scripts/check-platform-identity-http.cjs

backup_dir=$(mktemp -d /var/backups/gostudy/platform-identity-XXXXXXXX)
chmod 0700 "$backup_dir"
cp -a /etc/nginx/sites-available/gostudy "$backup_dir/nginx-gostudy"
cp -a /etc/nginx/snippets/gostudy-seo.conf "$backup_dir/gostudy-seo.conf"
sudo --preserve-env=DATABASE_URL -H -u gostudy pg_dump --no-owner --no-acl "$DATABASE_URL" > "$backup_dir/database.sql"
test -s "$backup_dir/database.sql"
run_as_builder npm --prefix server run prisma:migrate:deploy
run_as_builder npm --prefix server run prisma:status

# Retain hashed assets of older tabs. Publish new assets before replacing HTML.
rsync -a --chown=ubuntu:www-data --chmod=D2750,F640 dist/assets/ /var/www/gostudy/assets/
rsync -a --chown=ubuntu:www-data --chmod=D2750,F640 dist/ /var/www/gostudy/
install -m 0644 deploy/nginx/gostudy-seo.conf /etc/nginx/snippets/gostudy-seo.conf
if ! nginx -t; then
    cp -a "$backup_dir/gostudy-seo.conf" /etc/nginx/snippets/gostudy-seo.conf
    echo "Проверка Nginx не прошла. Восстановлен прежний фрагмент. Копия: $backup_dir"
    exit 1
fi
systemctl restart gostudy-api
ready=false
for attempt in {1..20}; do
    if curl --noproxy '*' -fsS --max-time 2 http://127.0.0.1:3002/api/v1/health >/dev/null 2>&1; then
        ready=true; break
    fi
    sleep 1
done
if [[ $ready != true ]]; then
    echo "API не запустился. Сохранена копия: $backup_dir"
    exit 1
fi
systemctl reload nginx
for path in / /requisites /support /pricing /legal/offer; do
    status=$(curl --noproxy '*' -sS --max-time 20 -o /dev/null -w '%{http_code}' "https://gostudyonline.ru$path")
    printf '%s: %s\n' "$path" "$status"
    [[ $status == 200 ]] || { echo "Проверьте API и Nginx. Копия: $backup_dir"; exit 1; }
done
printf 'Обновление завершено. Резервная копия: %s\n' "$backup_dir"
