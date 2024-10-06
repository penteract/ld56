
SQSZ = 16

STROKEWIDTH = 1

colMap = {
    "dirt": "Sienna", // did you know sienna is a kind of clay?
    "tunnel": "sandyBrown",
    "ant": "darkred",
    "worker": "darkred",
    "queen": "#4b006e", //"#7851a9"
    "grub": "seashell",
    "food": "red",
    "water": "#00F8",
}

function draw() {
    ctx.fillStyle = "skyblue" // good color for the sky
    ctx.fillRect(SQSZ * minx, 0, SQSZ * (maxx - minx + 1), SQSZ * (maxy + 1))
    ctx.fillStyle = colMap["dirt"]
    ctx.fillRect(SQSZ * minx, SQSZ * miny, SQSZ * (maxx - minx + 1), -SQSZ * miny)

    for (let p in map) {
        elt = map[p]
        p = p.split(",")
        for (let t in colMap) {
            if (elt?.includes(t)) {
                ctx.fillStyle = colMap[t]
                ctx.fillRect(SQSZ * p[0], SQSZ * p[1], SQSZ, SQSZ)
            }
        }

    }
    for (let type of ["ant", "water"]) {
        ctx.fillStyle = colMap[type]
        for (let thing of thingLists[type]) {
            if (thing.p) {
                ctx.fillRect(thing.p[0] * SQSZ, thing.p[1] * SQSZ, SQSZ, SQSZ)
            }
            else {
                ctx.fillRect(thing[0] * SQSZ, thing[1] * SQSZ, SQSZ, SQSZ)
            }
        }
    }
    //}
    ctx.setLineDash([5, 5])
    for (let type in orders) {
        ctx.strokeStyle = colMap[type]
        for (let p in orders[type]) {
            let [x, y] = p.split(",")
            ctx.strokeRect(SQSZ * x + STROKEWIDTH / 2, SQSZ * y + STROKEWIDTH / 2, SQSZ - STROKEWIDTH, SQSZ - STROKEWIDTH)
        }
    }
    ctx.setLineDash([])
    for (let wp in targets) {
        let [thing, x, y] = wp.split(",")
        ctx.strokeStyle = colMap[thing]
        ctx.strokeRect(SQSZ * x + STROKEWIDTH / 2, SQSZ * y + STROKEWIDTH / 2, SQSZ - STROKEWIDTH, SQSZ - STROKEWIDTH)
    }

    /*    ctx.fillStyle = "darkred"
        for (let ant of ants) {
            ctx.fillRect(ant.p[0] * SQSZ, ant.p[1] * SQSZ, SQSZ, SQSZ)
        }
        ctx.fillStyle = "#00F8"
        for (let p of water) {
            ctx.fillRect(SQSZ * p[0], SQSZ * p[1], SQSZ, SQSZ)
        }*/
    /*    ctx.strokeStyle = "#F00"
        for (let p in orders["worker"]) if (orders["worker"][p]) {
            p = p.split(",")
            ctx.strokeRect(SQSZ * p[0] + STROKEWIDTH/2  , SQSZ * p[1] + STROKEWIDTH/2, SQSZ- STROKEWIDTH, SQSZ - STROKEWIDTH)
        }
        for (let p in orders["dirt"]) if (orders["dirt"][p]) {
            p = p.split(",")
            ctx.strokeRect(SQSZ * p[0] + STROKEWIDTH/2  , SQSZ * p[1] + STROKEWIDTH/2, SQSZ- STROKEWIDTH, SQSZ - STROKEWIDTH)
        }
        ctx.strokeStyle = "#FFF"
        for (let wp in targets) if (targets[wp]) {
            wp = wp.split(",")
            if (wp[0] = "worker") {
                ctx.strokeRect(SQSZ * wp[1] + STROKEWIDTH/2  , SQSZ * wp[2] + STROKEWIDTH/2, SQSZ- STROKEWIDTH, SQSZ - STROKEWIDTH)
            }
        }*/
}


let canvas = document.getElementById("main");
let ctx = canvas.getContext("2d");
let scale = 2 // size of a square in pixels divided by 16
// Keeping scale an integer probably helps avoid faint lines between squares
let xoff = ~~((window.innerWidth - SQSZ) / 2);
let yoff = ~~((window.innerHeight) / 2) // location of (0,0) in pixels
// keeping these integers helps avoid faint lines between squares

function redraw() {
    ctx.resetTransform()
    ctx.fillStyle = "grey"
    ctx.fillRect(0, 0, w, h)
    ctx.setTransform(scale, 0, 0, -scale, xoff, yoff) // I think setTransform is less likely to leave gaps between squares than mucking with coordinates
    draw()
}
