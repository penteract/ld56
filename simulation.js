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
let water = [[.5,-.5],[1,-2]] // immutable?
let tunnels = [[0,-1]]
let dirts = []
// Orders
let toDig = []
let toBuild = []


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


function tick(){
}
setInterval(tick,1000)


let maxx=20
let minx=-20
let maxy=20
let miny=-20
