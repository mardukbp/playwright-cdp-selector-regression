# Selector engines registered before `connectOverCDP()` are missing in the default context

Last good version: 1.52.0. First bad version: 1.53.0. Still fails in 1.65.1.

## Steps to reproduce

```sh
npm ci
npm run install-browser
npm run chrome            # starts Chromium with --remote-debugging-port=9222
```

In a second terminal:

```sh
npm run test:1.52.0      # prints "hello"
npm run test:1.53.0      # fails with locator.textContent: Unknown engine "tag" while parsing selector tag=div
```
