import re
import glob
import os

base = os.path.dirname(os.path.abspath(__file__))
brand_nav = '<a href="index.html" class="brand"><img class="brand-logo" src="brand-mark.svg" alt="Finura"> Finura</a>'
brand_nav2 = '<a class="brand" href="index.html"><img class="brand-logo" src="brand-mark.svg" alt="Finura"> Finura</a>'
brand_footer = '<div class="brand" style="color:#fff;"><img class="brand-logo" src="brand-mark.svg" alt="Finura"> Finura</div>'
favicon_link = '<link rel="icon" type="image/svg+xml" href="favicon.svg">'

svg_brand = re.compile(
    r'<a href="index\.html" class="brand">\s*<svg class="brand-mark".*?</svg>\s*EMI Calculator\s*</a>',
    re.DOTALL,
)
svg_brand2 = re.compile(
    r'<a class="brand" href="index\.html">\s*<svg class="brand-mark".*?</svg>\s*EMI Calculator\s*</a>',
    re.DOTALL,
)
svg_footer = re.compile(
    r'<div class="brand" style="color:#fff;"><svg class="brand-mark".*?</svg>EMI Calculator</div>',
    re.DOTALL,
)
favicon = re.compile(r'<link rel="icon" type="image/svg\+xml" href="data:image/svg\+xml[^"]*">')
articles_dropdown_old = re.compile(
    r'<li class="has-dropdown"><a href="how-to-calculate-emi\.html" aria-haspopup="true">Articles</a>'
    r'<ul class="dropdown">'
    r'<li><a href="how-to-calculate-emi\.html">How EMI Is Calculated</a></li>'
    r'<li><a href="fixed-vs-floating\.html">Fixed vs Floating Rates</a></li>'
    r'<li><a href="reduce-emi-guide\.html">How to Reduce Your EMI</a></li>'
    r'<li><a href="loan-prepayment-guide\.html">Loan Prepayment Explained</a></li>'
    r'<li><a href="sitemap\.html">All Articles</a></li>'
    r'</ul></li>',
    re.DOTALL,
)
articles_dropdown_new = (
    '<li class="has-dropdown"><a href="all-articles.html" aria-haspopup="true">Articles</a>'
    '<ul class="dropdown">'
    '<li><a href="how-to-calculate-emi.html">How EMI Is Calculated</a></li>'
    '<li><a href="fixed-vs-floating.html">Fixed vs Floating Rates</a></li>'
    '<li><a href="reduce-emi-guide.html">How to Reduce Your EMI</a></li>'
    '<li><a href="loan-prepayment-guide.html">Loan Prepayment Explained</a></li>'
    '<li><a href="credit-score-guide.html">Understanding Credit Score</a></li>'
    '<li><a href="all-articles.html">All Articles</a></li>'
    '</ul></li>'
)

for path in glob.glob(os.path.join(base, "*.html")):
    name = os.path.basename(path)
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    original = content

    content = content.replace('href="sitemap.html">All Articles', 'href="all-articles.html">All Articles')
    content = content.replace(
        '<li><a href="loan-prepayment-guide.html">Loan Prepayment Explained</a></li><li><a href="all-articles.html">All Articles</a></li>',
        '<li><a href="loan-prepayment-guide.html">Loan Prepayment Explained</a></li><li><a href="credit-score-guide.html">Understanding Credit Score</a></li><li><a href="all-articles.html">All Articles</a></li>',
    )
    content = content.replace(
        '<li><a href="faq.html">FAQ</a></li><li><a href="sitemap.html">Sitemap</a></li></ul></div>',
        '<li><a href="faq.html">FAQ</a></li><li><a href="all-articles.html">All Articles</a></li><li><a href="sitemap.html">Sitemap</a></li></ul></div>',
    )
    content = content.replace(
        'href="how-to-calculate-emi.html" aria-haspopup="true">Articles',
        'href="all-articles.html" aria-haspopup="true">Articles',
    )
    content = content.replace('href="sitemap.html">Articles</a>', 'href="all-articles.html">Articles</a>')
    content = articles_dropdown_old.sub(articles_dropdown_new, content)
    content = favicon.sub(favicon_link, content)
    if 'rel="icon"' not in content and '</head>' in content:
        content = content.replace('</head>', favicon_link + '\n</head>', 1)
    content = content.replace(" — EMI Calculator", " — Finura")
    content = content.replace(" | EMI Calculator", " | Finura")
    content = content.replace('content="#123a63"', 'content="#0d4a42"')
    content = content.replace("EMI Calculator. All figures are indicative", "Finura. All figures are indicative")
    content = content.replace("© <span data-current-year></span> EMI Calculator", "© <span data-current-year></span> Finura")
    content = content.replace('fill="#123a63"', 'fill="#0d4a42"')
    content = content.replace('fill="#2e6ba8"', 'fill="#0d4a42"')
    content = svg_brand.sub(brand_nav, content)
    content = svg_brand2.sub(brand_nav2, content)
    content = svg_footer.sub(brand_footer, content)
    content = content.replace('<a class="brand" href="index.html">EMI Calculator</a>', brand_nav2)

    content = content.replace("EMI Calculator started", "Finura started")
    content = content.replace('EMI Calculator is an independent, free loan planning tool', 'Finura is an independent, free loan planning tool')
    content = content.replace('EMI Calculator is an independent, educational website', 'Finura is an independent, educational website')
    content = content.replace('EMI Calculator is an educational tool', 'Finura is an educational tool')
    content = content.replace('By accessing or using EMI Calculator ("the site")', 'By accessing or using Finura ("the site")')
    content = content.replace('EMI Calculator provides free', 'Finura provides free')
    content = content.replace('owned by EMI Calculator unless', 'owned by Finura unless')
    content = content.replace('how EMI Calculator ("we", "us")', 'how Finura ("we", "us")')
    content = content.replace('how EMI Calculator uses cookies', 'how Finura uses cookies')
    content = content.replace('Questions, corrections or feedback about EMI Calculator?', 'Questions, corrections or feedback about Finura?')
    content = content.replace(
        '<title>EMI Calculator — Calculate Loan EMI, Interest & Amortization Schedule</title>',
        '<title>EMI Calculator — Finura | Calculate Loan EMI, Interest & Schedule</title>',
    )
    content = content.replace(
        '"item":"https://www.finura.in/sitemap.html"',
        '"item":"https://www.finura.in/all-articles.html"',
    )

    if 'href="all-articles.html">All Articles</a></li>' not in content and 'href="sitemap.html">Sitemap</a></li>' in content:
        content = content.replace(
            '<li><a href="sitemap.html">Sitemap</a></li>',
            '<li><a href="all-articles.html">All Articles</a></li><li><a href="sitemap.html">Sitemap</a></li>',
        )

    content = content.replace("https://www.emicalculator-guide.example", "https://www.finura.in")
    content = content.replace('"name":"EMI Calculator"', '"name":"Finura"')

    if content != original:
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(content)
        print("Updated:", name)
