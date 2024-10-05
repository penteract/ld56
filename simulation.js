const ants = []
class Ant {
    constructor(p) {
        this.queen = false
        this.plan = null
        this.dragging = null // thing (e.g. "dirt")
        this.idx = ants.length
        this.p = p
        ants.push(this)

    }
    move(dst) {
        move(this, this.p, dst)
    }

    findDigPlan() {
        let ant = this
        let ordrs = orders["worker"]// TODO: check if empty

        // This is a heap because that might help with efficiency if we try to reuse it
        // might give suboptimal paths, but it's better than flood filling the map for every ant.
        // We probably need a path fixer that removes loops
        let heap = [[0, [ant.p, null]]]
        let seen = {}
        seen[heap[0][1][0]] = true
        let found = undefined
        while (heap.length && !found) {
            let r = heappop(heap)
            //console.log(r)
            let [d, path] = r
            for (let q of neighbs(path[0])) {
                //console.log("v")
                if (!seen[q] && willWalk(q) && inBounds(q) || ordrs[q]) {
                    //console.log("a")
                    seen[q] = true
                    if (ordrs[q]) {
                        found = [q, path]
                    }
                    heappush(heap, d + 1, [q, path])
                    // Could use heuristics to avoid busy areas, increase d by 2 if the cell is occupied by another ant
                }
            }
        }
        console.log(Object.keys(seen).length, found)
        ant.plan = linkedListToArray(found)
        ant.plan.pop()
        targets[["worker", ant.plan[0]]] = ant
        ant.dragging = undefined
    }

    popTask() {
        if (!this.plan) return null
        if (this.plan.length === 0) {
            // 
        }
        let target = this.plan[0]
        let type = this.dragging ?? "worker"
        let task0 = [type, target]
        assert(targets[task0] === this)
        targets[task0] = undefined
        assert(!orders[type][target]) // assume we cannot place an order on an existing order (including if the existing order has started to be executed)
        orders[type][target] = true
        let plan = this.plan
        this.plan = null
        if (!this.dragging) {
            let dragPos = this.plan[this.plan.length - 1]
            assert(draggers[[type, dragPos]] === this)
            draggers[[type, dragPos]] = undefined
            this.dragging = null
        }
        return [type, plan]
    }

    giveTask(task) {
        assert(!this.plan)
        if (task === null) return
        let [type, plan] = task
        let target = plan[0]
        let task0 = [type, target]
        orders[type][target] = undefined

    }

    findBuildPlan() {
        //
    }

    followPlan() {
        let ant = this
        let other
        l = ant.plan.length
        if (l === 0) {
            ant.popTask()
            return
        }
        next = ant.plan[l - 1]
        if (canWalk(next)) {
            ant.move(next)
            ant.plan.pop()
        }
        else {
            if (isDirt(next)) {
                // ordered: done - find new plan
                // targeted: switch plans with targeter
                // dragged: ??
                // built: swap
                if (orders["worker"][next]) {
                    // switch ant with dirt, find new plan
                    ant.plan.pop()
                    p = ant.p
                    ant.move(next)
                    move("dirt", next, p)

                    // findBuildPlan
                }
                if (other = targets[["worker", next]]) {
                    // append remainder of plan to its plan, switch ant with dirt, find new plan
                    assert(other.plan && other.plan[0] == next)
                    // ant.plan: last elt is next, first elt is original target
                    // other.plan: last elt is its next, first elt is its target which is next
                    ant.plan.pop()
                    other.plan = ant.plan.concat(other.plan)

                    ant.plan.pop()
                    p = ant.p
                    ant.move(next)
                    move("dirt", next, p)

                    // findBuildPlan
                }
                if (draggers[["dirt", next]]) {
                    // ?
                }
            }
            else if (other = hasAnt(next)) {
                if (!other.dragging) {

                }
            }
        }
    }

}
}

queen = new Ant([0, 0])
queen.queen = false // TODO:make this matter and change it to true
let map = { "0,-1": ["tunnel"] }  // "x,y" : ["water"|"tunnel"|"dirt"|Ant|"toDig"|"toBuild"]
let water = [] //[[1,-2]] // immutable?
let tunnels = [[0, -1]]
let dirts = []

// Orders Could generalize by what the order needs:
//   digging is dirt that needs an ant,
//   building is air or tunnel that needs dirt
//
let orders = { "worker": {}, "dirt": {}, "queen": {} } // These are really Set()s because lists are objects

function sel(p) {
    orders["worker"][p] = true
    console.log(p)
}

let draggers = {} // tracks if anyone is dragging a particular thing {[thing,postion]:Ant}
let targets = {} // tracks if anyone is targeting a particular position {[task,postion]:Ant}

