
function resizeCanvas() {
  canvas.width = w = window.innerWidth;
  canvas.height = h = window.innerHeight;
  redraw();
}

function scl(x,y,factor){
  if (factor>2) factor=2;
  if (factor<0.5)factor=0.5;
  let oldscale=scale
  scale*=factor
  scale = Math.round(scale*16)/16
  if(scale==oldscale && factor<0) scale -= 1/16
  else if(scale==oldscale && factor>0) scale += 1/16
  if(scale<1)scale=1;
  if(scale>1000)scale=1000;
  let sr=scale/oldscale
  //xoff = (x-xoff)*(1-sr)
  // This took far too long
  xoff = Math.round((x - (x-xoff)*sr))
  yoff = Math.round((y - (y-yoff)*sr))
  //yoff += y*(oldscale-scale)
  redraw()
}
function whl(e){
  //console.log(e.deltaY)
  if(e.deltaY!=0)scl(e.clientX,e.clientY,Math.pow(0.95,e.deltaY))
}
function roundAway(x){
  return x>0?Math.ceil(x):Math.floor(x)
}
function scroll(dx,dy){
  xoff+=roundAway(dx)
  yoff+=roundAway(dy)
  redraw()
}
if (defined == !defined) throw new ReferenceError("defined is not defined")
//window.addEventListener("click",clk)
window.addEventListener("wheel",whl)
mousepos=[0,0]
window.addEventListener("mousedown",function(e){
  if(e.button===1)mousepos=[-e.clientX,-e.clientY]
})
window.addEventListener("mousemove",function(e){
  if(e.buttons&4){
    scroll(mousepos[0]+e.clientX,mousepos[1]+e.clientY)
    mousepos=[-e.clientX,-e.clientY]
  }
})
document.addEventListener('keydown', (event) => {
  switch(event.key){
    case "a":
    case "h":
    case "ArrowLeft":
       scroll(100,0)
       break
    case "d":
    case "l":
    case "ArrowRight":
       scroll(-100,0)
       break
    case "w":
    case "k":
    case "ArrowUp":
       scroll(0,100)
       break
    case "s":
    case "j":
    case "ArrowDown":
       scroll(0,-100)
       break
  }
});

window.addEventListener('resize', resizeCanvas, false);
resizeCanvas();
