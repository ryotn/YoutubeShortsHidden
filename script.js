const SUBSCRIPTIONS_URL = "https://www.youtube.com/feed/subscriptions";
let contents = null;
let subscriptions = null;

let pageManagerObserver = null;
let subscriptionsObserver = null;
let contentsObserver = null;
let hiddenShortsTimer = null;

function setHiddenShortsTimer() {
    if (hiddenShortsTimer != null) {
        clearTimeout(hiddenShortsTimer);
    }
    hiddenShortsTimer = setTimeout(hiddenShorts, 100);
}

function hiddenShorts() {
    console.log('hiddenShorts');

    let videoGrids = contents.querySelectorAll('ytd-grid-video-renderer.style-scope.ytd-grid-renderer:not(.notShortVideo):not(.hiddenShortVideo)');
    if (videoGrids.length < 1) return;
    videoGrids = Array.from(videoGrids);

    videoGrids.forEach(function (gridElement) {
        let videoTime = gridElement.querySelector('span.style-scope.ytd-thumbnail-overlay-time-status-renderer');
        if (videoTime == undefined) {
            //console.log("videoTime == undefined gridElement:" + gridElement.innerText);
            return;
        }

        let splitTime = videoTime.innerText.trim().split(":");
        let time = 0;
        if (splitTime.length < 3) {
            time = splitTime[0] * 60;
            time += splitTime[1] * 1;
        } else {
            time = splitTime[0] * 60 * 60;
            time += splitTime[1] * 60;
            time += splitTime[2] * 1;
        }

        if (time <= 61) {
            //console.log("RemoveVideoTime:"+time);
            gridElement.classList.add("hiddenShortVideo");
        } else {
            //console.log("notShortVideo:" + gridElement.innerText + "\ntime:" + time);
            gridElement.classList.add("notShortVideo");
        }
    });
}
function setSubscriptionsObserver() {
    let pageManager = document.getElementsByClassName('style-scope ytd-page-manager');
    pageManager = Array.from(pageManager);

    pageManager.forEach(function (element) {
        if (element.getAttribute('page-subtype') == "subscriptions") {
            subscriptions = element;
            pageManagerObserver.disconnect();

            subscriptionsObserver = new MutationObserver(function () {
                contents = subscriptions.querySelector('#contents');
                setContentsObserver();
            });
            subscriptionsObserver.observe(subscriptions, { childList: true, subtree: true, });
        }
    });
}
function setContentsObserver() {
    if (contents != null) {

        subscriptionsObserver.disconnect();
        subscriptionsObserver = new MutationObserver(function () {
            if(subscriptions.hidden){
                restoreAll();
            }else{
                setHiddenShortsTimer();
            }
        });
        subscriptionsObserver.observe(subscriptions, { attributes: true, attributeOldValue: true });

        if (contentsObserver == null) {
            setHiddenShortsTimer();
            contentsObserver = new MutationObserver(function () {
                console.log('resize content dom');
                setHiddenShortsTimer();
            });
            contentsObserver.observe(contents, { childList: true });
        }
    }
}

function restoreAll(){
    let videoGrids = contents.querySelectorAll('.notShortVideo,.hiddenShortVideo');
    if (videoGrids.length < 1) return;
    videoGrids = Array.from(videoGrids);
    videoGrids.forEach(function (gridElement) {
        gridElement.className = "style-scope ytd-grid-renderer";
    });
}

window.addEventListener('load', function () {

    let newStyleElement = document.createElement("style");
    newStyleElement.innerHTML = ".hiddenShortVideo{display:none !important;}";
    document.head.appendChild(newStyleElement);

    pageManagerObserver = new MutationObserver(function () {
        if (contents == null && location.href == SUBSCRIPTIONS_URL) setSubscriptionsObserver();
    });

    pageManagerObserver.observe(document.getElementById('page-manager'), { childList: true, subtree: true });

    window.addEventListener('scroll', function () {
        if (this.location.href == SUBSCRIPTIONS_URL && contents != null) setHiddenShortsTimer();
    });
});