module.exports = {
    "env": {
        "browser": true
    },
    "extends": "eslint:recommended",
    "globals": {
        "exports": false,
        "require": false,
        "Promise": false,
        "module": false
    },
    "parserOptions": {
      "ecmaVersion": 6,
      "ecmaFeatures": {
        "experimentalObjectRestSpread": true
      }
    },    
    "rules": {
        "no-console":0,
        "indent": [
            2,
            2
        ],
        "linebreak-style": [
            2,
            "unix"
        ],
        "quotes": [
            2,
            "single"
        ],
        "semi": [
            2,
            "always"
        ]
    }
};
