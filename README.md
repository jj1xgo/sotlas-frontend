# SOTLAS

This is the Vue.js based frontend for SOTLAS (https://sotl.as), an interactive atlas of summits for the [Summits On The Air](https://www.sota.org.uk/) amateur radio program.

## Project setup
```
npm install
```

This also installs the exact-pinned Playwright MCP development dependency used
by `.mcp.json`.

### agent-container

Project-specific Node.js and Debian packages are declared in
`.agent-container.d/`. After updating a checkout from the former
`.claude-container.d/` layout, review and migrate anything still needed, then
remove the entire legacy directory before running `agentctl doctor` or starting
a new runtime. An empty `.claude-container.d/` directory is also unsupported.

### FontAwesome Pro (optional)
This project uses a few [FontAwesome Pro](https://fontawesome.com/) icons. A Pro
subscription is **not required** to build or develop: if the `NPM_FONTAWESOME_TOKEN`
environment variable is not set, `npm install` automatically falls back to
equivalent free icons (see `src/fa-pro-fallback/`) instead of failing.

If you do have a Pro subscription, set `NPM_FONTAWESOME_TOKEN` to your token
before running `npm install` and the Pro icons will be installed and used as normal.

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Run your tests
```
npm run test
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
