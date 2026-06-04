(function () {
    var contentEl = document.querySelector('[data-bladeflow-content]');
    if (!contentEl || !window.history || !window.fetch) {
        return;
    }

    var requestController = null;
    var navigating = false;
    var prefetchTimer = null;
    var prefetchPromises = {};

    var progressBar = null;
    var progressInterval = null;
    var progressValue = 0;

    function injectStyles() {
        if (document.getElementById('bladeflow-progress-styles')) return;
        var style = document.createElement('style');
        style.id = 'bladeflow-progress-styles';
        style.textContent =
            '#bladeflow-progress-bar {' +
            '    position: fixed;' +
            '    top: 0;' +
            '    left: 0;' +
            '    height: 3px;' +
            '    background: linear-gradient(to right, #4f46e5, #06b6d4);' +
            '    box-shadow: 0 0 10px rgba(6, 182, 212, 0.5), 0 0 5px rgba(79, 70, 229, 0.5);' +
            '    z-index: 999999;' +
            '    width: 0%;' +
            '    opacity: 0;' +
            '    transition: width 0.2s ease, opacity 0.4s ease;' +
            '    pointer-events: none;' +
            '}';
        document.head.appendChild(style);
    }

    function dispatch(name, detail) {
        var event = new CustomEvent(name, { detail: detail, bubbles: true, cancelable: true });
        document.dispatchEvent(event);
    }

    function startProgress() {
        if (contentEl.getAttribute('data-bladeflow-progress') === 'false') {
            return;
        }
        injectStyles();
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.id = 'bladeflow-progress-bar';
            document.body.appendChild(progressBar);
        }
        progressBar.style.width = '0%';
        progressBar.style.opacity = '1';
        progressValue = 0;
        clearInterval(progressInterval);
        progressInterval = setInterval(function () {
            if (progressValue < 30) {
                progressValue += 10;
            } else if (progressValue < 60) {
                progressValue += 5;
            } else if (progressValue < 90) {
                progressValue += 1;
            }
            if (progressBar) {
                progressBar.style.width = progressValue + '%';
            }
        }, 150);
    }

    function finishProgress() {
        clearInterval(progressInterval);
        if (progressBar) {
            progressBar.style.width = '100%';
            setTimeout(function () {
                if (progressBar) {
                    progressBar.style.opacity = '0';
                    setTimeout(function () {
                        if (progressBar && progressBar.style.opacity === '0') {
                            progressBar.style.width = '0%';
                        }
                    }, 400);
                }
            }, 200);
        }
    }

    function failProgress() {
        clearInterval(progressInterval);
        if (progressBar) {
            progressBar.style.opacity = '0';
            setTimeout(function () {
                if (progressBar && progressBar.style.opacity === '0') {
                    progressBar.style.width = '0%';
                }
            }, 400);
        }
    }

    function normalizePath(pathname) {
        if (!pathname) return '/';
        if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
        return pathname;
    }

    function updateActiveNav() {
        var currentPath = normalizePath(window.location.pathname);
        document.querySelectorAll('a[data-bladeflow]').forEach(function (link) {
            var linkPath = normalizePath(new URL(link.href, window.location.origin).pathname);
            link.classList.toggle('active', linkPath === currentPath);
        });
    }

    function applyStyles(styleHtml) {
        document.querySelectorAll('style[data-bladeflow-style],link[data-bladeflow-style]').forEach(function (node) {
            node.remove();
        });
        if (!styleHtml || !styleHtml.trim()) return;
        var wrap = document.createElement('div');
        wrap.innerHTML = styleHtml;
        var nodes = wrap.querySelectorAll('style,link[rel="stylesheet"]');
        if (nodes.length === 0) return;
        nodes.forEach(function (node) {
            node.setAttribute('data-bladeflow-style', 'true');
            document.head.appendChild(node);
        });
    }

    function applyScripts(scriptHtml) {
        document.querySelectorAll('script[data-bladeflow-page-script]').forEach(function (node) {
            node.remove();
        });
        if (!scriptHtml || !scriptHtml.trim()) return;
        var wrap = document.createElement('div');
        wrap.innerHTML = scriptHtml;
        var nodes = wrap.querySelectorAll('script');
        if (nodes.length === 0) {
            var s = document.createElement('script');
            s.setAttribute('data-bladeflow-page-script', 'true');
            s.textContent = scriptHtml;
            document.body.appendChild(s);
            return;
        }
        nodes.forEach(function (old) {
            var s = document.createElement('script');
            Array.from(old.attributes).forEach(function (a) { s.setAttribute(a.name, a.value); });
            s.setAttribute('data-bladeflow-page-script', 'true');
            if (old.src) { s.src = old.src; } else { s.textContent = old.textContent; }
            document.body.appendChild(s);
        });
    }

    function shouldHandleClick(event, link) {
        if (!link) return false;
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
        if (!link.hasAttribute('data-bladeflow')) return false;
        if (link.hasAttribute('download') || (link.getAttribute('target') && link.getAttribute('target') !== '_self')) return false;
        var href = link.getAttribute('href');
        if (!href || href === '#' || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0 || href.indexOf('javascript:') === 0) return false;
        var targetUrl = new URL(link.href, window.location.origin);
        if (targetUrl.origin !== window.location.origin) return false;
        return true;
    }

    async function navigateTo(url, options) {
        options = options || {};
        var shouldPush = options.push !== false;
        var shouldScroll = options.scroll !== false;
        if (navigating) return;
        navigating = true;

        dispatch('bladeflow:start', { url: url });
        startProgress();

        if (requestController) requestController.abort();
        requestController = new AbortController();
        try {
            var payload = null;
            if (prefetchPromises[url]) {
                payload = await prefetchPromises[url];
                delete prefetchPromises[url];
            }
            if (!payload) {
                var response = await fetch(url, {
                    method: 'GET',
                    headers: { 'X-BladeFlow': 'true', 'Accept': 'application/json' },
                    signal: requestController.signal,
                    credentials: 'same-origin'
                });
                var contentType = response.headers.get('content-type') || '';
                if (!response.ok || contentType.indexOf('application/json') === -1) {
                    finishProgress();
                    window.location.href = url; return;
                }
                payload = await response.json();
            }
            if (payload.redirect) {
                finishProgress();
                window.location.href = payload.redirect; return;
            }
            if (!payload.content || !payload.content.trim()) {
                finishProgress();
                window.location.href = url; return;
            }
            applyStyles(payload.style || '');
            contentEl.innerHTML = payload.content;
            applyScripts(payload.script || '');
            if (payload.title && payload.title.trim()) document.title = payload.title;
            if (shouldPush) history.pushState({ url: url }, '', url);
            if (shouldScroll) window.scrollTo({ top: 0, behavior: 'auto' });
            updateActiveNav();

            dispatch('bladeflow:finish', { url: url });
            finishProgress();
        } catch (error) {
            if (error.name !== 'AbortError') {
                dispatch('bladeflow:error', { url: url, error: error });
                failProgress();
                window.location.href = url;
            } else {
                failProgress();
            }
        } finally {
            navigating = false;
        }
    }

    history.replaceState({ url: window.location.href }, '', window.location.href);
    updateActiveNav();

    document.addEventListener('click', function (event) {
        var link = event.target.closest('a[href]');
        if (!shouldHandleClick(event, link)) return;
        event.preventDefault();
        navigateTo(link.href, { push: true, scroll: true });
    });

    window.addEventListener('popstate', function () {
        navigateTo(window.location.href, { push: false, scroll: true });
    });

    window.bladeflowNavigate = navigateTo;

    document.addEventListener('mouseover', function (e) {
        var link = e.target.closest('a[href]');
        if (!shouldHandleClick({ defaultPrevented: false, button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false }, link)) return;
        if (prefetchPromises[link.href]) return;
        clearTimeout(prefetchTimer);
        prefetchTimer = setTimeout(function () {
            prefetchPromises[link.href] = fetch(link.href, {
                method: 'GET',
                headers: { 'X-BladeFlow': 'true', 'Accept': 'application/json' },
                credentials: 'same-origin'
            }).then(function (res) {
                if (!res.ok) throw new Error('bad response');
                return res.json();
            }).catch(function () {
                delete prefetchPromises[link.href];
                return null;
            });
        }, 100);
    });

    document.addEventListener('mouseout', function (e) {
        clearTimeout(prefetchTimer);
    });

})();
