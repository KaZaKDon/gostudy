#!/usr/bin/env bash
set -Eeuo pipefail
umask 0027

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
if [[ "$PWD" != /srv/gostudy/app ]]; then
    echo 'Run this script only from the GoStudy installation at /srv/gostudy/app.' >&2
    exit 1
fi
if [[ "$(id -u)" == 0 ]]; then
    echo 'Run as the deployment user (ubuntu), not root. The script uses sudo where required.' >&2
    exit 1
fi
for dependency in node npm curl rsync tar sudo; do command -v "$dependency" >/dev/null; done
sudo -v
sudo systemctl is-active --quiet gostudy-api
sudo nginx -t
sudo node scripts/install-nginx-seo.mjs

backup_dir="/var/backups/gostudy/seo-$(date -u +%Y%m%dT%H%M%SZ)"
sudo install -d -m 700 "$backup_dir" "$backup_dir/failed"
artifacts=(dist server/dist)
if [[ -d server/public-pages-renderer ]]; then artifacts+=(server/public-pages-renderer); fi
sudo tar -czf "$backup_dir/app-artifacts.tar.gz" "${artifacts[@]}"
sudo tar -czf "$backup_dir/webroot.tar.gz" -C /var/www gostudy
sudo cp -a /etc/nginx/sites-available/gostudy "$backup_dir/nginx.conf"
echo "Backup created: $backup_dir"

web_updated=false
api_restarted=false
rollback() {
    result=$?
    trap - ERR
    set +e
    echo "Update failed. Restoring build artifacts and nginx. Backup: $backup_dir" >&2
    for directory in dist server/dist server/public-pages-renderer; do
        if [[ -d "$directory" ]]; then
            safe_name="${directory//\//-}"
            sudo mv -- "$directory" "$backup_dir/failed/$safe_name"
        fi
    done
    sudo tar -xzf "$backup_dir/app-artifacts.tar.gz" -C /srv/gostudy/app
    if [[ "$web_updated" == true ]]; then
        sudo mv -- /var/www/gostudy "$backup_dir/failed/webroot"
        sudo tar -xzf "$backup_dir/webroot.tar.gz" -C /var/www
    fi
    sudo cp -a "$backup_dir/nginx.conf" /etc/nginx/sites-available/gostudy
    if [[ "$api_restarted" == true ]]; then sudo systemctl restart gostudy-api; fi
    if sudo nginx -t; then sudo systemctl reload nginx; fi
    echo 'Database, uploads and environment files were not changed.' >&2
    exit "$result"
}
trap rollback ERR

# Use the already installed, audited dependencies. Do not overwrite lockfiles,
# run npm audit fix, seed the DB, migrate it, or rewrite any environment file.
npm run lint
npm run build
npm run server:lint
npm run server:test
npm --prefix server run test:modules
node server/scripts/check-public-pages-http.cjs

chmod -R g+rX dist server/dist server/public-pages-renderer
api_restarted=true
sudo systemctl restart gostudy-api
ready=false
for attempt in {1..20}; do
    if curl -fsS --noproxy '*' http://127.0.0.1:3002/api/v1/health >/dev/null; then ready=true; break; fi
    sleep 1
done
[[ "$ready" == true ]]
# Check actual DB-backed rendering before changing nginx or public files.
curl -fsS --noproxy '*' http://127.0.0.1:3002/api/v1/public-pages/pricing >/dev/null

web_updated=true
# Keep old hashed assets for clients with already-open tabs; no --delete.
# The application group is gostudy, while nginx reads static files as
# www-data. Never copy the private application group onto the webroot.
sudo rsync -a --chown="$(id -un):www-data" --chmod=D2750,F640 dist/ /var/www/gostudy/
sudo node scripts/install-nginx-seo.mjs --apply
node scripts/check-seo-deployment.mjs --local
trap - ERR
echo 'GoStudy SEO and contacts update: OK. Database and user files were preserved.'
echo "Backup: $backup_dir"
