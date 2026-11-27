# Selector engines registered before `connectOverCDP()` are missing in the default context

Last good version: 1.52.0. First bad version: 1.53.0.

## Setup

```sh
npm ci
npm run install-browser
npm run chrome            # starts Chromium with --remote-debugging-port=9222
```

Run the tests below in a second terminal.

## 1. Engine missing in the default context (#44381, fixed by #44389)

```sh
npm run test:1.52.0      # prints "hello"
npm run test:1.53.0      # fails with locator.textContent: Unknown engine "tag" while parsing selector tag=div
npm run test:next        # prints "hello"
```

## 2. Engine still missing in pages that logged a DOM element before the connect

`repro-console.js` opens a page through Chromium's `/json/new` endpoint, without Playwright.
The page logs `document.body` while it loads, as many apps do when they start
(`console.log("init", document.body)`). Then the script registers the engine,
connects with `connectOverCDP()` and uses the engine in that page.

```sh
npm run test-console-log-element:1.52.0   # prints "hello"
npm run test-console-log-element:1.53.0   # fails with Unknown engine "tag" while parsing selector tag=div
npm run test-console-log-element:next     # fails with TypeError: Cannot read properties of undefined (reading 'queryAll')
npm run test-console-log-string:next      # the page logs a string instead: prints "hello"
```

| playwright-core | page logs an element | page logs a string |
|---|---|---|
| 1.52.0 | `hello` | `hello` |
| 1.53.0 | `Unknown engine "tag"` | `Unknown engine "tag"` |
| 1.66.0-alpha-2026-11-27 (with #44389) | `TypeError: … reading 'queryAll'` | `hello` |

### Why

When Playwright attaches over CDP, Chromium replays the console messages the
page logged before. For an argument that is a DOM element, `createHandle()`
creates an `ElementHandle`, and `ElementHandle._initializePreview()` calls
`context.injectedScript()` in the main world. That injected script is created
during the attach, before `_browserFromConnectResult()` calls
`selectors._registerOnContext()`, so it gets `customEngines: []` and keeps it for
the lifetime of the document. With `DEBUG=pw:protocol` the `Runtime.evaluate`
that creates it shows `"customEngines":[]` right after the replayed
`Runtime.consoleAPICalled` with `"subtype":"node"`.

The server-side context knows the engine, so the selector passes parsing, and
the query then fails in the page, whose injected script has no `tag` engine.

Before 1.53.0 this worked because the server kept one `selectors` object for the
whole Playwright instance, and a context without its own selectors used it.
Engines registered before the connect were therefore known while the pages were
attached.

A fix: pass `selectorEngines` and `testIdAttributeName` with the
`connectOverCDP` request, so that the server creates the default context with
them, as `newContext()` and `launchPersistentContext()` already do.
