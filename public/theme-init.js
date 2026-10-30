try {
    const savedTheme = localStorage.getItem('gostudy-theme');
    const isPrivatePage = /^\/(?:account|classroom|admin)(?:\/|$)/.test(location.pathname);
    document.documentElement.dataset.theme = isPrivatePage && savedTheme === 'dark'
        ? 'dark'
        : 'light';
} catch {
    document.documentElement.dataset.theme = 'light';
}
