const SUBSCRIPTIONS_URL = "https://www.youtube.com/feed/subscriptions";
const PREMIERE_DISPLAY_TIME = 5 * 60 * 60 * 1000;
let contents = null;
let subscriptions = null;

let pageManagerObserver = null;
let subscriptionsObserver = null;
let contentsObserver = null;
let guideInnerContentObserver = null;
let hiddenShortsTimer = null;
var inputElement = null;
var isHidden = true;

function setHiddenShortsTimer() {
    if (hiddenShortsTimer != null) {
        clearTimeout(hiddenShortsTimer);
    }
    hiddenShortsTimer = setTimeout(hiddenShorts, 100);
}

function hiddenShorts() {
    if(!isHidden) return;
    console.log('hiddenShorts');

    let videoGrids = contents.querySelectorAll('ytd-grid-video-renderer.style-scope.ytd-grid-renderer:not(.notShortVideo):not(.hiddenShortVideo)');
    if (videoGrids.length < 1) return;
    videoGrids = Array.from(videoGrids);

    videoGrids.forEach(function (gridElement) {
        let videoTime = gridElement.querySelector('span.style-scope.ytd-thumbnail-overlay-time-status-renderer');
        if (videoTime == undefined) {
            console.log("videoTime == undefined gridElement:" + gridElement.innerText);
            let badge = gridElement.querySelector('ytd-badge-supported-renderer#video-badges.style-scope.ytd-grid-video-renderer');//gridElement.querySelector('span.style-scope.ytd-badge-supported-renderer');
            console.log(badge);
            if (badge != undefined && (badge.innerText.trim() == "プレミア公開中" || badge.innerText.trim() == "ライブ配信中")) gridElement.classList.add("notShortVideo");
            return;
        }

        let strTime = videoTime.innerText.trim();
        let splitTime = strTime.split(":");
        let time = 0;
        if (splitTime.length == 2) {
            time = splitTime[0] * 60;
            time += splitTime[1] * 1;
        } else if (splitTime.length >= 3) {
            time = splitTime[0] * 60 * 60;
            time += splitTime[1] * 60;
            time += splitTime[2] * 1;
        } else if (strTime == "プレミア公開" || strTime == "ライブ") {
            //gridElement.classList.add("premiereVideo");
            let strPublishingTime = gridElement.querySelector('div#metadata-line').innerText.trim().slice(0, -7);
            let diffPublishingTime = new Date(strPublishingTime + ":00").getTime() - new Date().getTime();
            //console.log("strPublishingTime:" + strPublishingTime + " diffPublishingTime:" + diffPublishingTime);
            if (diffPublishingTime > PREMIERE_DISPLAY_TIME) gridElement.classList.add("hiddenPremiereVideo");
            time = 62;
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
            createToggleSwitch();
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
            if (subscriptions.hidden) {
                restoreAll();
            } else {
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

function restoreAll() {
    let videoGrids = contents.querySelectorAll('.notShortVideo,.hiddenShortVideo');
    if (videoGrids.length < 1) return;
    videoGrids = Array.from(videoGrids);
    videoGrids.forEach(function (gridElement) {
        gridElement.className = "style-scope ytd-grid-renderer";
    });
}

window.addEventListener('load', function () {
    setYoutubeShortsHidden();
});

function setYoutubeShortsHidden(){
    console.log("setYoutubeShortsHidden")
    setSubscriptionsLink();
    let newStyleElement = document.createElement("style");
    newStyleElement.innerHTML = ".hiddenShortVideo{display:none !important;}.hiddenPremiereVideo{display:none !important;}";
    newStyleElement.innerHTML += toggleSwitchCSS;
    document.head.appendChild(newStyleElement);
    pageManagerObserver = new MutationObserver(function () {
        if (contents == null && location.href == SUBSCRIPTIONS_URL) setSubscriptionsObserver();
    });

    pageManagerObserver.observe(document.getElementById('page-manager'), { childList: true, subtree: true });

    window.addEventListener('scroll', function () {
        if (this.location.href == SUBSCRIPTIONS_URL && contents != null) setHiddenShortsTimer();
    });
}

function setSubscriptionsLink(){
    let guideInnerContent = document.getElementById('guide-inner-content');
    guideInnerContentObserver = new MutationObserver(function(){
        let items = document.querySelectorAll('#items.style-scope.ytd-guide-section-renderer');
        items =  Array.from(items);
        items.forEach(function(item){
            let itemChildren = item.children;
            itemChildren = Array.from(itemChildren);
            itemChildren.forEach(function(itemChild){
                if(itemChild.innerText == "登録チャンネル"){
                    itemChild.querySelectorAll("a")[0].setAttribute("onclick","clickSubscriptions();");
                    guideInnerContentObserver.disconnect();
                }
            });
        });
    });
    guideInnerContentObserver.observe(guideInnerContent,{childList:true,subtree:true});
}

function clickSubscriptions(){
    if(subscriptions != null && !subscriptions.hidden){
        location.reload();
    }
}

function createToggleSwitch(){
    let dummyElement = document.createElement("div");
    let divElement = document.createElement("div");
    let labelElement = document.createElement("label");
    inputElement = document.createElement("input");
    let spanElement = document.createElement("span");

    divElement.innerText = "Hidden Short Videos";

    dummyElement.setAttribute('class','dummyDiv');
    divElement.setAttribute('class','switchDiv');
    labelElement.setAttribute('class','switch');
    inputElement.setAttribute('type','checkbox');
    inputElement.setAttribute('checked','true');
    spanElement.setAttribute('class','slider round');

    spanElement.addEventListener('click', function(){
        console.log("inputElement.checked:" + inputElement.checked);
        isHidden = !inputElement.checked;
        if(isHidden){
            hiddenShorts();
        }else{
            restoreAll();
        }
    });

    //divElement.appendChild(labelElement);
    labelElement.appendChild(inputElement);
    labelElement.appendChild(spanElement);

    subscriptions.prepend(dummyElement);
    subscriptions.prepend(labelElement);
    subscriptions.prepend(divElement);
}

let toggleSwitchCSS = `
.dummyDiv{
    width: 100%;
    height: 45px;
}
.switchDiv{
    position: fixed;
    display: inline-block;
    width: 100%;
    height: 45px;
    background-color: var(--yt-spec-general-background-a);
    color: var(--yt-spec-text-primary);
    text-align: center;
    z-index:1000;
}
/* How To Create a Toggle Switch https://www.w3schools.com/howto/howto_css_switch.asp */
/* The switch - the box around the slider */
.switch {
  position: fixed;
  display: inline-block;
  width: 60px;
  height: 34px;
  margin-top: 11px;
  z-index:1001;
}

/* Hide default HTML checkbox */
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

/* The slider */
.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  -webkit-transition: .4s;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  -webkit-transition: .4s;
  transition: .4s;
}

input:checked + .slider {
  background-color: #2196F3;
}

input:focus + .slider {
  box-shadow: 0 0 1px #2196F3;
}

input:checked + .slider:before {
  -webkit-transform: translateX(26px);
  -ms-transform: translateX(26px);
  transform: translateX(26px);
}

/* Rounded sliders */
.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}
`;