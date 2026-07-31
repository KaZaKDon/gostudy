<?php

declare(strict_types=1);

header('Content-Type: application/xml; charset=utf-8');
header('X-Robots-Tag: noindex');

$baseUrl = 'https://gostudyonline.ru';

$pages = [
    [
        'url' => '/',
        'priority' => '1.0',
        'changefreq' => 'weekly',
    ],
    [
        'url' => '/agreement',
        'priority' => '0.3',
        'changefreq' => 'monthly',
    ],
    [
        'url' => '/privacy',
        'priority' => '0.3',
        'changefreq' => 'monthly',
    ],
    [
        'url' => '/rules',
        'priority' => '0.3',
        'changefreq' => 'monthly',
    ],
];

echo '<?xml version="1.0" encoding="UTF-8"?>';
?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<?php foreach ($pages as $page): ?>
    <url>
        <loc><?= htmlspecialchars(
            $baseUrl . $page['url'],
            ENT_XML1 | ENT_QUOTES,
            'UTF-8'
        ); ?></loc>
        <changefreq><?= htmlspecialchars(
            $page['changefreq'],
            ENT_XML1 | ENT_QUOTES,
            'UTF-8'
        ); ?></changefreq>
        <priority><?= htmlspecialchars(
            $page['priority'],
            ENT_XML1 | ENT_QUOTES,
            'UTF-8'
        ); ?></priority>
    </url>
<?php endforeach; ?>
</urlset>
