/* Deterministic generator for the /data JSON files.
 * Source of truth: raw/catjson_raw.txt (the catjson JS var scraped live from threadsme.com)
 * + the structured findings from the research workflow.
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'data');
fs.mkdirSync(OUT, { recursive: true });
const write = (name, obj) =>
    fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2) + '\n');

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'catjson_raw.txt'), 'utf8'));

// ---- Non-school / junk catjson entries to exclude ----
const NON_SCHOOL_KEYS = new Set([
    'Brands',
    'PROMOTIONS',
    'Stationery Items',
    'SUPPLEMENTARY CATEGORY',
    'GDASMNXCKHDF' // gibberish test record
]);

const slugFromUrl = (url) =>
    (url.match(/\/([^\/]+)\.html(?:$|\?)/) || [])[1] ||
    url.replace(/\/+$/, '').split('/').pop();

// Best-effort emirate inference from the school name/slug.
const inferEmirate = (name, slug) => {
    const s = (name + ' ' + slug).toLowerCase();
    if (/(abu dhabi|abu-dhabi|baniyas|masdar|mbz|al falah|al-falah|al ain|al-ain)/.test(s)) {
        if (/al ain|al-ain/.test(s)) return 'Al Ain';
        return 'Abu Dhabi';
    }
    if (/sharjah/.test(s)) return 'Sharjah';
    if (/fujairah/.test(s)) return 'Fujairah';
    if (/\brak\b|ras al khaimah/.test(s)) return 'Ras Al Khaimah';
    return 'Dubai';
};

// Best-effort curriculum inference.
const inferCurriculum = (name, slug) => {
    const s = (name + ' ' + slug).toLowerCase();
    if (/lycee|francais|french/.test(s)) return 'French';
    if (/german/.test(s)) return 'German';
    if (/indian|our own|bhavan/.test(s)) return 'Indian';
    if (/american academy|american school/.test(s)) return 'American';
    return 'British'; // dominant curriculum on Threads (GEMS British, Cambridge, etc.)
};

const schools = raw
    .filter((e) => !NON_SCHOOL_KEYS.has(e.key))
    .map((e, i) => {
        const name = e.key.replace(/\s+/g, ' ').trim();
        const slug = slugFromUrl(e.data.url);
        return {
            id: i + 1,
            name,
            slug,
            url: e.data.url,
            hasLogo: e.data.image !== false,
            logo: e.data.image ? ('https://www.threadsme.com' + e.data.image) : null,
            emirate: inferEmirate(name, slug),
            curriculum: inferCurriculum(name, slug)
        };
    })
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((s, i) => ({ ...s, id: i + 1 }));

write('schools.json', {
    source: 'https://www.threadsme.com/onlineshop/ (catjson)',
    extractedAt: '2026-06-05',
    count: schools.length,
    note: 'Genuine school stores only. 4 category entries (Brands, Promotions, Stationery, Supplementary) and 1 junk test record (GDASMNXCKHDF) excluded from the 75 raw catjson entries. emirate/curriculum are heuristic inferences from the school name for filtering.',
    schools
});

// ---- Year / grade taxonomy (fixed 15 levels, consistent across every school) ----
const yearCategories = [
    { name: 'FS 1', code: 'FS1', order: 1, stage: 'Foundation', typicalAge: '3-4', exampleCatId: '23175' },
    { name: 'FS 2', code: 'FS2', order: 2, stage: 'Foundation', typicalAge: '4-5', exampleCatId: '23190' },
    { name: 'YEAR 1', code: 'Y1', order: 3, stage: 'Primary', typicalAge: '5-6', exampleCatId: '23178' },
    { name: 'YEAR 2', code: 'Y2', order: 4, stage: 'Primary', typicalAge: '6-7', exampleCatId: '23181' },
    { name: 'YEAR 3', code: 'Y3', order: 5, stage: 'Primary', typicalAge: '7-8', exampleCatId: '23126' },
    { name: 'YEAR 4', code: 'Y4', order: 6, stage: 'Primary', typicalAge: '8-9', exampleCatId: '23129' },
    { name: 'YEAR 5', code: 'Y5', order: 7, stage: 'Primary', typicalAge: '9-10', exampleCatId: '23132' },
    { name: 'YEAR 6', code: 'Y6', order: 8, stage: 'Primary', typicalAge: '10-11', exampleCatId: '23135' },
    { name: 'YEAR 7', code: 'Y7', order: 9, stage: 'Secondary', typicalAge: '11-12', exampleCatId: '23140' },
    { name: 'YEAR 8', code: 'Y8', order: 10, stage: 'Secondary', typicalAge: '12-13', exampleCatId: '23145' },
    { name: 'YEAR 9', code: 'Y9', order: 11, stage: 'Secondary', typicalAge: '13-14', exampleCatId: '23150' },
    { name: 'YEAR 10', code: 'Y10', order: 12, stage: 'Secondary', typicalAge: '14-15', exampleCatId: '23155' },
    { name: 'YEAR 11', code: 'Y11', order: 13, stage: 'Secondary', typicalAge: '15-16', exampleCatId: '23160' },
    { name: 'YEAR 12', code: 'Y12', order: 14, stage: 'Sixth Form', typicalAge: '16-17', exampleCatId: '23165' },
    { name: 'YEAR 13', code: 'Y13', order: 15, stage: 'Sixth Form', typicalAge: '17-18', exampleCatId: '23170' }
];
write('year-categories.json', {
    source: 'Threads school page left-rail "Category" filter (example ids from Al Basma British School)',
    note: 'The 15 year levels are a fixed taxonomy across all schools, but the numeric cat id is PER-SCHOOL. exampleCatId values belong to Al Basma British School and must NOT be hardcoded globally. Display order is FS1, FS2, YEAR 1..13 (do not sort by id).',
    count: yearCategories.length,
    yearCategories
});

// ---- On-page facets ----
write('filters.json', {
    source: 'Threads school page left-rail facets',
    filters: [
        { facet: 'GENDER', key: 'gender', values: ['BOYS', 'GIRLS', 'UNISEX'], note: 'Unisex items are coded "UX" in product names.' },
        { facet: 'UNIFORM TYPE', key: 'uniformType', values: ['CORE UNIFORM', 'WINTER UNIFORM', 'PE'], note: 'Core / Winter / PE are separate ranges and form a natural attach/upsell ladder.' }
    ]
});

// ---- What Threads sells (for cross-sell sourcing) ----
write('product-types.json', {
    source: 'Threads main navigation + supplementary categories',
    note: 'Top-level merchandise lines beyond core uniforms, used to source cross-sell / upsell rails on the Mumzworld landing page.',
    productTypes: [
        { name: 'School Uniforms', key: 'uniforms', url: 'https://www.threadsme.com/onlineshop/', priceRangeAed: [63, 105], role: 'core', description: 'School-specific Core / Winter / PE uniform per year level and gender. Primary product.' },
        { name: 'Backpacks & Bags', key: 'bags', url: 'https://www.threadsme.com/supplementary-category.html?cat=20956', priceRangeAed: [93, 139], role: 'cross-sell', description: 'School bags 12/16/18 inch in multiple colours + generic backpacks. Highest-intent attach item.' },
        { name: 'Shoes', key: 'shoes', url: 'https://www.threadsme.com/supplementary-category.html?cat=20955', priceRangeAed: [], role: 'cross-sell', description: 'Supplementary shoes category. Empty/seasonal at time of crawl but a live slot.' },
        { name: 'Branded Lifestyle (Stanley)', key: 'brands', url: 'https://www.threadsme.com/brands.html', priceRangeAed: [216, 270], role: 'upsell', description: 'Branded non-uniform merchandise — currently Stanley drinkware (Quencher tumblers, Ice Flow bottles). Premium AOV booster.' },
        { name: 'Stationery (B2B)', key: 'stationery', url: 'https://www.threadsme.com/stationery', priceRangeAed: [], role: 'cross-sell', description: 'Stationery / B2B supply (Magento category id 32445). Back-to-school list filler.' },
        { name: 'Pre-Book Fitting', key: 'prebook', url: 'https://eazyqadminpanel.ngrok.io/ThreadsOnlineBooking/', priceRangeAed: [], role: 'service', description: 'External EazyQ appointment system to reserve in-store fitting/collection slots for peak back-to-school.' },
        { name: 'Promotions', key: 'promotions', url: 'https://www.threadsme.com/promotions.html', priceRangeAed: [], role: 'seasonal', description: 'Seasonal offers hub (e.g. DSF specials). Surface time-bound discounts.' }
    ]
});

// ---- Sample products (real, scraped) for demo population & cross-sell rails ----
const sampleProducts = [
    { name: 'ABS UX POLO WHITE FS1-Y11', sku: 'TP0426', priceAed: 63.0, school: 'al-basma-british-school-abu-dhabi', uniformType: 'CORE UNIFORM', gender: 'UNISEX', years: ['FS1','FS2','Y1','Y2','Y3','Y4','Y5','Y6','Y7','Y8','Y9','Y10','Y11'], url: 'https://www.threadsme.com/abs-ux-polo-white-fs1-y11.html?pcat=23124', image: 'https://www.threadsme.com/media/catalog/product/cache/07f2e6a9c8d1f3299eeec63ed457d5d9/w/h/white-polo-fs1-y11.jpg' },
    { name: 'ABS GIRLS SS BLOUSE Y12-13 WHT', sku: 'TP0428', priceAed: 78.75, school: 'al-basma-british-school-abu-dhabi', uniformType: 'CORE UNIFORM', gender: 'GIRLS', years: ['Y12','Y13'], url: 'https://www.threadsme.com/abs-girls-ss-blouse-y12-13-wht.html?pcat=23124', image: 'https://www.threadsme.com/media/catalog/product/cache/07f2e6a9c8d1f3299eeec63ed457d5d9/w/h/white-ss-blouse-y12-y13.jpg' },
    { name: 'ABS BOYS SS SHIRT Y12-13 WHT', sku: 'TP0427', priceAed: 78.75, school: 'al-basma-british-school-abu-dhabi', uniformType: 'CORE UNIFORM', gender: 'BOYS', years: ['Y12','Y13'], url: 'https://www.threadsme.com/abs-boys-ss-shirt-y12-13-wht.html?pcat=23124', image: 'https://www.threadsme.com/media/catalog/product/cache/07f2e6a9c8d1f3299eeec63ed457d5d9/w/h/white-ss-shirt-y12-y13.jpg' },
    { name: 'ABS UX PANTS NAVY Y3-13', sku: 'BT0341', priceAed: 89.75, school: 'al-basma-british-school-abu-dhabi', uniformType: 'CORE UNIFORM', gender: 'UNISEX', years: ['Y3','Y4','Y5','Y6','Y7','Y8','Y9','Y10','Y11','Y12','Y13'], url: 'https://www.threadsme.com/abs-ux-pants-navy-y3-13.html?pcat=23124', image: 'https://www.threadsme.com/media/catalog/product/cache/07f2e6a9c8d1f3299eeec63ed457d5d9/n/a/navy-trouser-fs1-y11.jpg' },
    { name: 'ABS DIVIDED SKORT NAVY', sku: 'BT0342', priceAed: 89.75, school: 'al-basma-british-school-abu-dhabi', uniformType: 'CORE UNIFORM', gender: 'GIRLS', years: ['FS1','FS2','Y1','Y2','Y3','Y4','Y5','Y6'], url: 'https://www.threadsme.com/abs-divided-skort-navy.html?pcat=23124', image: 'https://www.threadsme.com/media/catalog/product/cache/07f2e6a9c8d1f3299eeec63ed457d5d9/n/a/navy-divided-skirt-fs1-y11.jpg' },
    { name: 'ABS UX PE POLO WHT/ORNG', sku: 'SP0491', priceAed: 78.75, school: 'al-basma-british-school-abu-dhabi', uniformType: 'PE', gender: 'UNISEX', years: [], url: 'https://www.threadsme.com/abs-ux-pe-polo-wht-orng.html?pcat=23124', image: 'https://www.threadsme.com/media/catalog/product/cache/07f2e6a9c8d1f3299eeec63ed457d5d9/o/r/orange-pe-tshirt.jpg' },
    { name: 'ABS UX PE POLO WHT/BLU', sku: 'SP0492', priceAed: 78.75, school: 'al-basma-british-school-abu-dhabi', uniformType: 'PE', gender: 'UNISEX', years: [], url: 'https://www.threadsme.com/abs-ux-pe-polo-wht-blu.html?pcat=23124', image: 'https://www.threadsme.com/media/catalog/product/cache/07f2e6a9c8d1f3299eeec63ed457d5d9/b/l/blue-pe-tshirt.jpg' },
    { name: 'ABS UX TRACK PANTS NAVY', sku: 'SP0495', priceAed: 63.0, school: 'al-basma-british-school-abu-dhabi', uniformType: 'PE', gender: 'UNISEX', years: [], url: 'https://www.threadsme.com/abs-ux-track-pants-navy.html?pcat=23124', image: null },
    { name: 'ABS UX WINTER JACKET NAVY', sku: 'OW0201', priceAed: 105.0, school: 'al-basma-british-school-abu-dhabi', uniformType: 'WINTER UNIFORM', gender: 'UNISEX', years: [], url: 'https://www.threadsme.com/abs-ux-winter-jacket-navy.html?pcat=23124', image: null }
];
write('sample-products.json', {
    source: 'Al Basma British School page (real listing data)',
    note: 'Representative uniform products used to populate the demo grid. SKUs confirmed from PDPs. years[] are inferred from product name ranges.',
    count: sampleProducts.length,
    products: sampleProducts
});

// ---- Cross-sell / upsell rails ----
// NOTE: data/cross-sell.json is HAND-MAINTAINED and user-APPROVED (Mumzworld own
// products, gated by year/gender). This generator intentionally does NOT write it,
// so re-running build_data.js never clobbers the approved cross-sell shortlist.

// ---- Mumzworld design tokens (extracted from packages/tailwind-config + ProductCard.module.css) ----
write('design-tokens.json', {
    source: 'mumzworld-nextjs repo: packages/tailwind-config/lib/shadcn-plugin.ts, apps/[locale]/layout.tsx, components/ProductCard/ProductCard.module.css',
    fonts: { latin: 'Inter', arabic: 'Rubik', loader: 'next/font/google', baseTextColor: '#43454C' },
    colors: {
        primary: '#E50056',
        primaryDarkBlue: '#004372',
        secondary: '#E50056',
        rose700: '#C30044',
        tertiaryRed: '#9C0037',
        accentDark: '#43454C',
        accentLight: '#F4EFE9',
        destructive: '#FF3B30',
        semantic: {
            positive: '#009246',
            positiveLight: '#E5F4EC',
            starRating: '#FDAA2D',
            notice: '#FC781E',
            noticeLight: '#FFF1E8',
            negative: '#FF3B30',
            negativeExtra: '#FB0000',
            negativeLight: '#FFECEB',
            informative: '#E5F1F8',
            primaryLight: '#EBF4FA',
            textWeak: '#555555',
            textDisabled: '#828282',
            red: '#FCF3F6'
        },
        supportive: { greenBright: '#D4F4E3', blueLight: '#EDF5FB', magentaLight: '#FFE5EE' },
        tertiary: {
            black: '#43454C', body: '#6B6D72', grey: '#95969E',
            lightGrey: '#E0E0E7', brightGrey: '#F4F4F6', lightExtra: '#FBFBFC',
            thickSeparators: '#F6F6F8', white: '#FFFFFF'
        },
        imageTintBg: '#0517510d'
    },
    fontSize: { xxs: '10px', xs: '11px', sm: '12px', base: '13px', md: '14px', lg: '16px', x: '18px', xl: '20px', xxl: '24px' },
    lineHeight: { xxs: '12px', xs: '13px', sm: '16px', base: '18px', md: '19px', lg: '22px', xl: '26px', xxl: '30px' },
    fontWeight: { normal: 400, medium: 500, semiBold: 600, bold: 700, extraBold: 800 },
    borderRadius: { none: '0', xs: '4px', sm: '8px', md: '12px', lg: '20px', xl: '44px', full: '100%' },
    spacing: { none: '0', xxs: '2px', xs: '4px', sm: '6px', md: '8px', lg: '10px', xl: '12px', xxl: '20px', '3xl': '24px', '4xl': '28px', '5xl': '32px', '6xl': '44px' },
    boxShadow: {
        subtle: '0px 1px 2px 0px #0000001A',
        elevated: '0px -2px 6px 0px #00000014',
        depressed: '0px 1px 4px 0px #0000001A',
        distant: '0px 4px 12px 0px #00000026'
    },
    container: { center: true, padding: '1rem', maxWidth2xl: '1400px' },
    productCard: {
        bg: '#FFFFFF', widthDesktop: '252px', imageBg: '#0517510d',
        imageHeight: { mobile: '172px', sm: '242px', lg: '294px' },
        nameFontSize: { mobile: '12px', sm: '14px' }, nameClamp: 2,
        priceMinHeight: '36px', colorSwatchOutline: '#43454C'
    }
});

const written = fs.readdirSync(OUT).filter((f) => f.endsWith('.json')).sort();
console.log('Wrote', written.length, 'files to data/:');
written.forEach((f) => console.log('  data/' + f));
console.log('\nSchools:', schools.length);
const byEmirate = {};
schools.forEach((s) => (byEmirate[s.emirate] = (byEmirate[s.emirate] || 0) + 1));
console.log('By emirate:', JSON.stringify(byEmirate));
const byCurr = {};
schools.forEach((s) => (byCurr[s.curriculum] = (byCurr[s.curriculum] || 0) + 1));
console.log('By curriculum:', JSON.stringify(byCurr));
