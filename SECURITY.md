# Security

webxdc mini apps run in a webview **without internet access**.

* The Studio has no network code and no runtime dependencies.
* Imported projects and the apps you build run only inside sandboxed preview frames (`allow-scripts`, no same-origin access to the Studio).
* Imported `.xdc` and ZIP files are checked for size, file count and paths before anything is stored.

If you find a vulnerability, please report it privately to the maintainer through the repository's issue tracker, asking for a private contact, before publishing details.
