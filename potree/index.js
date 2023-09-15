//I susspect that it is impossible to turn potree into an npm package due to how it was made.
//I will return to try again when I dont have more important things to do.
//as of now this at least makes the import easier.

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
    
//These are the current dependencies at the time of writing this code. 12/16/2022
// const libs = [
//     //This is used to resolve the url polyfil utility issue. Node has it avalable for
//     //use if decalred. potree runs an older version of node? (node v4) Which allows
//     //automatic polyfil which when used in an npm import this does not exist. Rather
//     //then add all the dependencies for polyfil and a webpack config I just import it
//     //here and add it to window so that no code needed to be changed.
//     //this is the url npm package which is used. Supposidly it should work as a
//     //replacement for node's url tool.
//     "url",
//     "./potree/lazylibs/jquery/jquery-3.1.1.min.js",
//     "./potree/lazylibs/spectrum/spectrum.js",
//     "./potree/lazylibs/jquery-ui/jquery-ui.min.js",
//     "./potree/lazylibs/three.interaction.0.2.3.js",
//     "./potree/lazylibs/other/BinaryHeap.js",
//     "./potree/lazylibs/tween/tween.min.js",
//     "./potree/lazylibs/d3/d3.js",
//     "./potree/lazylibs/proj4/proj4.js",
//     "./potree/lazylibs/openlayers3/ol.js",
//     "./potree/lazylibs/i18next/i18next.js",
//     "./potree/lazylibs/jstree/jstree.js",
//     "./potree/lazylibs/plasio/js/laslaz.js",
//     "./potree/lazylibs/three.js/three.module.js";
//     "./potree/potree.js"
// ];

// libs.forEach((src)=>{
//     Object.assign(window, import(src));
// });