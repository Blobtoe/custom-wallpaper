var maxBarWidth = 500;
var leftBars;
var rightBars;

var backgroundImageThemes = [];

var mediaFailCount = 0;


// updates the music visualizer every time wallpaper engines gives us new audio data
function wallpaperAudioListener(audioArray) {

    // smooth out the audio data
    var left = smoothOut(audioArray.slice(0, 64).reverse(), 0.8);
    var right = smoothOut(audioArray.slice(64).reverse(), 0.8);

    // set the height of each bar proportionally to their respective sample
    for (let i = 0; i < left.length; i++) {
        const bar = leftBars[i];
        const sample = Math.min(left[i], 1);

        bar.style.height = ((window.innerHeight - 40) / left.length) + "px";
        bar.style.width = sample * maxBarWidth + "px";
    }
    for (let i = 0; i < right.length; i++) {
        const bar = rightBars[i];
        const sample = Math.min(right[i], 1);

        bar.style.height = ((window.innerHeight - 40) / right.length) + "px";
        bar.style.width = sample * maxBarWidth + "px";
    }
}

// when the html document is fully loaded
window.onload = function() {

    // start interval to get media info every 5 seconds
    GetMediaInfo();
    setInterval(GetMediaInfo, 5000);

    // set the background image with the user's themes
    window.wallpaperPropertyListener = {
        applyUserProperties: function(properties) {
            if (properties.backgroundimagethemes) {
                backgroundImageThemes = properties.backgroundimagethemes.value.split(",").map((x) => x.trim())
                SetBackgroundImage();
            }
        },
    };

    // set the quote
    SetQuote();

    // set an interval to update background image and quote every midnight
    let midnight = new Date().setHours(24, 0, 0, 0)
    // run this at next midnight
    setTimeout(function() {
        SetBackgroundImage();
        SetQuote();
        // update background and quote every recurring midnight
        setInterval(SetBackgroundImage, 86400000);
        setInterval(SetQuote, 86400000);
    }, midnight - Date.now())

    // store list of bars in global variables
    leftBars = document.getElementById("visualizer-left").getElementsByClassName("bar");
    rightBars = document.getElementById("visualizer-right").getElementsByClassName("bar");

    // set width of visualizer containers to maximum bar width
    document.getElementById("visualizer-left").style.width = maxBarWidth + "px";
    document.getElementById("visualizer-right").style.width = maxBarWidth + "px";

    // register the audio listener
    window.wallpaperRegisterAudioListener(wallpaperAudioListener);
    
};

// gets the background image from unsplash 
async function GetBackgroundImage(themes) {
    return new Promise(resolve => {
        var xhr = new XMLHttpRequest();
        $.ajax({
            url: `https://source.unsplash.com/featured/${window.screen.width}x${window.screen.height}/?${themes.join(",")}`,
            type: "GET",
            xhr: function() {
                return xhr;
            }
        })
        .done(function (data, textStatus, request) {
            resolve(xhr.responseURL);
        })
        .fail(function(request) {
            console.log(`Failed to get background image. ${request.status}`);
            resolve(null);
        })
    })
}

// sets the background image
async function SetBackgroundImage() {
    let src = ""

    // if it's time to change backgorund image or there is no stored background image
    if (Date.now() > parseInt(localStorage.getItem("nextBackgroundUpdate")) || localStorage.getItem("backgroundImage") == null) {
        // get new background image
        src = await GetBackgroundImage(backgroundImageThemes)
        while (!src) {
            src = await GetBackgroundImage(backgroundImageThemes);
            await sleep(5000);
        }
        // set new background image update time
        localStorage.setItem("nextBackgroundUpdate", new Date().setHours(24, 0, 0, 0))
    }
    // else, use stored background image
    else {
        src = localStorage.getItem("backgroundImage");
    }
    // make sure the current wallpaper is stored
    localStorage.setItem("backgroundImage", src);
    document.getElementById("background-image").src = src;

    // sample background in after delay to allow the image to be set
    setTimeout(SampleBackgroundImage, 500);
}

// get random quote from zenquotes
async function GetQuote() {
    return new Promise(resolve => {
        $.ajax({
            url: "https://zenquotes.io/api/random",
            type: "GET",
            headers: {
                "content-type": "application/json"
            }
        })
        .done(function (data, textStatus, request) {
            resolve(JSON.parse(data)[0]);
        })
        .fail(function(request) {
            console.log(`Failed to get quote. ${request.status}`);
            resolve(null);
        })
    });
}

