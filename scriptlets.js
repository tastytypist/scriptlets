/// redirect-hostname.js
/// alias rh.js
/**
 * Redirects opened URL by replacing its hostname with the specified hostname.
 * @param {string} hostname - a valid string representation of a hostname we
 *                            want to be redirected to
 * @example
 * www.reddit.com##+js(rh, https://old.reddit.com)
 * */
(function() {
    "use strict";
    const hostname = "{{1}}"
    if (hostname === "" || hostname === "{{1}}") {
        return;
    }
    const valid_hostname = (() => {
        try {
            new URL(hostname);
            return true;
        } catch (_) {
            return false;
        }
    })();
    if (!valid_hostname) {
        return;
    }
    window.location.replace(hostname 
                            + window.location.pathname 
                            + window.location.search 
                            + window.location.hash);
})();

/// twitch-claim-bonus.js
/// alias tcb.js
/**
 * Automatically claims bonus channel points on Twitch.
 * @example
 * twitch.tv##+js(twitch-claim-bonus)
 */
(function() {
    "use strict";
    const callback = ((mutation_record) => {
        mutation_record.forEach(() => {
            document.querySelector(".claimable-bonus__icon").click();
        });
    });
    const observer = new MutationObserver(callback);
    observer.observe(document.querySelector(".chat-input__buttons-container"), 
                     {subtree: true, childList: true});
})();
