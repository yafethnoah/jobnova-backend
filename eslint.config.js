const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  ...expoConfig,
  {
    ignores: ["dist/*", ".expo/*"]
  },
  {
    files: ["backend/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        __dirname: "readonly",
        __filename: "readonly",
        Buffer: "readonly",
        module: "readonly",
        require: "readonly",
        process: "readonly",
        console: "readonly"
      }
    }
  },
  {
    rules: {
      "no-console": "warn"
    }
  }
]);
