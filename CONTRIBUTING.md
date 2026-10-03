# Contributing

Thanks for looking at Creator Studio.

## Development

1. Edit files in `src/`. There is no bundler and no runtime dependency; `src/modules.txt` sets the load order.
2. Run `python3 build.py --stage` and open `.stage/index.html` through any local web server, or build the `.xdc` files with `python3 build.py` and try them in Delta Chat.
3. Run the tests: `npm test`, `npm run test:e2e` and `npm run test:artifact`.

## Conventions

* Plain HTML, CSS and JavaScript, one shared global scope (webxdc loads scripts in order).
* Every user-facing string lives in `src/locales/` in English and Spanish, with the same keys in both.
* Generated templates must be complete in one language: no mixed texts.
* Comments in English, short, and only where the code needs them.
* Never load anything from the network.

## License

By contributing you agree that your contributions are licensed under the MIT License.
