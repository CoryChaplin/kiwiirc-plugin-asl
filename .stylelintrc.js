module.exports = {
    extends: 'stylelint-config-standard',
    rules: {
        indentation: 4,
        'no-descending-specificity': null,
        'declaration-no-important': true,
        // @layer is standard CSS; this stylelint build predates it.
        'at-rule-no-unknown': [true, { ignoreAtRules: ['layer'] }],
    }
};
