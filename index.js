var base = 1.5;
var maxBarWidth = 500;
var leftBars;
var rightBars;
var innerCircleSize

var backgroundImageThemes = [];
var colorTheme = [];

var mediaFailCount = 0;

function wallpaperAudioListener(audioArray) {
    var left = smoothOut(audioArray.slice(0, 64).reverse(), 0.8);
    var right = smoothOut(audioArray.slice(64).reverse(), 0.8);

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

    document.body.style.background = `radial-gradient(circle at center, red ${75 * avg(left.slice(0, 6))}%, transparent ${40 * (1 + avg(left.slice(59, 65)))}%) no-repeat border-box, linear-gradient(to right , rgb(255, 165, 80), yellow, rgb(255, 165, 80)) no-repeat border-box`
}

window.onload = function() {
    GetMediaInfo();
    setInterval(GetMediaInfo, 5000);

    window.wallpaperPropertyListener = {
        applyUserProperties: function(properties) {
            if (properties.backgroundimagethemes) {
                backgroundImageThemes = properties.backgroundimagethemes.value.split(",").map((x) => x.trim())
                SetBackgroundImage();
            }
        },
    };

    SetQuote();

    let midnight = new Date().setHours(24, 0, 0, 0)
    setTimeout(function() {
        SetBackgroundImage();
        SetQuote();
        setInterval(SetBackgroundImage, 86400000);
        setInterval(SetQuote, 86400000);
    }, midnight - Date.now())

    
    leftBars = document.getElementById("visualizer-left").getElementsByClassName("bar");
    rightBars = document.getElementById("visualizer-right").getElementsByClassName("bar");
    for (let i = 0; i < leftBars.length; i++) {
        const bar = leftBars[i];
        bar.style.backgroundSize = `${20}% 100%`;
    }
    for (let i = 0; i < rightBars.length; i++) {
        const bar = rightBars[i];
        bar.style.backgroundSize = `${20}% 100%`;
    }

    document.getElementById("visualizer-left").style.width = maxBarWidth + "px";
    document.getElementById("visualizer-right").style.width = maxBarWidth + "px";
    window.wallpaperRegisterAudioListener(wallpaperAudioListener);
    
};

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

async function SetBackgroundImage() {
    let src = ""
    if (Date.now() > parseInt(localStorage.getItem("nextBackgroundUpdate")) || localStorage.getItem("backgroundImage") == null) {
        src = await GetBackgroundImage(backgroundImageThemes)
        while (!src) {
            src = await GetBackgroundImage(backgroundImageThemes);
            await sleep(5000);
        }
        localStorage.setItem("nextBackgroundUpdate", new Date().setHours(24, 0, 0, 0))
    }
    else {
        src = localStorage.getItem("backgroundImage");
    }
    localStorage.setItem("backgroundImage", src);
    console.log(`setting image to ${src}`);
    document.getElementById("background-image").src = src;
    setTimeout(SampleBackgroundImage, 500);
}

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

async function SetQuote() {
    let quote = "";
    if (Date.now() > parseInt(localStorage.getItem("nextQuoteUpdate")) || localStorage.getItem("nextQuoteUpdate") == null || localStorage.getItem("quote") == null) {
        quote = await GetQuote();
        while (!quote) {
            quote = await GetQuote();
            await sleep(5000);
        }
        localStorage.setItem("nextQuoteUpdate", new Date().setHours(24, 0, 0, 0));
    }
    else {
        quote = JSON.parse(localStorage.getItem("quote"));
    }
    localStorage.setItem("quote", JSON.stringify(quote));
    document.getElementById("quote").innerHTML = `"${quote.q}"`;
    document.getElementById("author").innerHTML = `- ${quote.a}`;
}

function GetMediaInfo() {
    $.ajax({
        url: "http://127.0.0.1:5000/media_info",
        type: "GET",
        headers: {
            "content-type": "application/json"
        }
    })
    .done(function (data, textStatus, request) {
        if (data) {
            document.getElementById("media-info").style.display = "block";
            document.getElementById("thumbnail").setAttribute("src", `data:image/jpg;base64,${data.thumbnail}`)
            document.getElementById("song").innerHTML = data.title;
            document.getElementById("artist").innerHTML = `by ${data.artist}`;
        }
        else {
            mediaFailCount += 1;
            if (mediaFailCount >= 5) {
                document.getElementById("media-info").style.display = "none";
            }
        }
    })
    // if the request fails
    .fail(function(request) {
        mediaFailCount += 1;
        if (mediaFailCount >= 5) {
            document.getElementById("media-info").style.display = "none";
        }
        console.log(`Failed to get media info. ${request.status}`)
    })
}

function SampleBackgroundImage() {
    console.log("started image manipulation");

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

    if ((averageRGB[0] / 255) * 0.2989 + (averageRGB[1] / 255) * 0.5870 + (averageRGB[2] / 255) * 0.1140 > 0.5) {
        document.getElementById("quote-container").style.color = "black";
    }
    else {
        document.getElementById("quote-container").style.color = "white";
    }

    colorTheme = new ColorThief().getPalette(img, 3);
    colorTheme.forEach(color => {
        console.log(`%c${color}`, `color: rgb(${color})`);
    });

    let swatches = new Vibrant(img).swatches();
    console.log(swatches)
    console.log(`%c${swatches.Vibrant.rgb}`, `color: rgb(${swatches.Vibrant.rgb})`);
    console.log(`%c${swatches.Muted.rgb}`, `color: rgb(${swatches.Muted.rgb})`);
    console.log(`%c${swatches.LightVibrant.rgb}`, `color: rgb(${swatches.LightVibrant.rgb})`);
    //console.log(`%c${swatches.LightMuted.rgb}`, `color: rgb(${swatches.LightMuted.rgb})`);
    console.log(`%c${swatches.DarkVibrant.rgb}`, `color: rgb(${swatches.DarkVibrant.rgb})`);
    console.log(`%c${swatches.DarkMuted.rgb}`, `color: rgb(${swatches.DarkMuted.rgb})`);

    document.documentElement.style.setProperty("--vibrant-color", `rgb(${swatches.DarkVibrant.rgb.join(" ")})`)
    document.documentElement.style.setProperty("--light-vibrant-color", `rgb(${swatches.LightVibrant.rgb.join(" ")})`)

    //document.documentElement.style.setProperty("--vibrant-color", `rgb(${colorTheme[0].join(" ")})`)
    //document.documentElement.style.setProperty("--light-vibrant-color", `rgb(${colorTheme[1].join(" ")})`)
}

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