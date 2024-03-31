/*
   The following section is used to document custom types used to represent
   various dependencies-related objects.
 */

/**
 * The object returned by `safeSelf()`.
 * @typedef {Object} safe
 * @property {function(Object, string, Object): Object} Object_defineProperty
 * @property {function(string, function=): Object} JSON_parse
 * @property {function(Object, function=, string=): string} JSON_stringify
 * @property {function(string, string=): RegExp} patternToRegex
 * @property {function(Array, Number): Object.<string, string>} getExtraArgs
 */

/*
   The following section is used to document the external dependencies used
   as helper functions for the scriptlets in this document.
 */

/**
 * Provide protected JavaScript methods for scriptlets.
 * @external safeSelf
 * @example
 * const safe = safeSelf();
 * safe.uboLog("Hello, world!");
 * @returns {safe} An object with protected methods as its properties.
 * @author Raymond Hill <rhill@raymondhill.net>
 * @license GPL-3.0-or-later
 */

/**
 * Run the specified function at the specified loading state of the document.
 * @external runAt
 * @example
 * function foo() {
 *     console.log("Hello world!");
 * }
 * runAt(foo, "loading");
 * @param {function} func - A function to be run at the specified document
 *                          loading state.
 * @param {string} when - A string representing a valid value of the
 *                        `Document.readyState` property.
 * @author Raymond Hill <rhill@raymondhill.net>
 * @license GPL-3.0-or-later
 */

/**
 * Get the value of the specified cookie name.
 * @external getCookieFn
 * @example
 * let theme = getCookieFn("theme");
 * setTheme(theme);
 * @param {string} name - A string representing the cookie name to be fetched.
 * @author Raymond Hill <rhill@raymondhill.net>
 * @license GPL-3.0-or-later
 */

/*
   The following section is used to implement ready-to-use scriptlets for
   uBlock Origin.
 */

/**
 * Redirects opened URL by replacing its hostname with the specified hostname.
 * @example
 * www.reddit.com##+js(rh, old.reddit.com)
 * @description
 * The scriptlet also accepts an optional token `exclude`, followed by a valid
 * regex representing hrefs we want to exclude from redirection.
 * @param {string} hostname - A valid string representation of a hostname we
 *                            want to be redirected to.
 * */
/// redirect-hostname.js
/// alias rh.js
/// world isolated
/// dependency safe-self.fn
function redirectHostname(hostname = "") {
    if (hostname === "") {
        return;
    }
    const safe = safeSelf();
    const extraArgs = safe.getExtraArgs(Array.from(arguments), 1);
    if (extraArgs.exclude) {
        const reExclude = safe.patternToRegex(extraArgs.exclude);
        if (reExclude.test(window.location)) {
            return;
        }
    }
    let targetOrigin;
    if (hostname.startsWith("https://")) {
        targetOrigin = hostname;
    } else {
        targetOrigin = "https://" + hostname;
    }
    try {
        new URL(targetOrigin);
    } catch (error) {
        return;
    }
    window.location.replace(
        targetOrigin
        + window.location.pathname
        + window.location.search
        + window.location.hash
    );
}

/**
 * Sets the specified attribute-value pair on the specified node at the
 * specified document loading state.
 * @example
 * github.com##+js(sa, html, data-color-mode, dark)
 * @param {string} selector - A valid CSS selector of the targeted DOM node.
 * @param {string} attribute - The name of the attribute being set.
 * @param {string} [value] - The value of the attribute being set.
 * @param {string} [when] - A valid value of the `Document.readyState` property.
 */
/// set-attribute.js
/// alias sa.js
/// world isolated
/// dependency run-at.fn
function setAttribute(selector = "", attribute = "", value = "", when = "complete") {
    if (selector === "" || attribute === "") {
        return;
    }
    function setAttr() {
        const nodes = document.querySelectorAll(selector);
        try {
            nodes.forEach((node) => {
                node.setAttribute(attribute, value);
            });
        } catch (error) {
            console.log(error);
        }
    }
    function debounce(func, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }
    const callback = (_, observer) => {
        observer.disconnect();
        setAttr();
        observer.observe(document.documentElement, {
            subtree: true, childList: true, attributeFilter: [attribute]
        });
    };
    const debouncedCallback = debounce(callback, 20);
    const observer = new MutationObserver(debouncedCallback);
    runAt(() => {
        setAttr();
        observer.observe(document.documentElement, {
            subtree: true, childList: true, attributeFilter: [attribute]
        });
    }, when);
}

