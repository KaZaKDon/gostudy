<?php

header('Content-Type: application/xml; charset=utf-8');

$baseUrl = 'https://gostudyonline.ru';

$pages = [
    [
        'url' => '/',
        'priority' => '1.0',
        'changefreq' => 'weekly',
    ],
    [
        'url' => '/register',
        'priority' => '0.7',
        'changefreq' => 'monthly',
    ],
    [
        'url' => '/login',
        'priority' => '0.5',
        'changefreq' => 'monthly',
    ],
    [
        'url' => '/agreement',
        'priority' => '0.4',
        'changefreq' => 'monthly',
    ],
    [
        'url' => '/privacy',
        'priority' => '0.4',
        'changefreq' => 'monthly',
    ],
    [
        'url' => '/rules',
        'priority' => '0.4',
        'changefreq' => 'monthly',
    ],
];

echo '<?xml version="1.0" encoding="UTF-8"?>';
?>

<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

<?php foreach ($pages as $page): ?>
    <url>
        <loc><?= $baseUrl . $page['url']; ?></loc>
        <lastmod><?= date('Y-m-d'); ?></lastmod>
        <changefreq><?= $page['changefreq']; ?></changefreq>
        <priority><?= $page['priority']; ?></priority>
    </url>
<?php endforeach; ?>

</urlset>