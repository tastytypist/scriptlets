/// redirect-hostname.js
/// alias rh.js
/**
 * Redirects opened URL by replacing its hostname with the specified hostname.
 * @param {string} hostname - a valid string representation of a hostname we
 *                            want to be redirected to
 * */
(function() {
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
