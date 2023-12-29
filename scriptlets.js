// noinspection JSUnusedGlobalSymbols,JSUnresolvedReference,JSUndeclaredVariable,JSUnusedLocalSymbols

/*
   The following section is used to document custom types used to represent
   various dependencies-related objects.
 */

/**
 * The object returned by `safeSelf()`.
 * @typedef {Object} self
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
 * @returns {self} An object with protected methods as its properties.
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
 * Run the specified function after the root element of the page's document is
 * defined.
 * @external runAtHtmlElement
 * @example
 * function foo() {
 *     console.log("Hello world!");
 * }
 * runAtHtmlElement(foo);
 * @param {function} func - a function to be run after the page's root element
 *                          is defined
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
 * The scriptlet also accepts and optional token `exclude`, followed by a valid
 * string representation of hrefs we want to exclude from redirection.
 * @param {string} hostname - A valid string representation of a hostname we
 *                            want to be redirected to.
 * @license MIT
 * */
/// redirect-hostname.js
/// alias rh.js
/// world isolated
/// dependency safe-self.fn
function redirectHostname(hostname) {
    "use strict";
    if (hostname === undefined) {
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
        const url = new URL(targetOrigin);
        targetOrigin = url.href
    } catch (error) {
        return;
    }
    if (targetOrigin.endsWith("/")) {
        targetOrigin = targetOrigin.slice(0, -1)
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
 * @license MIT
 */
/// set-attribute.js
/// alias sa.js
/// world isolated
/// dependency run-at.fn
function setAttribute(selector, attribute, value, when) {
    "use strict";
    if (selector === undefined || attribute === undefined) {
        return;
    }
    if (value === undefined) {
        value = "";
    }
    if (when === undefined) {
        when = "complete";
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
 * Automatically claims bonus channel points on Twitch.
 * @example
 * twitch.tv##+js(twitch-claim-bonus)
 * @license MIT
 */
/// twitch-claim-bonus.js
/// world isolated
function twitchClaimBonus() {
    "use strict";
    if (/^\/videos\//.test(document.location.pathname)) {
        return;
    }
    function findCookie(name) {
        for (const cookie of document.cookie.split(/\s*;\s*/)) {
            const position = cookie.indexOf("=");
            if (position === -1) {
                continue;
            }
            if (cookie.slice(0, position) === name) {
                return true
            }
        }
        return false
    }
    if (!findCookie("login")) {
        return;
    }
    console.log(`Checking for button container... - ${Date()}`);
    function leadingDebounce(func, delay) {
        let timer;
        return (...args) => {
            if (!timer) {
                func.apply(this, args);
            }
            clearTimeout(timer);
            timer = setTimeout(() => {
                timer = undefined;
            }, delay);
        };
    }
    function logAttempt(success) {
        if (success) {
            console.log("Bonus point claim succeed!");
        } else {
            console.log("Bonus point button isn't found!");
        }
    }
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
            console.log(`Button container found! Initiating auto-claim... - ${Date()}`);
            observer.disconnect();
            checkButton(elements[0]);
        }
    };
    const observer = new MutationObserver(callback);
    observer.observe(document, { subtree: true, childList: true });
}

/**
 * Replace Twitch ads with ad-free segments.
 * @example
 * twitch.tv##+js(twitch-video-ad)
 * @author pixeltris, GloftOfficial, level3tjg
 * @license GPL-3.0-or-later
 * @see [Documentation]{@link https://github.com/pixeltris/TwitchAdSolutions}
 */
/// twitch-video-ad.js
function twitchVideoAd() {
    // "use strict";
    if (/(^|\.)twitch\.tv$/.test(document.location.hostname) === false) {
        return;
    }
    // This stops Twitch from pausing the player when in another tab and an ad shows.
    try {
        Object.defineProperty(document, "visibilityState", {
            get() {
                return "visible";
            },
        });
        Object.defineProperty(document, "hidden", {
            get() {
                return false;
            },
        });
        const block = (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        };
        const process = (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            // This corrects the background tab buffer bug when switching to the background tab for the first time after an extended period.
            doTwitchPlayerTask(false, false, true, false, false);
        };
        document.addEventListener("visibilitychange", block, true);
        document.addEventListener("webkitvisibilitychange", block, true);
        document.addEventListener("mozvisibilitychange", block, true);
        document.addEventListener("hasFocus", block, true);
        if (/Firefox/.test(navigator.userAgent)) {
            Object.defineProperty(document, "mozHidden", {
                get() {
                    return false;
                },
            });
        } else {
            Object.defineProperty(document, "webkitHidden", {
                get() {
                    return false;
                },
            });
        }
    } catch (error) { /* empty */ }
    // Send settings updates to worker.
    window.addEventListener(
        "message",
        (event) => {
            if (event.source !== window) {
                return;
            }
            if (event.data.type && event.data.type === "SetTwitchAdblockSettings" && event.data.settings) {
                TwitchAdblockSettings = event.data.settings;
            }
        },
        false
    );
    function declareOptions(scope) {
        scope.AdSignifier = "stitched";
        scope.ClientID = "kimne78kx3ncx6brgo4mv6wki5h1ko";
        scope.ClientVersion = "null";
        scope.ClientSession = "null";
        // scope.PlayerType1 = "site"; // Source - NOTE: This is unused as it's implicitly used by the website itself
        scope.PlayerType2 = "embed"; // Source
        scope.PlayerType3 = "proxy"; // Source
        scope.PlayerType4 = "autoplay"; // 360p
        scope.CurrentChannelName = null;
        scope.UsherParams = null;
        scope.WasShowingAd = false;
        scope.GQLDeviceID = null;
        scope.IsSquadStream = false;
        scope.StreamInfos = [];
        scope.StreamInfosByUrl = [];
        scope.MainUrlByUrl = [];
        scope.EncodingCacheTimeout = 60000;
        scope.DefaultProxyType = "Gloft";
        scope.DefaultForcedQuality = null;
        scope.DefaultProxyQuality = null;
        scope.ClientIntegrityHeader = null;
        scope.AuthorizationHeader = null;
    }
    declareOptions(window);
    let TwitchAdblockSettings = {
        BannerVisible: true,
        ForcedQuality: null,
        ProxyType: null,
        ProxyQuality: null,
    };
    let twitchMainWorker = null;
    let adBlockDiv = null;
    let OriginalVideoPlayerQuality = null;
    let IsPlayerAutoQuality = null;
    const oldWorker = window.Worker;
    window.Worker = class Worker extends oldWorker {
        constructor(twitchBlobUrl) {
            if (twitchMainWorker) {
                super(twitchBlobUrl);
                return;
            }
            let jsURL = getWasmWorkerUrl(twitchBlobUrl);
            if (typeof jsURL !== "string") {
                super(twitchBlobUrl);
                return;
            }
            const newBlobStr = `
                ${getStreamUrlForResolution.toString()}
                ${getStreamForResolution.toString()}
                ${stripUnusedParams.toString()}
                ${processM3U8.toString()}
                ${hookWorkerFetch.toString()}
                ${declareOptions.toString()}
                ${getAccessToken.toString()}
                ${gqlRequest.toString()}
                ${adRecordgqlPacket.toString()}
                ${tryNotifyTwitch.toString()}
                ${parseAttributes.toString()}
                declareOptions(self);
                self.TwitchAdblockSettings = ${JSON.stringify(TwitchAdblockSettings)};
                self.addEventListener("message", function(e) {
                    if (e.data.key == "UpdateIsSquadStream") {
                        IsSquadStream = e.data.value;
                    } else if (e.data.key == "UpdateClientVersion") {
                        ClientVersion = e.data.value;
                    } else if (e.data.key == "UpdateClientSession") {
                        ClientSession = e.data.value;
                    } else if (e.data.key == "UpdateClientId") {
                        ClientID = e.data.value;
                    } else if (e.data.key == "UpdateDeviceId") {
                        GQLDeviceID = e.data.value;
                    } else if (e.data.key == "UpdateClientIntegrityHeader") {
                        ClientIntegrityHeader = e.data.value;
                    } else if (e.data.key == "UpdateAuthorizationHeader") {
                        AuthorizationHeader = e.data.value;
                    }
                });
                hookWorkerFetch();
                importScripts("${jsURL}");
            `;
            super(URL.createObjectURL(new Blob([newBlobStr])));
            twitchMainWorker = this;
            this.onmessage = function(e) {
                if (e.data.key === "ShowAdBlockBanner") {
                    if (!TwitchAdblockSettings.BannerVisible) {
                        return;
                    }
                    if (adBlockDiv == null) {
                        adBlockDiv = getAdBlockDiv();
                    }
                    adBlockDiv.P.textContent = "Blocking ads...";
                    adBlockDiv.style.display = "block";
                } else if (e.data.key === "HideAdBlockBanner") {
                    if (adBlockDiv == null) {
                        adBlockDiv = getAdBlockDiv();
                    }
                    adBlockDiv.style.display = "none";
                } else if (e.data.key === "PauseResumePlayer") {
                    doTwitchPlayerTask(true, false, false, false, false);
                } else if (e.data.key === "ForceChangeQuality") {
                    // This is used to fix the bug where the video would freeze.
                    try {
                        if (navigator.userAgent.toLowerCase().indexOf("firefox") === -1) {
                            return;
                        }
                        const autoQuality = doTwitchPlayerTask(false, false, false, true, false);
                        const currentQuality = doTwitchPlayerTask(false, true, false, false, false);
                        if (IsPlayerAutoQuality == null) {
                            IsPlayerAutoQuality = autoQuality;
                        }
                        if (OriginalVideoPlayerQuality == null) {
                            OriginalVideoPlayerQuality = currentQuality;
                        }
                        if (!currentQuality.includes("360") || e.data.value != null) {
                            if (!OriginalVideoPlayerQuality.includes("360")) {
                                const settingsMenu = document.querySelector('div[data-a-target="player-settings-menu"]');
                                if (settingsMenu == null) {
                                    const settingsCog = document.querySelector('button[data-a-target="player-settings-button"]');
                                    if (settingsCog) {
                                        settingsCog.click();
                                        const qualityMenu = document.querySelector('button[data-a-target="player-settings-menu-item-quality"]');
                                        if (qualityMenu) {
                                            qualityMenu.click();
                                        }
                                        const lowQuality = document.querySelectorAll('input[data-a-target="tw-radio"]');
                                        if (lowQuality) {
                                            let qualityToSelect = lowQuality.length - 2;
                                            if (e.data.value != null) {
                                                if (e.data.value.includes("original")) {
                                                    e.data.value = OriginalVideoPlayerQuality;
                                                    if (IsPlayerAutoQuality) {
                                                        e.data.value = "auto";
                                                    }
                                                }
                                                if (e.data.value.includes("160p")) {
                                                    qualityToSelect = 5;
                                                }
                                                if (e.data.value.includes("360p")) {
                                                    qualityToSelect = 4;
                                                }
                                                if (e.data.value.includes("480p")) {
                                                    qualityToSelect = 3;
                                                }
                                                if (e.data.value.includes("720p")) {
                                                    qualityToSelect = 2;
                                                }
                                                if (e.data.value.includes("822p")) {
                                                    qualityToSelect = 2;
                                                }
                                                if (e.data.value.includes("864p")) {
                                                    qualityToSelect = 2;
                                                }
                                                if (e.data.value.includes("900p")) {
                                                    qualityToSelect = 2;
                                                }
                                                if (e.data.value.includes("936p")) {
                                                    qualityToSelect = 2;
                                                }
                                                if (e.data.value.includes("960p")) {
                                                    qualityToSelect = 2;
                                                }
                                                if (e.data.value.includes("1080p")) {
                                                    qualityToSelect = 2;
                                                }
                                                if (e.data.value.includes("source")) {
                                                    qualityToSelect = 1;
                                                }
                                                if (e.data.value.includes("auto")) {
                                                    qualityToSelect = 0;
                                                }
                                            }
                                            const currentQualityLS = window.localStorage.getItem("video-quality");
                                            lowQuality[qualityToSelect].click();
                                            window.localStorage.setItem("video-quality", currentQualityLS);
                                            if (e.data.value != null) {
                                                OriginalVideoPlayerQuality = null;
                                                IsPlayerAutoQuality = null;
                                                doTwitchPlayerTask(false, false, false, true, true);
                                            }
                                        }
                                        settingsCog.click();
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        OriginalVideoPlayerQuality = null;
                        IsPlayerAutoQuality = null;
                    }
                }
            };
            function getAdBlockDiv() {
                // To display a notification to the user, that an ad is being blocked.
                const playerRootDiv = document.querySelector(".video-player");
                adBlockDiv = null;
                if (playerRootDiv != null) {
                    adBlockDiv = playerRootDiv.querySelector(".adblock-overlay");
                    if (adBlockDiv == null) {
                        adBlockDiv = document.createElement("div");
                        adBlockDiv.className = "adblock-overlay";
                        adBlockDiv.innerHTML =
                            '<div class="player-adblock-notice" style="color: white; background-color: rgba(0, 0, 0, 0.8); position: absolute; top: 0; left: 0; padding: 5px;"><p></p></div>';
                        adBlockDiv.style.display = "none";
                        adBlockDiv.P = adBlockDiv.querySelector("p");
                        playerRootDiv.appendChild(adBlockDiv);
                    }
                }
                return adBlockDiv;
            }
        }
    };
    function getWasmWorkerUrl(twitchBlobUrl) {
        const req = new XMLHttpRequest();
        req.open("GET", twitchBlobUrl, false);
        req.send();
        return req.responseText.split("'")[1];
    }
    function hookWorkerFetch() {
        console.log("Twitch ad blocker is enabled");
        let realFetch = fetch;
        fetch = async function(url, options) {
            if (typeof url === "string") {
                if (url.includes("video-weaver")) {
                    return new Promise(function(resolve, reject) {
                        let processAfter = async function(response) {
                            // Here we check the m3u8 for any ads and also try fallback player types if needed.
                            const responseText = await response.text();
                            let weaverText = await processM3U8(url, responseText, realFetch, PlayerType2);
                            if (weaverText.includes(AdSignifier)) {
                                weaverText = await processM3U8(url, responseText, realFetch, PlayerType3);
                            }
                            if (weaverText.includes(AdSignifier)) {
                                weaverText = await processM3U8(url, responseText, realFetch, PlayerType4);
                            }
                            resolve(new Response(weaverText));
                        };
                        let send = function() {
                            return realFetch(url, options)
                                .then(function(response) {
                                    processAfter(response);
                                })
                                ["catch"](function(error) {
                                    reject(error);
                                });
                        };
                        send();
                    });
                } else if (url.includes("/api/channel/hls/")) {
                    const channelName = new URL(url).pathname.match(/([^\/]+)(?=\.\w+$)/)[0];
                    UsherParams = new URL(url).search;
                    CurrentChannelName = channelName;
                    // To prevent pause/resume loop for mid-rolls.
                    let isPBYPRequest = url.includes("picture-by-picture");
                    if (isPBYPRequest) {
                        url = "";
                    }
                    return new Promise(function(resolve, reject) {
                        let processAfter = async function(response) {
                            if (response.status === 200) {
                                const encodingsM3u8 = await response.text();
                                let streamInfo = StreamInfos[channelName];
                                if (streamInfo == null) {
                                    StreamInfos[channelName] = streamInfo = {};
                                }
                                streamInfo.ChannelName = channelName;
                                streamInfo.RequestedAds = new Set();
                                streamInfo.Urls = []; // xxx.m3u8 -> { Resolution: "284x160", FrameRate: 30.0 }
                                streamInfo.EncodingsM3U8Cache = [];
                                streamInfo.EncodingsM3U8 = encodingsM3u8;
                                const lines = encodingsM3u8.replace("\r", "").split("\n");
                                for (let i = 0; i < lines.length; i++) {
                                    if (!lines[i].startsWith("#") && lines[i].includes(".m3u8")) {
                                        streamInfo.Urls[lines[i]] = -1;
                                        if (i > 0 && lines[i - 1].startsWith("#EXT-X-STREAM-INF")) {
                                            const attributes = parseAttributes(lines[i - 1]);
                                            const resolution = attributes["RESOLUTION"];
                                            const frameRate = attributes["FRAME-RATE"];
                                            if (resolution) {
                                                streamInfo.Urls[lines[i]] = {
                                                    Resolution: resolution,
                                                    FrameRate: frameRate,
                                                };
                                            }
                                        }
                                        StreamInfosByUrl[lines[i]] = streamInfo;
                                        MainUrlByUrl[lines[i]] = url;
                                    }
                                }
                                resolve(new Response(encodingsM3u8));
                            } else {
                                resolve(response);
                            }
                        };
                        let send = function() {
                            return realFetch(url, options)
                                .then(function(response) {
                                    processAfter(response);
                                })
                                ["catch"](function(error) {
                                    reject(error);
                                });
                        };
                        send();
                    });
                }
            }
            return realFetch.apply(this, arguments);
        };
    }
    function getStreamUrlForResolution(encodingsM3u8, resolutionInfo, qualityOverrideStr) {
        let qualityOverride = 0;
        if (qualityOverrideStr && qualityOverrideStr.endsWith("p")) {
            qualityOverride = qualityOverrideStr.slice(0, qualityOverrideStr.length - 1) | 0;
        }
        let qualityOverrideFoundQuality = 0;
        let qualityOverrideFoundFrameRate = 0;
        const encodingsLines = encodingsM3u8.replace("\r", "").split("\n");
        let firstUrl = null;
        let lastUrl = null;
        let matchedResolutionUrl = null;
        let matchedFrameRate = false;
        for (let i = 0; i < encodingsLines.length; i++) {
            if (!encodingsLines[i].startsWith("#") && encodingsLines[i].includes(".m3u8")) {
                if (i > 0 && encodingsLines[i - 1].startsWith("#EXT-X-STREAM-INF")) {
                    const attributes = parseAttributes(encodingsLines[i - 1]);
                    const resolution = attributes["RESOLUTION"];
                    const frameRate = attributes["FRAME-RATE"];
                    if (resolution) {
                        if (qualityOverride) {
                            const quality = resolution.toLowerCase().split("x")[1];
                            if (quality === qualityOverride.toString()) {
                                qualityOverrideFoundQuality = quality;
                                qualityOverrideFoundFrameRate = frameRate;
                                matchedResolutionUrl = encodingsLines[i];
                                if (frameRate < 40) {
                                    // console.log(`qualityOverride(A) quality:${quality} frameRate:${frameRate}`);
                                    return matchedResolutionUrl;
                                }
                            } else if (quality < qualityOverride) {
                                // if (matchedResolutionUrl) {
                                //     console.log(`qualityOverride(B) quality:${qualityOverrideFoundQuality} frameRate:${qualityOverrideFoundFrameRate}`);
                                // } else {
                                //     console.log(`qualityOverride(C) quality:${quality} frameRate:${frameRate}`);
                                // }
                                return matchedResolutionUrl ? matchedResolutionUrl : encodingsLines[i];
                            }
                        } else if (
                            (!resolutionInfo || resolution === resolutionInfo.Resolution)
                            && (!matchedResolutionUrl || (!matchedFrameRate && frameRate === resolutionInfo.FrameRate))
                        ) {
                            matchedResolutionUrl = encodingsLines[i];
                            matchedFrameRate = frameRate === resolutionInfo.FrameRate;
                            if (matchedFrameRate) {
                                return matchedResolutionUrl;
                            }
                        }
                    }
                    if (firstUrl == null) {
                        firstUrl = encodingsLines[i];
                    }
                    lastUrl = encodingsLines[i];
                }
            }
        }
        if (qualityOverride) {
            return lastUrl;
        }
        return matchedResolutionUrl ? matchedResolutionUrl : firstUrl;
    }
    async function getStreamForResolution(
        streamInfo,
        resolutionInfo,
        encodingsM3u8,
        fallbackStreamStr,
        playerType,
        realFetch
    ) {
        let qualityOverride = null;
        if (playerType === "proxy") {
            qualityOverride = TwitchAdblockSettings.ProxyQuality
                ? TwitchAdblockSettings.ProxyQuality
                : DefaultProxyQuality;
        }
        if (
            streamInfo.EncodingsM3U8Cache[playerType].Resolution !== resolutionInfo.Resolution
            || streamInfo.EncodingsM3U8Cache[playerType].RequestTime < Date.now() - EncodingCacheTimeout
        ) {
            console.log(
                `Blocking ads (type:${playerType}, resolution:${resolutionInfo.Resolution}, frameRate:${resolutionInfo.FrameRate}, qualityOverride:${qualityOverride})`
            );
        }
        streamInfo.EncodingsM3U8Cache[playerType].RequestTime = Date.now();
        streamInfo.EncodingsM3U8Cache[playerType].Value = encodingsM3u8;
        streamInfo.EncodingsM3U8Cache[playerType].Resolution = resolutionInfo.Resolution;
        const streamM3u8Url = getStreamUrlForResolution(encodingsM3u8, resolutionInfo, qualityOverride);
        const streamM3u8Response = await realFetch(streamM3u8Url);
        if (streamM3u8Response.status === 200) {
            const m3u8Text = await streamM3u8Response.text();
            WasShowingAd = true;
            postMessage({
                key: "ShowAdBlockBanner",
            });
            postMessage({
                key: "ForceChangeQuality",
            });
            if (!m3u8Text || m3u8Text.includes(AdSignifier)) {
                streamInfo.EncodingsM3U8Cache[playerType].Value = null;
            }
            return m3u8Text;
        } else {
            streamInfo.EncodingsM3U8Cache[playerType].Value = null;
            return fallbackStreamStr;
        }
    }
    function stripUnusedParams(str, params) {
        if (!params) {
            params = ["token", "sig"];
        }
        const tempUrl = new URL("https://localhost/" + str);
        for (let i = 0; i < params.length; i++) {
            tempUrl.searchParams.delete(params[i]);
        }
        return tempUrl.pathname.substring(1) + tempUrl.search;
    }
    async function processM3U8(url, textStr, realFetch, playerType) {
        // Checks the m3u8 for ads and if it finds one, instead returns an ad-free stream.
        const streamInfo = StreamInfosByUrl[url];
        // Ad blocking for squad streams is disabled due to the way multiple weaver urls are used. No workaround so far.
        if (IsSquadStream === true) {
            return textStr;
        }
        if (!textStr) {
            return textStr;
        }
        // Some live streams use mp4.
        if (!textStr.includes(".ts") && !textStr.includes(".mp4")) {
            return textStr;
        }
        const haveAdTags = textStr.includes(AdSignifier);
        if (haveAdTags) {
            const isMidroll = textStr.includes('"MIDROLL"') || textStr.includes('"midroll"');
            // Reduces ad frequency. TODO: Reduce the number of requests. This is really spamming Twitch with requests.
            if (!isMidroll) {
                if (playerType === PlayerType2) {
                    const lines = textStr.replace("\r", "").split("\n");
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        if (line.startsWith("#EXTINF") && lines.length > i + 1) {
                            if (!line.includes(",live") && !streamInfo.RequestedAds.has(lines[i + 1])) {
                                // Only request one .ts file per .m3u8 request to avoid making too many requests
                                // console.log('Fetch ad .ts file');
                                streamInfo.RequestedAds.add(lines[i + 1]);
                                fetch(lines[i + 1]).then((response) => {
                                    response.blob();
                                });
                                break;
                            }
                        }
                    }
                }
                try {
                    // tryNotifyTwitch(textStr);
                } catch (error) { /* empty */ }
            }
            let currentResolution = null;
            if (streamInfo && streamInfo.Urls) {
                for (const [resUrl, resInfo] of Object.entries(streamInfo.Urls)) {
                    if (resUrl === url) {
                        currentResolution = resInfo;
                        // console.log(resInfo.Resolution);
                        break;
                    }
                }
            }
            // Keep the m3u8 around for a little while (once per ad) before requesting a new one
            const encodingsM3U8Cache = streamInfo.EncodingsM3U8Cache[playerType];
            if (encodingsM3U8Cache) {
                if (encodingsM3U8Cache.Value && encodingsM3U8Cache.RequestTime >= Date.now() - EncodingCacheTimeout) {
                    try {
                        const result = getStreamForResolution(
                            streamInfo,
                            currentResolution,
                            encodingsM3U8Cache.Value,
                            null,
                            playerType,
                            realFetch
                        );
                        if (result) {
                            return result;
                        }
                    } catch (error) {
                        encodingsM3U8Cache.Value = null;
                    }
                }
            } else {
                streamInfo.EncodingsM3U8Cache[playerType] = {
                    RequestTime: Date.now(),
                    Value: null,
                    Resolution: null,
                };
            }
            if (playerType === "proxy") {
                try {
                    const proxyType = TwitchAdblockSettings.ProxyType
                        ? TwitchAdblockSettings.ProxyType
                        : DefaultProxyType;
                    let encodingsM3u8Response = null;
                    // const tempUrl = stripUnusedParams(MainUrlByUrl[url]);
                    // const match = /(hls|vod)\/(.+?)$/gim.exec(tempUrl);
                    switch (proxyType) {
                        case "Gloft":
                            try {
                                encodingsM3u8Response = await realFetch(
                                    String(atob("aHR0cHM6Ly9hZGJsb2NrLmdsb2Z0Lm1lLz9jaGFuPQ==") + CurrentChannelName),
                                    { method: "GET" }
                                );
                            } catch (error) { /* empty */ }
                            break;
                        case "TTV LOL":
                            encodingsM3u8Response = await realFetch(
                                "https://api.ttv.lol/playlist/"
                                + CurrentChannelName
                                + ".m3u8%3Fallow_source%3Dtrue" /* + encodeURIComponent(match[2]) */,
                                { headers: { "X-Donate-To": "https://ttv.lol/donate" } }
                            );
                            break;
                        // case 'Purple Adblock':  // Broken...
                        //     encodingsM3u8Response = await realFetch('https://eu1.jupter.ga/channel/' + CurrentChannelName);
                        case "Falan":  // https://greasyfork.org/en/scripts/425139-twitch-ad-fix/code
                            encodingsM3u8Response = await realFetch(
                                atob("aHR0cHM6Ly9qaWdnbGUuYmV5cGF6YXJpZ3VydXN1LndvcmtlcnMuZGV2")
                                + "/hls/"
                                + CurrentChannelName
                                + ".m3u8%3Fallow_source%3Dtrue" /* + encodeURIComponent(match[2]) */
                            );
                            break;
                    }
                    if (encodingsM3u8Response && encodingsM3u8Response.status === 200) {
                        return getStreamForResolution(
                            streamInfo,
                            currentResolution,
                            await encodingsM3u8Response.text(),
                            textStr,
                            playerType,
                            realFetch
                        );
                    }
                } catch (error) { /* empty */ }
                return textStr;
            }
            const accessTokenResponse = await getAccessToken(CurrentChannelName, playerType);
            if (accessTokenResponse.status === 200) {
                const accessToken = await accessTokenResponse.json();
                try {
                    const urlInfo = new URL(
                        "https://usher.ttvnw.net/api/channel/hls/" + CurrentChannelName + ".m3u8" + UsherParams
                    );
                    urlInfo.searchParams.set("sig", accessToken.data.streamPlaybackAccessToken.signature);
                    urlInfo.searchParams.set("token", accessToken.data.streamPlaybackAccessToken.value);
                    let encodingsM3u8Response = await realFetch(urlInfo.href);
                    if (encodingsM3u8Response.status === 200) {
                        return getStreamForResolution(
                            streamInfo,
                            currentResolution,
                            await encodingsM3u8Response.text(),
                            textStr,
                            playerType,
                            realFetch
                        );
                    } else {
                        return textStr;
                    }
                } catch (error) { /* empty */ }
                return textStr;
            } else {
                return textStr;
            }
        } else {
            if (WasShowingAd) {
                console.log("Finished blocking ads");
                WasShowingAd = false;
                // Here we put the player back to the best quality possible and remove the blocking message.
                postMessage({
                    key: "ForceChangeQuality",
                    value: "source",
                });
                postMessage({
                    key: "PauseResumePlayer",
                });
                postMessage({
                    key: "HideAdBlockBanner",
                });
            }
            return textStr;
        }
    }
    function parseAttributes(str) {
        // noinspection RegExpUnnecessaryNonCapturingGroup
        return Object.fromEntries(
            str.split(/(?:^|,)((?:[^=]*)=(?:"[^"]*"|[^,]*))/)
                .filter(Boolean)
                .map((x) => {
                    const idx = x.indexOf("=");
                    const key = x.substring(0, idx);
                    const value = x.substring(idx + 1);
                    const num = Number(value);
                    return [key, Number.isNaN(num) ? (value.startsWith('"') ? JSON.parse(value) : value) : num];
                })
        );
    }
    async function tryNotifyTwitch(streamM3u8) {
        // We notify that an ad was requested but was not visible and was also muted.
        const matches = streamM3u8.match(/#EXT-X-DATERANGE:(ID="stitched-ad-[^\n]+)\n/);
        if (matches.length > 1) {
            const attrString = matches[1];
            const attr = parseAttributes(attrString);
            const podLength = parseInt(attr["X-TV-TWITCH-AD-POD-LENGTH"] ? attr["X-TV-TWITCH-AD-POD-LENGTH"] : "1");
            // var podPosition = parseInt(attr["X-TV-TWITCH-AD-POD-POSITION"] ? attr["X-TV-TWITCH-AD-POD-POSITION"] : "0");
            const radToken = attr["X-TV-TWITCH-AD-RADS-TOKEN"];
            const lineItemId = attr["X-TV-TWITCH-AD-LINE-ITEM-ID"];
            const orderId = attr["X-TV-TWITCH-AD-ORDER-ID"];
            const creativeId = attr["X-TV-TWITCH-AD-CREATIVE-ID"];
            const adId = attr["X-TV-TWITCH-AD-ADVERTISER-ID"];
            const rollType = attr["X-TV-TWITCH-AD-ROLL-TYPE"].toLowerCase();
            const baseData = {
                stitched: true,
                roll_type: rollType,
                player_mute: true,
                player_volume: 0.0,
                visible: false,
            };
            for (let podPosition = 0; podPosition < podLength; podPosition++) {
                const extendedData = {
                    ...baseData,
                    ad_id: adId,
                    ad_position: podPosition,
                    duration: 0,
                    creative_id: creativeId,
                    total_ads: podLength,
                    order_id: orderId,
                    line_item_id: lineItemId,
                };
                await gqlRequest(adRecordgqlPacket("video_ad_impression", radToken, extendedData));
                for (let quartile = 0; quartile < 4; quartile++) {
                    await gqlRequest(
                        adRecordgqlPacket("video_ad_quartile_complete", radToken, {
                            ...extendedData,
                            quartile: quartile + 1,
                        })
                    );
                }
                await gqlRequest(adRecordgqlPacket("video_ad_pod_complete", radToken, baseData));
            }
        }
    }
    function adRecordgqlPacket(event, radToken, payload) {
        return [
            {
                operationName: "ClientSideAdEventHandling_RecordAdEvent",
                variables: {
                    input: {
                        eventName: event,
                        eventPayload: JSON.stringify(payload),
                        radToken,
                    },
                },
                extensions: {
                    persistedQuery: {
                        version: 1,
                        sha256Hash: "7e6c69e6eb59f8ccb97ab73686f3d8b7d85a72a0298745ccd8bfc68e4054ca5b",
                    },
                },
            },
        ];
    }
    function getAccessToken(channelName, playerType, realFetch) {
        const templateQuery =
            'query PlaybackAccessToken_Template($login: String!, $isLive: Boolean!, $vodID: ID!, $isVod: Boolean!, $playerType: String!) {  streamPlaybackAccessToken(channelName: $login, params: {platform: "android", playerBackend: "mediaplayer", playerType: $playerType}) @include(if: $isLive) {    value    signature    __typename  }  videoPlaybackAccessToken(id: $vodID, params: {platform: "android", playerBackend: "mediaplayer", playerType: $playerType}) @include(if: $isVod) {    value    signature    __typename  }}';
        const body = {
            operationName: "PlaybackAccessToken_Template",
            query: templateQuery,
            variables: {
                isLive: true,
                login: channelName,
                isVod: false,
                vodID: "",
                playerType: playerType,
            },
        };
        return gqlRequest(body, realFetch);
    }
    function gqlRequest(body, realFetch) {
        if (ClientIntegrityHeader == null) {
            // console.warn('ClientIntegrityHeader is null');
            // throw 'ClientIntegrityHeader is null';
        }
        const fetchFunc = realFetch ? realFetch : fetch;
        if (!GQLDeviceID) {
            const dcharacters = "abcdefghijklmnopqrstuvwxyz0123456789";
            const dcharactersLength = dcharacters.length;
            for (let i = 0; i < 32; i++) {
                GQLDeviceID += dcharacters.charAt(Math.floor(Math.random() * dcharactersLength));
            }
        }
        return fetchFunc("https://gql.twitch.tv/gql", {
            method: "POST",
            body: JSON.stringify(body),
            headers: {
                "Client-ID": ClientID,
                "Client-Integrity": ClientIntegrityHeader,
                "Device-ID": GQLDeviceID,
                "X-Device-Id": GQLDeviceID,
                "Client-Version": ClientVersion,
                "Client-Session-Id": ClientSession,
                "Authorization": AuthorizationHeader,
            },
        });
    }
    function doTwitchPlayerTask(isPausePlay, isCheckQuality, isCorrectBuffer, isAutoQuality, setAutoQuality) {
        // This will do an instant pause/play to return to original quality once the ad is finished.
        // We also use this function to get the current video player quality set by the user.
        // We also use this function to quickly pause/play the player when switching tabs to stop delays.
        try {
            // var videoController = null;
            let videoPlayer = null;
            function findReactNode(root, constraint) {
                if (root.stateNode && constraint(root.stateNode)) {
                    return root.stateNode;
                }
                let node = root.child;
                while (node) {
                    const result = findReactNode(node, constraint);
                    if (result) {
                        return result;
                    }
                    node = node.sibling;
                }
                return null;
            }
            let reactRootNode = null;
            const rootNode = document.querySelector("#root");
            if (
                rootNode
                && rootNode._reactRootContainer
                && rootNode._reactRootContainer._internalRoot
                && rootNode._reactRootContainer._internalRoot.current
            ) {
                reactRootNode = rootNode._reactRootContainer._internalRoot.current;
            }
            videoPlayer = findReactNode(reactRootNode, (node) => {
                node.setPlayerActive && node.props && node.props.mediaPlayerInstance;
            });
            videoPlayer =
                videoPlayer && videoPlayer.props && videoPlayer.props.mediaPlayerInstance
                    ? videoPlayer.props.mediaPlayerInstance
                    : null;
            if (isPausePlay) {
                videoPlayer.pause();
                videoPlayer.play();
                return;
            }
            if (isCheckQuality) {
                if (typeof videoPlayer.getQuality() == "undefined") {
                    return;
                }
                const playerQuality = JSON.stringify(videoPlayer.getQuality());
                if (playerQuality) {
                    return playerQuality;
                } else {
                    return;
                }
            }
            if (isAutoQuality) {
                if (typeof videoPlayer.isAutoQualityMode() == "undefined") {
                    return false;
                }
                const autoQuality = videoPlayer.isAutoQualityMode();
                if (autoQuality) {
                    videoPlayer.setAutoQualityMode(false);
                    return autoQuality;
                } else {
                    return false;
                }
            }
            if (setAutoQuality) {
                videoPlayer.setAutoQualityMode(true);
                return;
            }
            // This only happens when switching tabs and is to correct the high latency caused when opening background tabs and going to them at a later time.
            // We check that this is a live stream by the page URL, to prevent vod/clip pause/plays.
            try {
                const currentPageURL = document.URL;
                let isLive = true;
                if (currentPageURL.includes("videos/") || currentPageURL.includes("clip/")) {
                    isLive = false;
                }
                if (isCorrectBuffer && isLive) {
                    // A timer is needed due to the player not resuming without it.
                    setTimeout(function() {
                        // If latency to broadcaster is above 5 or 15 seconds upon switching tabs, we pause and play the player to reset the latency.
                        // If latency is between 0-6, user can manually pause and resume to reset latency further.
                        if (videoPlayer.isLiveLowLatency() && videoPlayer.getLiveLatency() > 5) {
                            videoPlayer.pause();
                            videoPlayer.play();
                        } else if (videoPlayer.getLiveLatency() > 15) {
                            videoPlayer.pause();
                            videoPlayer.play();
                        }
                    }, 3000);
                }
            } catch (error) { /* empty */ }
        } catch (error) { /* empty */ }
    }
    let localDeviceID = null;
    localDeviceID = window.localStorage.getItem("local_copy_unique_id");
    function hookFetch() {
        let realFetch = window.fetch;
        window.fetch = function(url, init, ...args) {
            if (typeof url === "string") {
                // Check if squad stream.
                if (window.location.pathname.includes("/squad")) {
                    if (twitchMainWorker) {
                        twitchMainWorker.postMessage({
                            key: "UpdateIsSquadStream",
                            value: true,
                        });
                    }
                } else {
                    if (twitchMainWorker) {
                        twitchMainWorker.postMessage({
                            key: "UpdateIsSquadStream",
                            value: false,
                        });
                    }
                }
                if (url.includes("/access_token") || url.includes("gql")) {
                    // Device ID is used when notifying Twitch of ads.
                    let deviceId = init.headers["X-Device-Id"];
                    if (typeof deviceId !== "string") {
                        deviceId = init.headers["Device-ID"];
                    }
                    // Added to prevent eventual UBlock conflicts.
                    if (typeof deviceId === "string" && !deviceId.includes("twitch-web-wall-mason")) {
                        GQLDeviceID = deviceId;
                    } else if (localDeviceID) {
                        GQLDeviceID = localDeviceID.replace('"', "");
                        GQLDeviceID = GQLDeviceID.replace('"', "");
                    }
                    if (GQLDeviceID && twitchMainWorker) {
                        if (typeof init.headers["X-Device-Id"] === "string") {
                            init.headers["X-Device-Id"] = GQLDeviceID;
                        }
                        if (typeof init.headers["Device-ID"] === "string") {
                            init.headers["Device-ID"] = GQLDeviceID;
                        }
                        twitchMainWorker.postMessage({
                            key: "UpdateDeviceId",
                            value: GQLDeviceID,
                        });
                    }
                    // Client version is used in GQL requests.
                    const clientVersion = init.headers["Client-Version"];
                    if (clientVersion && typeof clientVersion == "string") {
                        ClientVersion = clientVersion;
                    }
                    if (ClientVersion && twitchMainWorker) {
                        twitchMainWorker.postMessage({
                            key: "UpdateClientVersion",
                            value: ClientVersion,
                        });
                    }
                    // Client session is used in GQL requests.
                    const clientSession = init.headers["Client-Session-Id"];
                    if (clientSession && typeof clientSession == "string") {
                        ClientSession = clientSession;
                    }
                    if (ClientSession && twitchMainWorker) {
                        twitchMainWorker.postMessage({
                            key: "UpdateClientSession",
                            value: ClientSession,
                        });
                    }
                    // Client ID is used in GQL requests.
                    if (
                        url.includes("gql")
                        && init
                        && typeof init.body === "string"
                        && init.body.includes("PlaybackAccessToken")
                    ) {
                        let clientId = init.headers["Client-ID"];
                        if (clientId && typeof clientId == "string") {
                            ClientID = clientId;
                        } else {
                            clientId = init.headers["Client-Id"];
                            if (clientId && typeof clientId == "string") {
                                ClientID = clientId;
                            }
                        }
                        if (ClientID && twitchMainWorker) {
                            twitchMainWorker.postMessage({
                                key: "UpdateClientId",
                                value: ClientID,
                            });
                        }
                        // Client integrity header
                        ClientIntegrityHeader = init.headers["Client-Integrity"];
                        if (ClientIntegrityHeader && twitchMainWorker) {
                            twitchMainWorker.postMessage({
                                key: "UpdateClientIntegrityHeader",
                                value: init.headers["Client-Integrity"],
                            });
                        }
                        // Authorization header
                        AuthorizationHeader = init.headers["Authorization"];
                        if (AuthorizationHeader && twitchMainWorker) {
                            twitchMainWorker.postMessage({
                                key: "UpdateAuthorizationHeader",
                                value: init.headers["Authorization"],
                            });
                        }
                    }
                    // To prevent pause/resume loop for mid-rolls.
                    if (
                        url.includes("gql")
                        && init
                        && typeof init.body === "string"
                        && init.body.includes("PlaybackAccessToken")
                        && init.body.includes("picture-by-picture")
                    ) {
                        init.body = "";
                    }
                    let isPBYPRequest = url.includes("picture-by-picture");
                    if (isPBYPRequest) {
                        // noinspection JSUnusedAssignment
                        url = "";
                    }
                }
            }
            return realFetch.apply(this, arguments);
        };
    }
    hookFetch();
}
