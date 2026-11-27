import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// ASL_TEST_IIFE=1 builds a classic script variant, only used to load the plugin in test
// environments that can't run ES modules (jsdom). It is not meant to be deployed.
const testIife = process.env.ASL_TEST_IIFE === '1';

// Kiwi loads a single file per plugin, so inject the extracted CSS from the JS bundle instead
// of shipping a separate stylesheet
function injectCss() {
    return {
        name: 'plugin-asl-inject-css',
        apply: 'build',
        enforce: 'post',
        generateBundle(options, bundle) {
            const cssFiles = Object.keys(bundle).filter((name) => name.endsWith('.css'));
            const css = cssFiles.map((name) => bundle[name].source).join('\n');
            cssFiles.forEach((name) => delete bundle[name]);
            if (!css) {
                return;
            }

            const inject = `(function(){if(typeof document!=='undefined'){` +
                `var s=document.createElement('style');s.dataset.pluginAsl='styles';` +
                `s.textContent=${JSON.stringify(css)};document.head.appendChild(s);}})();\n`;
            Object.values(bundle)
                .filter((chunk) => chunk.type === 'chunk' && chunk.isEntry)
                .forEach((chunk) => {
                    chunk.code = testIife ? chunk.code.replace(/^/, inject) : inject + chunk.code;
                });
        },
    };
}

// The plugin reads its translations from settings.plugin-asl.localesPath at runtime
function copyLocales() {
    return {
        name: 'plugin-asl-copy-locales',
        apply: 'build',
        writeBundle(options) {
            fs.cpSync(
                path.resolve('res/locales'),
                path.join(options.dir, 'plugin-asl/locales'),
                { recursive: true },
            );
        },
    };
}

export default defineConfig({
    plugins: [vue(), injectCss(), copyLocales()],
    define: {
        'process.env.NODE_ENV': JSON.stringify('production'),
    },
    build: {
        target: 'es2020',
        outDir: 'dist',
        emptyOutDir: !testIife,
        sourcemap: false,
        lib: {
            entry: path.resolve('src/plugin.js'),
            formats: [testIife ? 'iife' : 'es'],
            name: 'KiwiPluginAsl',
            fileName: () => (testIife ? 'plugin-asl.test-iife.js' : 'plugin-asl.mjs'),
        },
        rollupOptions: {
            // Provided by Kiwi at runtime through its import map
            external: ['vue', 'kiwiirc'],
            output: {
                globals: { vue: 'kiwi.Vue', kiwiirc: 'kiwi' },
            },
        },
    },
});