/**
 * Prevents and spoofs the response of a fetch call mathing the specified options.
 * @example
 * theathletic.com##+js(sf, api.theathletic.com/graphql body:PostEvent, '{"data":{"postEvent":true}}')
 * @param {string} optionsToMatch - A string of space-separated fetch options
 *                                  to be matched.
 * @param {string} responseBody - A string used to spoof the response call.
 */
/// spoof-fetch.js
/// alias sf.js
/// dependency safe-self.fn
function spoofFetch(optionsToMatch = "", responseBody = "") {
    if (optionsToMatch === "" || responseBody === "") {
        return;
    }
    const safe = safeSelf();
    const needles = [];
    const conditions = optionsToMatch.split(" ");
    conditions.forEach((condition) => {
        const setting = condition.split(":", 2);
        let key, needle;
        if (setting.length === 2) {
            key = setting[0];
            needle = safe.patternToRegex(setting[1]);
        } else {
            key = "url";
            needle = safe.patternToRegex(setting[0]);
        }
        needles.push({ key, needle });
    });
    self.fetch = new Proxy(self.fetch, {
        apply(target, thisArg, args) {
            let options;
            if (args[0] instanceof Request) {
                options = args[0];
            } else {
                options = Object.assign({ url: args[0] }, args[1]);
            }
            try {
                const settings = new Map();
                for (const option in options) {
                    let value = options[option];
                    if (typeof value !== "string") {
                        try {
                            value = safe.JSON_stringify(value);
                        } catch (error) {
                            console.log(error);
                            continue;
                        }
                    }
                    settings.set(option, value);
                }
                for (const { key, needle } of needles) {
                    if (settings.has(key) === false || needle.test(settings.get(key)) === false) {
                        return Reflect.apply(target, thisArg, args);
                    }
                }
            } catch (error) {
                console.log(error);
            }
            let responseType = "";
            if (options.mode === undefined || options.mode === "cors") {
                try {
                    const destinationURL = new URL(options.url);
                    if (destinationURL.origin !== document.location.origin) {
                        responseType = "cors";
                    } else {
                        responseType = "basic";
                    }
                } catch (error) {
                    console.log(error);
                }
            }
            const spoofedResponse = new Response(responseBody, {
                statusText: "OK",
                headers: {
                    "Content-Length": responseBody.length.toString()
                }
            });
            safe.Object_defineProperty(spoofedResponse, "url", {
                value: options.url
            });
            if (responseType !== "") {
                safe.Object_defineProperty(spoofedResponse, "type", {
                    value: responseType
                });
            }
            return spoofedResponse;
        }
    });
}

/**
 * Automatically claims bonus channel points on Twitch.
 * @example
 * twitch.tv##+js(twitch-claim-bonus)
 */
/// twitch-claim-bonus.js
/// world isolated
/// dependency get-cookie.fn
function twitchClaimBonus() {
    if (/^\/videos\//.test(document.location.pathname)) {
        return;
    }
    if (getCookieFn("login") === undefined) {
        return;
    }
    console.log("Checking for button container...");
    function leadingDebounce(func, delay) {
        let timer;
        return (...args) => {
            if (timer === undefined) {
                func.apply(this, args);
            }
            clearTimeout(timer);
            timer = setTimeout(() => {
                timer = undefined;
            }, delay);
        };
    }
    const logAttempt = (success) => {
        if (success) {
            console.log("Bonus point claim succeed!");
        } else {
            console.log("Bonus point button isn't found!");
        }
    };
    function checkButton(element) {
        let debouncedLog = leadingDebounce(logAttempt, 10000);
        const callback = () => {
            try {
                document.getElementsByClassName("claimable-bonus__icon")[0].click();
                debouncedLog = leadingDebounce(logAttempt, 10000);
                debouncedLog(true);
            } catch (error) {
                debouncedLog(false);
            }
        };
        const observer = new MutationObserver(callback);
        observer.observe(element, { subtree: true, childList: true });
    }
    const callback = (_, observer) => {
        const elements = document.getElementsByClassName("chat-input__buttons-container");
        if (elements.length > 0) {
            console.log(`Button container found! Initiating auto-claim...`);
            observer.disconnect();
            checkButton(elements[0]);
        }
    };
    const observer = new MutationObserver(callback);
    observer.observe(document, { subtree: true, childList: true });
}
