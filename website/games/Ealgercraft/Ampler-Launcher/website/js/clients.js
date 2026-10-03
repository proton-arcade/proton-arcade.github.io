/*
 * Ampler Launcher - offline client manifest.
 *
 * Loaded as a classic script (not an ES module) on purpose: <script src> works
 * from file:// in every browser, whereas fetch()/import() do not. That is what
 * lets the launcher render its version list with no server and no network.
 *
 * The launcher's version dropdown (bottom left) is built from this list, so it
 * always shows exactly what is installed. To add a build:
 *
 *   1. drop the single-file build at   website/mc/<id>/index.html
 *   2. copy an entry below and point path at it
 *
 * Every entry with bundled:true points at a file that exists in this repo.
 * verify-offline.mjs asserts that, so this list cannot drift from disk.
 */

window.AMPLER_CLIENTS = [
    {
        id: '1.12.2',
        title: 'Latest release',
        version: '1.12.2-u3',
        icon: './website/images/m-logo1.png',
        path: 'website/mc/1.12.2/index.html',
        bundled: true,
        source: 'Eaglercraft_1.12.2_u3_Offline.zip'
    },
    {
        id: '1.12.2-wasm',
        title: 'Latest release WASM',
        version: '1.12.2-u3-wasm',
        icon: './website/images/m-logo1.png',
        path: 'website/mc/1.12.2-wasm/index.html',
        bundled: true,
        wasm: true,
        source: 'Eaglercraft_1.12.2_u3_WASM_Offline.zip'
    },
    {
        id: '1.8.8',
        title: 'Previous release',
        version: '1.8.8-u53',
        icon: './website/images/m-logo2.png',
        path: 'website/mc/1.8.8/index.html',
        bundled: true,
        source: 'EaglercraftX_1.8_u53_Offline_Signed.zip'
    },
    {
        id: '1.8.8-wasm',
        title: 'Previous release WASM',
        version: '1.8.8-u53-wasm',
        icon: './website/images/m-logo2.png',
        path: 'website/mc/1.8.8-wasm/index.html',
        bundled: true,
        wasm: true,
        source: 'EaglercraftX_1.8_u53_WASM-GC_Offline.zip'
    },
    {
        id: '1.5.2',
        title: 'Older release',
        version: '1.5.2-sp2.01',
        icon: './website/images/m-logo11.png',
        path: 'website/mc/1.5.2/index.html',
        bundled: true,
        source: 'Eaglercraft_1.5.2-sp2.01_Offline.zip'
    },
    {
        id: 'Beta-1.3',
        title: 'Beta 1.3',
        version: 'Minecraft Beta 1.3',
        icon: './website/images/m-logo2.png',
        path: 'website/mc/Beta-1.3/index.html',
        bundled: true,
        source: 'Beta_1.3.html'
    },
    {
        id: 'Alpha-1.2.6',
        title: 'Alpha 1.2.6',
        version: 'Minecraft Alpha 1.2.6',
        icon: './website/images/m-logo1.png',
        path: 'website/mc/Alpha-1.2.6/index.html',
        bundled: true,
        source: 'Alpha_1.2.6.html'
    }
];
