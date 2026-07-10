document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. THEME TOGGLER (DARK/LIGHT MODE)
    // ==========================================
    const themeToggleBtn = document.querySelector('.theme-toggle');
    const getPreferredTheme = () => {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme) return storedTheme;
        return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    };

    const setTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    };

    // Initialize theme
    let currentTheme = getPreferredTheme();
    setTheme(currentTheme);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(currentTheme);
        });
    }

    // ==========================================
    // 2. MOBILE MENU & HAMBURGER NAVIGATION
    // ==========================================
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('open');
            navMenu.classList.toggle('open');
            // Prevent body scroll when mobile menu is open
            document.body.style.overflow = navMenu.classList.contains('open') ? 'hidden' : '';
        });

        // Close mobile menu when clicking a link
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('open');
                navMenu.classList.remove('open');
                document.body.style.overflow = '';
            });
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (navMenu.classList.contains('open') && !navMenu.contains(e.target) && !hamburger.contains(e.target)) {
                hamburger.classList.remove('open');
                navMenu.classList.remove('open');
                document.body.style.overflow = '';
            }
        });
    }

    // ==========================================
    // 3. SCROLL REVEAL ANIMATIONS (INTERSECTION OBSERVER)
    // ==========================================
    const revealElements = document.querySelectorAll('.reveal');
    
    if ('IntersectionObserver' in window && revealElements.length > 0) {
        const revealCallback = (entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    // Unobserve after showing
                    observer.unobserve(entry.target);
                }
            });
        };

        const revealObserver = new IntersectionObserver(revealCallback, {
            root: null,
            threshold: 0.15,
            rootMargin: '0px 0px -50px 0px'
        });

        revealElements.forEach(element => {
            revealObserver.observe(element);
        });
    } else {
        // Fallback for browsers that don't support IntersectionObserver
        revealElements.forEach(element => {
            element.classList.add('active');
        });
    }

    // Add base CSS transition styles to reveal classes dynamically if not present
    const style = document.createElement('style');
    style.innerHTML = `
        .reveal {
            opacity: 0;
            transform: translateY(30px);
            transition: opacity 0.8s cubic-bezier(0.25, 1, 0.5, 1), 
                        transform 0.8s cubic-bezier(0.25, 1, 0.5, 1);
            will-change: transform, opacity;
        }
        .reveal.active {
            opacity: 1;
            transform: translateY(0);
        }
        .reveal-delay-1 { transition-delay: 0.15s; }
        .reveal-delay-2 { transition-delay: 0.3s; }
        .reveal-delay-3 { transition-delay: 0.45s; }
    `;
    document.head.appendChild(style);

    // ==========================================
    // 4. COOKIE CONSENT BANNER
    // ==========================================
    if (!localStorage.getItem('cookieConsent')) {
        const cookieBanner = document.createElement('div');
        cookieBanner.className = 'glass-card';
        cookieBanner.style.cssText = `
            position: fixed;
            bottom: 24px;
            left: 24px;
            right: 24px;
            max-width: 480px;
            padding: 24px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 16px;
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.5s ease, transform 0.5s ease;
        `;
        
        cookieBanner.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <h4 style="font-family: var(--font-heading); font-size: 1.15rem; font-weight: 600;">Cookie Preferences</h4>
                <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.5;"> We use cookies to enhance your experience, serve personalized ads, and analyze traffic. By clicking "Accept All", you consent to our use of cookies as detailed in our <a href="cookie-policy.html" style="text-decoration: underline; color: var(--accent-primary);">Cookie Policy</a>. </p>
            </div>
            <div style="display: flex; gap: 12px; align-self: flex-end;">
                <button class="btn btn-secondary btn-sm" id="cookie-reject" style="padding: 6px 12px;">Reject</button>
                <button class="btn btn-primary btn-sm" id="cookie-accept" style="padding: 6px 12px;">Accept All</button>
            </div>
        `;
        
        document.body.appendChild(cookieBanner);
        
        // Trigger reflow & animate in
        setTimeout(() => {
            cookieBanner.style.opacity = '1';
            cookieBanner.style.transform = 'translateY(0)';
        }, 1000);
        
        const closeBanner = (consent) => {
            localStorage.setItem('cookieConsent', consent);
            cookieBanner.style.opacity = '0';
            cookieBanner.style.transform = 'translateY(20px)';
            setTimeout(() => cookieBanner.remove(), 500);
        };
        
        document.getElementById('cookie-accept').addEventListener('click', () => closeBanner('accepted'));
        document.getElementById('cookie-reject').addEventListener('click', () => closeBanner('rejected'));
    }

    // ==========================================
    // 5. NEWSLETTER ANIMATION
    // ==========================================
    const newsletterForm = document.querySelector('.newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = newsletterForm.querySelector('.newsletter-input');
            const button = newsletterForm.querySelector('.newsletter-btn');
            
            if (input && input.value.trim() !== '') {
                const originalText = button.textContent;
                button.textContent = 'Subscribed!';
                button.style.background = 'var(--accent-primary)';
                input.value = '';
                input.disabled = true;
                
                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.background = '';
                    input.disabled = false;
                }, 3000);
            }
        });
    }

    // ==========================================
    // 6. DETECT ACTIVE LINK FOR BREADCRUMBS & NAVIGATION
    // ==========================================
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        if (linkPath === currentPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
});
