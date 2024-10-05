class Ant{
  constructor(){
      this.queen=false
      this.plan=null
  }
}

queen = new Ant()
queen.queen=true
let ants = [queen]
let map = {"0,-1":["tunnel"]}  // "x,y" : ["water"|"tunnel"|"dirt"|Ant|"toDig"|"toBuild"]
let water = [] //[[1,-2]] // immutable?
let tunnels = [[0,-1]]
let dirts = []
// Orders
let toDig = []
let toBuild = []

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

const MudProb = 0.1
const SidewaysProb = 0.3


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
const rand = Math.random
function tick(){
  let newWater = []
  for(let p of water){
    let r = rand() // This means that moving dirt to dirt isn't slower than air to dirt
                  // but also that water never moves sideways through dirt, which we might want to change
    if(isDirt(p) && r>MudProb) {newWater.push(p);continue}
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
  draw()
}
setInterval(tick,100)


let maxx=20
let minx=-20
let maxy=20
let miny=-20

function inBounds(p){
  ;let [x,y] = p
  return (x<=maxx && x>=minx && y<=maxy && y>=miny)
}

let defined = undefined
