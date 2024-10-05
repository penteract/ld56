
SQSZ = 16

function draw(){
  ctx.fillStyle="skyblue" // good color for the sky
  ctx.fillRect(SQSZ*minx,0,SQSZ*(maxx-minx+1),SQSZ*maxy)
  ctx.fillStyle="Sienna" // did you know sienna is a kind of clay?
  ctx.fillRect(SQSZ*minx,SQSZ*miny,SQSZ*(maxx-minx+1),-SQSZ*miny)
  ctx.fillStyle="sandyBrown"
  for (let p of tunnels){
    ctx.fillRect(SQSZ*p[0],SQSZ*p[1],SQSZ,SQSZ)
  }
  ctx.fillStyle="Sienna" // did you know sienna is a kind of clay?
  for (let p of dirts){
    ctx.fillRect(SQSZ*p[0],SQSZ*p[1],SQSZ,SQSZ)
  }
  ctx.fillStyle="mediumpurple"
  for(let ant of ants){
    ctx.fillRect(ant.p[0]*SQSZ,ant.p[1]*SQSZ,SQSZ,SQSZ)
  }
  ctx.fillStyle="#00F8"
  for (let p of water){
    ctx.fillRect(SQSZ*p[0],SQSZ*p[1],SQSZ,SQSZ)
  }
}


let canvas = document.getElementById("main");
let ctx = canvas.getContext("2d");
let scale = 2 // size of a square in pixels divided by 16
// Keeping scale an integer probably helps avoid faint lines between squares
let xoff = ~~((window.innerWidth-SQSZ)/2) ;
let yoff = ~~((window.innerHeight)/2) // location of (0,0) in pixels
// keeping these integers helps avoid faint lines between squares

function redraw(){
  ctx.resetTransform()
  ctx.fillStyle="grey"
  ctx.fillRect(0,0,w,h)
  ctx.setTransform(scale,0,0,-scale,xoff,yoff) // I think setTransform is less likely to leave gaps between squares than mucking with coordinates
  draw()
}

