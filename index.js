var base = 1.5;
var maxBarWidth = 500;
var leftBars;
var rightBars;
var innerCircleSize

var backgroundImageThemes = "";

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
                GetBackgroundImage();                
            }
        },
    };

    leftBars = document.getElementById("visualizer-left").getElementsByClassName("bar");
    rightBars = document.getElementById("visualizer-right").getElementsByClassName("bar");
    for (let i = 0; i < leftBars.length; i++) {
        const bar = leftBars[i];
        bar.style.backgroundSize = `${100}% 100%`;
    }
    for (let i = 0; i < rightBars.length; i++) {
        const bar = rightBars[i];
        bar.style.backgroundSize = `${100}% 100%`;
    }

    document.getElementById("visualizer-left").style.width = maxBarWidth + "px";
    document.getElementById("visualizer-right").style.width = maxBarWidth + "px";
    window.wallpaperRegisterAudioListener(wallpaperAudioListener);

    let midnight = new Date().setHours(24, 0, 0, 0)
    setTimeout(function() {
        GetBackgroundImage();
        setInterval(GetBackgroundImage, 86400000);
    }, midnight - Date.now())
};

function GetBackgroundImage() {
    var xhr = new XMLHttpRequest();
    $.ajax({
        url: `https://source.unsplash.com/featured/${window.screen.width}x${window.screen.height}/?${backgroundImageThemes.join(",")}`,
        type: "GET",
        xhr: function() {
            return xhr;
        }
    })
    .done(function (data, textStatus, request) {
        document.getElementById("background-image").src = xhr.responseURL;
    })
    .fail(function(request) {
        console.log(`Failed to get background image. ${request.status}`);
    })
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
        document.getElementById("thumbnail").setAttribute("src", `data:image/jpg;base64,${data.thumbnail}`)
        document.getElementById("song").innerHTML = data.title;
        document.getElementById("artist").innerHTML = `by ${data.artist}`;
    })
    // if the request fails
    .fail(function(request) {
        console.log(`Failed to get media info. ${request.status}`)
    })
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