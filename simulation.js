const ants = []
class Ant{
  constructor(p){
      this.queen=false
      this.plan=null
      this.dragging = undefined // [thing,position]
      this.idx = ants.length
      this.p=p
      ants.push(this)

  }
  move(dst){
    move(this,this.p,dst)
  }
}

queen = new Ant([0,0])
queen.queen=true
let map = {"0,-1":["tunnel"]}  // "x,y" : ["water"|"tunnel"|"dirt"|Ant|"toDig"|"toBuild"]
let water = [] //[[1,-2]] // immutable?
let tunnels = [[0,-1]]
let dirts = []

// Orders
let toDig = new Set()

let toBuild = new Set()

let draggers = {} // tracks if anyone is dragging a particular thing {[thing,postion]:Ant}

put("water",[10,2])
water.push([10,2])

function add(p,q){
  return [p[0]+q[0],p[1]+q[1]]
}

function isDirt(p){
  return (p[1]<0 && !map[p]?.includes("tunnel")
          || map[p]?.includes("dirt") )
}
function canWalk(p){
  return !isDirt(p) && (p.includes("tunnel")||isDirt([p[0],p[1]-1]))
  (p[1]<0 && !map[p]?.includes("tunnel")
          || map[p]?.includes("dirt") )
}
function canBreathe(p){
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
    let q = add(p,[dx,dy])
    if (!isDirt(q) && !map[q].includes("water")){
      return true
    }
  }
  return false
}



function take(thing,src){
  let l = map[src]
  if (l.length==1) delete map[src]
  else l.splice(l.indexOf(thing),1)
}
function put(thing,dst){
  if(map[dst]) map[dst].push(thing)
  else map[dst]=[thing]
}
function move(thing,src,dst){
  take(thing,src)
  put(thing,dst)
}

const rand = Math.random
let MudProb = 0.1 // saturated mud accepts rain much more slowly. With MudProb=0.1, the maximum flow through dirt appears to be around 0.03
let SidewaysProb = 0.3
let RainProb = 0.03


function tryMoveW(src,dst,r,l){
  if(map[dst]?.includes("water") || isDirt(dst) && r>MudProb) {return false}
  if(inBounds(dst)){
    move("water",src,dst)
    l.push(dst)
  }
  else{
    take("water",src)
  }
  return true
}

tickCount = 0

function tick(){
  tickCount += 1
  RainProb = (1+Math.sin(tickCount/100))**2 *0.01
  // Should this vary by x coordinate? That would mean you'd have to deal with floods coming from the sides, as well as just rain from above
  let newWater = []
  for(let x=minx;x<=maxx;x++){
    // Add rain
    // doing this before water movement means new water is at the start of the list, so bubbles don't move up instantly
    let p = [x,maxy];
    if (!map[p]?.includes("water") && rand()<RainProb){
       put("water",p)
       newWater.push(p)
    }
  }
  for(let p of water){
    let r = rand() // This means that moving dirt to dirt isn't slower than air to dirt
                  // but also that water never moves sideways through dirt, which we might want to change
    if(isDirt(p) && r>MudProb) {
      newWater.push(p);
      continue
    }
    if (tryMoveW(p,add(p,[0,-1]),r,newWater)) {continue}
    let sr = rand()
    if (sr<SidewaysProb){
      if (tryMoveW(p,add(p,[1,0]),r,newWater)) {continue}
    }
    else if(sr<SidewaysProb*2){
      if (tryMoveW(p,add(p,[-1,0]),r,newWater)) {continue}
    }
    newWater.push(p)
  }
  water=newWater

  // Search for tasks available
  // tracking ants that have been encountered during the search might be able to speed things up
  // (particularly to avoid searching a large empty region multiple times)
  let frontier = []
  for(let ant of ants){
    if(ant.plan){ // Execute plan
      //ant.followplan()
    }
    else{
    }
  }
  draw()
}
setInterval(tick,100)


const Margin = 20

let maxx=Margin
let minx=-Margin
let maxy=Margin
let miny=-Margin

function inBounds(p){
  ;let [x,y] = p
  return (x<=maxx && x>=minx && y<=maxy && y>=miny)
}

let defined = undefined
