/*
this is to make sure that potree has all its lib dependencies that it needs when it is imported. It attaches itself to the html and then its ran attaching all the potree needs to window.
This was done so that it could be handled as an npm package and imported in a nice clear way.
    -Benjamin lewis
*/
// const libs = [
//     "../libs/jquery/jquery-3.1.1.min.js",
//     "../libs/spectrum/spectrum.js",
//     "../libs/jquery-ui/jquery-ui.min.js",
//     "../libs/three.interaction.0.2.3.js",
//     "../libs/other/BinaryHeap.js",
//     "../libs/tween/tween.min.js",
//     "../libs/d3/d3.js",
//     "../libs/proj4/proj4.js",
//     "../libs/openlayers3/ol.js",
//     "../libs/i18next/i18next.js",
//     "../libs/jstree/jstree.js",
//     "../libs/plasio/js/laslaz.js",
// ];
// // const styles = [
// //     "../libs/potree/potree.css",
// //     "../libs/jquery-ui/jquery-ui.min.css",
// //     "../libs/openlayers3/ol.css",
// //     "../libs/spectrum/spectrum.css",
// //     "../libs/jstree/themes/mixed/style.css"
// // ];

// libs.forEach((src)=>{
//     console.log(require(src));
// });