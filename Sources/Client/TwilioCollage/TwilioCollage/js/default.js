(function () {
    'use strict';
    // Uncomment the following line to enable first chance exceptions.
    //Debug.enableFirstChanceException(true);

    ///////////////////////////////////////////////////////////////////////////
    // CONFIGURATION
    //
    // Services base URL
    var svcBaseURL = "http://wheresgus.com/twilio/";
    //
    // Twilio credentials
    var acctSID = "##################################"; // insert your account SID here
    var token   = "################################";   // shh, this should be secret
    //
    // Twilio numbers
    var twilioNum  = "+415.599.2671";                   // your twilio sandbox #
    var twilioExt  = "####-####";                       // your twilio extension
    //
    // "Administrator" phone number for reset IVR
    var fromNum = "+1##########";                       // authenticated phone #
    var toNum   = "+1##########";                       // administrator phone #    
    ///////////////////////////////////////////////////////////////////////////

    document.addEventListener("DOMContentLoaded", initialize, false);

    WinJS.Application.onmainwindowactivated = function (e) {
        if (e.detail.kind === Windows.ApplicationModel.Activation.ActivationKind.launch) {
            WinJS.UI.process(document.getElementById('theAppBar'))
                .then(function () {
                document.getElementById('home').addEventListener('click', homeClick, false);
                document.getElementById('glow').addEventListener('click', toggleGlow, false);
                document.getElementById('reset').addEventListener('click', callAndReset, false);
            });                

            WinJS.UI.getControl(document.getElementById('theAppBar')).hide();

            syncImages();
            syncActions();
        }
    }

    WinJS.Application.start();

    var imgCount     = 0;
    var retryCount   = 0;
    var imageCount   = 0;
    var maxId        = 0;
    var maxAction    = 0
    var canvasWidth  = 800;
    var canvasHeight = 600;
    var maxImgWidth  = 100;
    var maxImgHeight = 100;

    var context;
    var canvasArea;
    var imageList = new Array();

    var enableInProcessEffects   = false; // doens't work currently
    var enablePostProcessEffects = false; // fun, but bad perf
    var enableGlowShadowing      = false; // simple canned effect from canvas
    var enableImageAlpha         = false; // image transparency

    function initialize() {
        // Canvas initialization
        canvasArea = document.getElementById("collageArea");
        context = canvasArea.getContext("2d");

        // width / height initialization
        if (typeof window.innerWidth != 'undefined') {
            // Standards
            canvasWidth   = window.innerWidth;
            canvasHeight  = window.innerHeight * .8;
        } else if (typeof document.documentElement != 'undefined' && typeof document.documentElement.clientWidth != 'undefined' && document.documentElement.clientWidth != 0) {
            // Quirks
            canvasWidth   = document.documentElement.clientWidth;
            canvasHeight  = (document.documentElement.clientHeight * .8) - 80;
        } else {
            // Legacy
            canvasWidth   = document.getElementsByTagName('body')[0].clientWidth;
            canvasHeight  = document.getElementsByTagName('body')[0].clientHeight * .8;
        }

        canvasArea.width  = canvasWidth;
        canvasArea.height = canvasHeight;   

        // call yourself based on context (3rd party compat)
        if (window.requestAnimationFrame) {
            window.requestAnimationFrame(renderLoopRAF);
        }else if (window.msRequestAnimationFrame) {
            window.msRequestAnimationFrame(renderLoopRAF);
        }else if (window.mozRequestAnimationFrame) {
            window.mozRequestAnimationFrame(renderLoopRAF);
        }else if (window.webkitRequestAnimationFrame) {
            window.webkitRequestAnimationFrame(renderLoopRAF);
        }
    } 

    // App Bar
    function homeClick() {
        WinJS.UI.getControl(document.getElementById("theAppBar")).hide();
    }

    function toggleGlow() {
        if (enableGlowShadowing == false) {
            enableGlowShadowing = true;
        }else {
            enableGlowShadowing = false;
        }
    }

    function callAndReset() {
        // URI string building
        var URI      = "";
        var baseURL  = "https://api.twilio.com/2010-04-01/";
        var acctPath = "Accounts/" + acctSID + "/";        
        var action   = "Calls";

        // Call handler URL
        var callHandler = svcBaseURL + "handle_call.php";

        var params   = "From=" + fromNum;
        params      += "&To="   + toNum;        
        params      += "&Url="  + callHandler;

        URI = baseURL + acctPath + action;

        WinJS.xhr({
            type: "POST",
            url:  URI,
            user: acctSID,
            password: token,
            headers: { 'Content-type': 'application/x-www-form-urlencoded'},
            data : params
        }).then(
            function (request) {
                // Nothing to do here...
            },
            function (request) {
                // HANDLE error case here or, could just retry...
                // setTimeout(function (){ callAndReset(); }, 10000);
            }
        );    
            
    }

    // XHR magic
    function syncImages() {
        var URI = svcBaseURL + "collage_images.php";

        // TODO: startup code here        
        if (maxId > 0) {
            URI += "?id=" + maxId.toString();
            statusDiv.innerText = "Adding new images from server ... ";
            WinJS.xhr({ url: URI }).then(processNewImages, downloadError);            
            setTimeout(function (){ syncImages(); }, 5000);
        }else {
            statusDiv.innerText = "Batching images from server ... ";
            WinJS.xhr({ url: URI }).then(processImages, downloadError);
            setTimeout(function (){ syncImages(); }, 5000);
        }

    }

    function syncActions() {
        var URI = svcBaseURL + "collage_actions.php";

        // TODO: startup code here
        if (maxAction > 0) {
            URI += "?id=" + maxAction.toString();
            WinJS.xhr({ url: URI }).then(processNewActions, downloadError);
            setTimeout(function (){ syncActions(); }, 10000);
        }else {
            WinJS.xhr({ url: URI }).then(processOldActions, downloadError);
            setTimeout(function (){ syncActions(); }, 10000);
        }
    }

    function processNewImages(request) {
        var items = request.responseXML.selectNodes("//twImage");
        var status = "Images synchronized and rendered.";

        var id = -1;

        if (items.length < 1) {
            statusDiv.innerHTML = "No new images currently, text: " + twilioNum + " with the message "+ twilioExt + " <i>ImageURL</i>";            
        } else {
            for (var i = 0; i < items.length; i++) {
                var item = items[i];

                id = parseInt(item.selectNodes("id")[0].text, 10);
                var src = item.selectNodes("src")[0].text;
                var alt = item.selectNodes("uploadedBy")[0].text;

                // assumption: no duplicate IDs, ascending order
                if (id > maxId) {
                    maxId = id;                    
                    addImage(id, src, alt);
                }
                
            }
            statusDiv.innerText = status;
        }
    }

    // sync up to the latest action id
    function processOldActions(request) {
        var items = request.responseXML.selectNodes("//do");

        var id = -1;

        if (items.length == 0) {            
            response = null;
        } else {
            for (var i = 0; i < items.length; i++) {
                var item = items[i];

                id = parseInt(item.selectNodes("id")[0].text, 10);

                // assumption: no duplicate IDs, ascending order
                if (id > maxAction) {
                    maxAction = id;
                }
            }                       
        }
    }

    function processNewActions(request) {
        var items = request.responseXML.selectNodes("//do");

        var id     = -1;
        var action = "";

        if (items.length == 0) {
        } else {
            for (var i = 0; i < items.length; i++) {
                var item = items[i];

                id     = parseInt(item.selectNodes("id")[0].text, 10);
                action = item.selectNodes("action")[0].text;

                if (action == "reset") {
                    resetImages();
                }

                // assumption: no duplicate IDs, ascending order
                if (id > maxAction) {
                    maxAction = id;
                }
            }
        }
    }


    function processImages(request) {
        var items = request.responseXML.selectNodes("//twImage");
        var status = "Images synchronized and rendered.";

        var id = -1;

        if (items.length == 0) {
            statusDiv.innerHTML = "No new images currently, text: "+ twillioNum + " with the message "+ twilioExt + " <i>ImageURL</i>";
        } else {
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                
                id       = parseInt(item.selectNodes("id")[0].text, 10);
                var src  = item.selectNodes("src")[0].text;
                var alt  = item.selectNodes("uploadedBy")[0].text;
                
                // assumption: no duplicate IDs                               
                if (id > maxId) {
                    maxId = id;
                    //status += id + ",";
                }else {
                    //status += "/" + id;
                }
                addImage(id, src, alt);
            }
            statusDiv.innerText = status;
        }
        request = null;
    }

    function addImage(id, src, alt) {
        var vx = Math.random() * 4; // x-velocity
        var vy = Math.random() * 3; // y-velocity
        var vrot = Math.random() / 150;    // rotational velocity

        var idName = "image" + id;
        imageList[imageCount] = new Array (idName, 1, 1, 0, vx, vy, vrot); // id, xPosition, yPosition, rotation, x-velocity, y-velocity
        imageCount++;

        images_area.innerHTML += "<img id=\"" + idName + "\" src=\"" + src + "\" alt=\"" + alt + "\" style=\"display:none\" />";

        // TODO: scale image
        var image = document.getElementById(idName);

        if (false)
            if (image.naturalWidth > image.naturalHeight) {
                // calculate scaling factor
                var scale = maxImgWidth / image.naturalWidth;

                image.width = scale * image.naturalWidth;
                image.height = sacle * image.naturalHeight;
            }else {
                var scale = maxImgHeight / image.naturalHeight;

                image.width = scale * image.naturalWidth;
                image.height = sacle * image.naturalHeight;
        }

    }

    function resetImages(){
        imageList = new Array();
        images_area.innerHTML = "";
    }

    function downloadError() {
        status.innerText = "Error while downloading the image sources, retrying...";
    }

    function drawCollage() {
        context.save();

        context.clearRect(0, 0, canvasWidth, canvasHeight);

        var listLength = imageList.length;

        for (var i = 0; i < listLength; i++) {
            var dx = imageList[i][1];
            var dy = imageList[i][2];
            var rot = imageList[i][3];
            var vFlip, hFlip = false;
            hFlip = true;


            // get the image using the id stored in the image list
            var imageId = imageList[i][0];
            var image = document.getElementById(imageId);                   

            // flip velocity if the image is going off-screen
            if (dx + image.naturalWidth >= canvasWidth || dx <= 0) {
                imageList[i][1] -= (imageList[i][4] * 2);   // bounce off side
                imageList[i][4] *= -1;                      // flip velocity
                if (hFlip && dx <= 0) imageList[i][6] *= -1;           // flip rotation
            }
            if (dy + image.naturalHeight >= canvasHeight || dy <= 0) {
                imageList[i][2] -= (imageList[i][5] * 2);              // bounce off bottom
                imageList[i][5] *= -1;                                 // reverse velocity

                // Vertical flipping can be a little jarring
                if (vFlip && dy <= 0) imageList[i][6] *= -1;           // flip rotation
            }

            // set canvas position for drawing
            context.save();
            //if (enableInProcessEffects) inProcessImageEffect(image);
            context.translate(dx, dy);
            context.rotate(rot);

            // draw, restore context for the next image
            if (enableGlowShadowing) {
                context.shadowColor = "#00FF00";
                context.shadowBlur = 25;
            }

            if (enableImageAlpha) {
                context.globalAlpha = 0.7;
            }
            
            if (image) context.drawImage(image, 0, 0); // sWidth,sHeight) TODO image scaling with / height            

            // Done rendering, translate for animation
            imageList[i][1] += imageList[i][4]; // translate about x by vx
            imageList[i][2] += imageList[i][5]; // translate about y by vy
            imageList[i][3] += imageList[i][6]; // rotate

            context.restore();
        }

        context.restore();

        // effects like B&W work after everything is rendered
        if (enablePostProcessEffects) postProcessEffects();
        return;
    }

    function inProcessImageEffect(image) {
        var effect = "B&W";
        context.save();
        if (image) {
            if (effect == "B&W") {
                var imgd = context.getImageData(0, 0, image.naturalWidth, image.naturalHeight);
                var pix = imgd.data;
                for (var i = 0, n = pix.length; i < n; i += 16) {
                    var grayscale = pix[i] * .3 + pix[i + 1] * .59 + pix[i + 2] * .11;
                    pix[i] = grayscale;   // red
                    pix[i + 1] = grayscale;   // green
                    pix[i + 2] = grayscale;   // blue
                    // alpha
                }
                context.putImageData(imgd, 0, 0);
            }
        }
        context.restore();
    }

    // effects that happen after the rendering of the context
    function postProcessEffects() {
        var effect = "RGB";
        context.save();

        // helpful information from: http://spyrestudios.com/html5-canvas-image-effects-black-white/
        if (effect == "NONE") {
        }else if (effect == "B&W") {
            var imgd = context.getImageData(0, 0, canvasWidth - 1, canvasHeight - 1);
            var pix = imgd.data;
            for (var i = 0, n = pix.length; i < n; i += 4) {
                var grayscale = pix[i] * .3 + pix[i + 1] * .59 + pix[i + 2] * .11;
                pix[i] = grayscale;   // red
                pix[i + 1] = grayscale;   // green
                pix[i + 2] = grayscale;   // blue
                // alpha
            }
            context.putImageData(imgd, 0, 0);
        }else if (effect == "RGB") {
            for (var color = 0; color < 3; color++) {
                var vStripe = canvasHeight / 5;
                var stripeStart = color * ((canvasWidth - 1) / 3);
                var stripeStop = (color + 1) * ((canvasWidth - 1) / 3);
                var imgd = context.getImageData(stripeStart, vStripe*2, stripeStop, 100);
                var pix = imgd.data;
                for (var i = 0, n = pix.length; i < n; i += 128) {
                    var grayscale = pix[i] * .3 + pix[i + 1] * .59 + pix[i + 2] * .11;
                    pix[i] = color == 0 ? grayscale : 0;   // red
                    pix[i + 1] = color == 1 ? grayscale : 0;   // green
                    pix[i + 2] = color == 2 ? grayscale : 0;   // blue
                    // alpha
                }
                context.putImageData(imgd, stripeStart, vStripe*2);
            }
        }
        context.restore();
        return;
    }

    function renderLoopRAF() {
        drawCollage();        

        // Call yourself based on browser type (compat)
        if (window.requestAnimationFrame) {
            window.RequestAnimationFrame(renderLoopRAF);
        }else if (window.msRequestAnimationFrame) {
            window.msRequestAnimationFrame(renderLoopRAF);
        }else if (window.mozRequestAnimationFrame) {
            window.mozRequestAnimationFrame(renderLoopRAF);
        }else if (window.webkitRequestAnimationFrame) {
            window.webkitRequestAnimationFrame(renderLoopRAF);
        }
    }

})();

