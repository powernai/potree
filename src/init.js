/*
There were a few modifications that I needed to make in order to allow potree to
exist as an npm package. However all the needed imports can be found here.
potree refferences a physically downloaded and <script> imported library. Due to
this I was unsure if using the more modern version of the library would be a good
idea since I would need to maintain it and because I would need to modify all the
code to use "import" or globally init all its props to window. Which might have caused.
key dependencies to be missed. As a result I decided to attach the libs
that are expected for download to the lazyLibs in the gulp. They 
can be refferenced here. That way any updates to dependencies must be handled by
the original creator and not me. We also have coppies of the lib which protects
us from bitrot as they get updated.
    -Benjamin lewis (lewibs)
*/
import {Utils} from "./utils.js";
import * as url from "url";

//This is used to resolve the url polyfil utility issue. Node has it avalable for
//use if decalred. potree runs an older version of node? (node v4) Which allows
//automatic polyfil which when used in an npm import this does not exist. Rather
//then add all the dependencies for polyfil and a webpack config I just import it
//here and add it to window so that no code needed to be changed.
//this is the url npm package which is used. Supposidly it should work as a
//replacement for node's url tool.
window.url = url;

//These are the current dependencies at the time of writing this code. 12/16/2022
const libs = [
    "jquery/jquery-3.1.1.min.js",
    "spectrum/spectrum.js",
    "jquery-ui/jquery-ui.min.js",
    "three.interaction.0.2.3.js",
    "other/BinaryHeap.js",
    "tween/tween.min.js",
    "d3/d3.js",
    "proj4/proj4.js",
    "openlayers3/ol.js",
    "i18next/i18next.js",
    "jstree/jstree.js",
    "plasio/js/laslaz.js",
];

//I chose to ignore styles since cpms should not be using potree tools directly 
//through their ui interface since it goes against our styles and code.
//It also was just something I didnt want to deal with.

// const styles = [
//     "../libs/potree/potree.css",
//     "../libs/jquery-ui/jquery-ui.min.css",
//     "../libs/openlayers3/ol.css",
//     "../libs/spectrum/spectrum.css",
//     "../libs/jstree/themes/mixed/style.css"
// ];

//Potree has not yet been initialized here which is how this would typically be
//done but we can get the script path like this. And use it for loading the lib
//scripts
let scriptPath = "";

if (document.currentScript && document.currentScript.src) {
	scriptPath = new URL(document.currentScript.src + '/..').href;
	if (scriptPath.slice(-1) === '/') {
		scriptPath = scriptPath.slice(0, -1);
	}
} else if(import.meta){
	scriptPath = new URL(import.meta.url + "/..").href;
	if (scriptPath.slice(-1) === '/') {
		scriptPath = scriptPath.slice(0, -1);
	}
}else {
	console.error('Potree was unable to find its script path using document.currentScript. Is Potree included with a script tag? Does your browser support this function?');
}

console.log(scriptPath);
libs.forEach((src)=>{
    //loadScript tasks a link to a js script and injects it into the head
    //of the main html. Because a potree import will only be ran once these
    //scripts will only be ran once.
    Utils.loadScript(`${scriptPath}/lazylibs/${src}`);
});