// set quote
async function SetQuote() {
    let quote = "";

    // if it's time to set new quote or no quote is stored
    if (Date.now() > parseInt(localStorage.getItem("nextQuoteUpdate")) || localStorage.getItem("nextQuoteUpdate") == null || localStorage.getItem("quote") == null) {
        // get new quote
        quote = await GetQuote();
        while (!quote) {
            quote = await GetQuote();
            await sleep(5000);
        }
        // set new quote update time
        localStorage.setItem("nextQuoteUpdate", new Date().setHours(24, 0, 0, 0));
    }
    // else, use stored quote
    else {
        quote = JSON.parse(localStorage.getItem("quote"));
    }
    // make sure quote is stored
    localStorage.setItem("quote", JSON.stringify(quote));

    // set quote html
    document.getElementById("quote").innerHTML = `"${quote.q}"`;
    document.getElementById("author").innerHTML = `- ${quote.a}`;
}

// get media info from python server
function GetMediaInfo() {
    $.ajax({
        url: "http://127.0.0.1:5000/media_info",
        type: "GET",
        headers: {
            "content-type": "application/json"
        }
    })
    .done(function (data, textStatus, request) {
        // if we succeed
        if (data) {
            // update media html
            document.getElementById("media-info").style.display = "block";
            document.getElementById("thumbnail").setAttribute("src", `data:image/jpg;base64,${data.thumbnail}`)
            document.getElementById("song").innerHTML = data.title;
            document.getElementById("artist").innerHTML = `by ${data.artist}`;
        }
        // if we fail
        else {
            mediaFailCount += 1;
            // if we fail 5 times, hide media panel
            if (mediaFailCount >= 5) {
                document.getElementById("media-info").style.display = "none";
            }
        }
    })
    // if the request fails
    .fail(function(request) {
        mediaFailCount += 1;
        // if we fail 5 times, hide media panel
        if (mediaFailCount >= 5) {
            document.getElementById("media-info").style.display = "none";
        }
    })
}

// get vibrant colors from background image
function SampleBackgroundImage() {
    // get image data
    let canvas = document.createElement('canvas');
    let context = canvas.getContext('2d');
    let img = document.getElementById('background-image');
    console.log(img.width);
    canvas.width = img.width;
    canvas.height = img.height;
    context.drawImage(img, 0, 0 );
    const data = context.getImageData(0, 0, img.width, img.height).data;
    let rgb = [];
    for (let i = 0; i < data.length; i++) {
        if (i % 4 == 0) {
            rgb.push([data[i], data[i+1], data[i+2]])
        }
    }

    // calculate average color of bottom of the image
    const section = rgb.slice(-1000 * img.width)
    let averageRGB = [0, 0, 0];
    for (let i = 0; i < section.length; i++) {
        const pixel = section[i];
        averageRGB[0] += pixel[0]
        averageRGB[1] += pixel[1]
        averageRGB[2] += pixel[2]
    }
    averageRGB[0] = Math.round(averageRGB[0] / section.length)
    averageRGB[1] = Math.round(averageRGB[1] / section.length)
    averageRGB[2] = Math.round(averageRGB[2] / section.length)

    // if the grayscale average color is above 50%, color quote text black
    if ((averageRGB[0] / 255) * 0.2989 + (averageRGB[1] / 255) * 0.5870 + (averageRGB[2] / 255) * 0.1140 > 0.5) {
        document.getElementById("quote-container").style.color = "black";
    }
    // else, color the quote text white
    else {
        document.getElementById("quote-container").style.color = "white";
    }

    // get virant colors from background image
    Vibrant.from(img).getPalette(function(err, palette) {
        // set css variables to update bar gradient colors
        document.documentElement.style.setProperty("--vibrant-color", `rgb(${palette.DarkVibrant.rgb.join(" ")})`)
        document.documentElement.style.setProperty("--light-vibrant-color", `rgb(${palette.LightVibrant.rgb.join(" ")})`)
    })
}





// didn't write this lol
function avg (v) {
    return v.reduce((a,b) => a+b, 0)/v.length;
}

function smoothOut (vector, variance) {
    var t_avg = avg(vector)*variance;
    var ret = Array(vector.length);
    for (var i = 0; i < vector.length; i++) {
        (function () {
        var prev = i>0 ? ret[i-1] : vector[i];
        var next = i<vector.length ? vector[i] : vector[i-1];
        ret[i] = avg([t_avg, avg([prev, vector[i], next])]);
        })();
    }
    return ret;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}