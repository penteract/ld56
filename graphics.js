
SQSZ = 16

DIRT_COL = "Sienna" // did you know sienna is a kind of clay?
TUNNEL_COL = "sandyBrown"

function draw() {
    ctx.fillStyle = "skyblue" // good color for the sky
    ctx.fillRect(SQSZ * minx, 0, SQSZ * (maxx - minx + 1), SQSZ * (maxy + 1))
    ctx.fillStyle = DIRT_COL
    ctx.fillRect(SQSZ * minx, SQSZ * miny, SQSZ * (maxx - minx + 1), -SQSZ * miny)

    for (let p in map) {
        elt = map[p]
        p = p.split(",")
        if (elt?.includes("tunnel")) {
            ctx.fillStyle = TUNNEL_COL
            ctx.fillRect(SQSZ * p[0], SQSZ * p[1], SQSZ, SQSZ)
        }
        if (elt?.includes("dirt")) {
            ctx.fillStyle = DIRT_COL
            ctx.fillRect(SQSZ * p[0], SQSZ * p[1], SQSZ, SQSZ)
        }

    }

    ctx.fillStyle = "mediumpurple"
    for (let ant of ants) {
        ctx.fillRect(ant.p[0] * SQSZ, ant.p[1] * SQSZ, SQSZ, SQSZ)
    }
    ctx.fillStyle = "#00F8"
    for (let p of water) {
        ctx.fillRect(SQSZ * p[0], SQSZ * p[1], SQSZ, SQSZ)
    }
    ctx.fillStyle = "#8888"
    for (let p in orders["worker"]) if (orders["worker"][p]) {
        p = p.split(",")
        ctx.fillRect(SQSZ * p[0], SQSZ * p[1], SQSZ, SQSZ)
    }
    for (let p in orders["dirt"]) if (orders["dirt"][p]) {
        p = p.split(",")
        ctx.fillRect(SQSZ * p[0], SQSZ * p[1], SQSZ, SQSZ)
        if (orders["dirt"][p] > 1) {
            ctx.fillRect(SQSZ * p[0], SQSZ * p[1], SQSZ, SQSZ)
        }
    }
    ctx.fillStyle = "#AAA8"
    for (let wp in targets) if (targets[wp]) {
        wp = wp.split(",")
        if (wp[0] = "worker") {
            ctx.fillRect(SQSZ * wp[1], SQSZ * wp[2], SQSZ, SQSZ)
        }
    }
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
