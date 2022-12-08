/// redirect-hostname.js
/// alias rh.js
/**
 * Redirects opened URL by replacing its hostname with the specified hostname.
 * @param {string} hostname - a valid string representation of a hostname we
 *                            want to be redirected to
 * */
(function() {
    const hostname = "{{1}}"
    console.log(1);
    if (hostname === "" || hostname === "{{1}}") {
        return;
    }
    console.log(2);
    const valid_hostname = (() => {
        try {
            console.log(hostname);
            new URL(hostname);
            console.log(3);
            return true;
        } catch (_) {
            console.log(4);
            return false;
        }
    })();
    console.log(5);
    if (!valid_hostname) {
        return;
    }
    console.log(6);
    console.log(hostname);
    window.location.replace(hostname + window.location.pathname);
})();