put("water", [10, 2])
water.push([10, 2])

function add(p, q) {
    return [p[0] + q[0], p[1] + q[1]]
}

function isDirt(p) {
    return (p[1] < 0 && !map[p]?.includes("tunnel")
        || map[p]?.includes("dirt"))
}

function hasAnt(p) {
    return map[p].find(item => item instanceof Ant)
}

function canWalk(p) {
    return !isDirt(p) && !hasAnt(p) &&
        (map[p]?.includes("tunnel") || isDirt([p[0], p[1] - 1]) || isDirt([p[0] - 1, p[1]] - 1) || isDirt([p[0] + 1, p[1]] - 1))
}
function canBreathe(p) {
    for (let dx = -1; dx <= 1; dx++)for (let dy = -1; dy <= 1; dy++) {
        let q = add(p, [dx, dy])
        if (!isDirt(q) && !map[q]?.includes("water")) {
            return true
        }
    }
    return false
}

function willBeDirt(p) {
    return (p[1] < 0 && !map[p]?.includes("tunnel")
        || map[p]?.includes("dirt")
        || targets[["dirt", p]])
}

function willWalk(p) {
    return (!isDirt(p) || targets[["worker", p]] || draggers[["dirt", p]]) &&
        (map[p]?.includes("tunnel") || willBeDirt([p[0], p[1] - 1]) || willBeDirt([p[0] - 1, p[1]] - 1) || willBeDirt([p[0] + 1, p[1]] - 1))
}



function take(thing, src) {
    let l = map[src]
    if (l.length == 1) delete map[src]
    else l.splice(l.indexOf(thing), 1)
}
function put(thing, dst) {
    if (map[dst]) map[dst].push(thing)
    else map[dst] = [thing]
}
function move(thing, src, dst) {
    take(thing, src)
    put(thing, dst)
}

const rand = Math.random
let MudProb = 0.1 // saturated mud accepts rain much more slowly. With MudProb=0.1, the maximum flow through dirt appears to be around 0.03
let SidewaysProb = 0.3
let RainProb = 0.03

function* neighbs(p) {
    yield add(p, [1, 0])
    yield add(p, [-1, 0])
    yield add(p, [0, 1])
    yield add(p, [0, -1])
}

function tryMoveW(src, dst, r, l) {
    if (map[dst]?.includes("water") || isDirt(dst) && r > MudProb) { return false }
    if (inBounds(dst)) {
        move("water", src, dst)
        l.push(dst)
    }
    else {
        take("water", src)
    }
    return true
}

tickCount = 0

function tick() {
    tickCount += 1
    RainProb = (1 + Math.sin(tickCount / 100)) ** 2 * 0.01
    // Should this vary by x coordinate? That would mean you'd have to deal with floods coming from the sides, as well as just rain from above
    let newWater = []
    for (let x = minx; x <= maxx; x++) {
        // Add rain
        // doing this before water movement means new water is at the start of the list, so bubbles don't move up instantly
        let p = [x, maxy];
        if (!map[p]?.includes("water") && rand() < RainProb) {
            put("water", p)
            newWater.push(p)
        }
    }
    for (let p of water) {
        let r = rand() // This means that moving dirt to dirt isn't slower than air to dirt
        // but also that water never moves sideways through dirt, which we might want to change
        if (isDirt(p) && r > MudProb) {
            newWater.push(p);
            continue
        }
        if (tryMoveW(p, add(p, [0, -1]), r, newWater)) { continue }
        let sr = rand()
        if (sr < SidewaysProb) {
            if (tryMoveW(p, add(p, [1, 0]), r, newWater)) { continue }
        }
        else if (sr < SidewaysProb * 2) {
            if (tryMoveW(p, add(p, [-1, 0]), r, newWater)) { continue }
        }
        newWater.push(p)
    }
    water = newWater

    // Search for tasks available
    // tracking ants that have been encountered during the search might be able to speed things up
    // (particularly to avoid searching a large empty region multiple times)

    for (let ant of ants) {
        if (!ant.plan) {
            ant.findDigPlan()
        }
        if (ant.plan) { // Execute plan
            ant.followPlan()
        }
    }
    draw()
}
setInterval(tick, 2000)

function assert(c) {
    if (!c) {
        throw "assertion"
    }
}

function linkedListToArray(ll) {
    let res = []
    while (ll) {
        res.push(ll[0])
        ll = ll[1]
    }
    return res
}

const Margin = 20 // Changing Margin has an effect on water throughput

let maxx = Margin
let minx = -Margin
let maxy = Margin
let miny = -Margin

function inBounds(p) {
    ; let [x, y] = p
    return (x <= maxx && x >= minx && y <= maxy && y >= miny)
}

let defined = undefined
