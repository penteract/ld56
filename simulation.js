let map = { "0,-1": ["tunnel"] }  // "x,y" : ["water"|"tunnel"|"dirt"|Ant|"toDig"|"toBuild"]
let water = [] //[[1,-2]] // immutable?
let tunnels = [[0, -1]]
let dirts = []

// Orders Could generalize by what the order needs:
//   digging is dirt that needs an ant,
//   building is air or tunnel that needs dirt
//
let orders = { "worker": {}, "dirt": {}, "queen": {} } // These are really Set()s because lists are objects


let draggers = {} // tracks if anyone is dragging a particular thing {[thing,postion]:Ant}
let targets = {} // tracks if anyone is targeting a particular position {[task,postion]:Ant}


const ants = []
class Ant {
    constructor(p) {
        this.queen = false
        this.plan = null
        this.dragging = null // thing (e.g. "dirt")
        this.idx = ants.length
        this.p = p
        put(this, p)
        ants.push(this)

    }
    move(dst) {
        move(this, this.p, dst)
        this.p = dst
    }

    findTarget(type, start, lookForAir = false) {
        // console.log(this, type, start)
        let ordrs = orders[type]
        if (Object.keys(ordrs).length === 0) {
            if (type == "dirt") lookForAir = true
            else return
        }

        function validOrder(q) {
            return ordrs[q] || (lookForAir && isAir(q))
        }

        // This is a heap because that might help with efficiency if we try to reuse it
        // might give suboptimal paths, but it's better than flood filling the map for every ant.
        // We probably need a path fixer that removes loops
        if (start === undefined) {
            assert(type === "worker")
            start = this.p
        }
        else { assert([...neighbs(start)].find(x => x == this.p + "")) }
        let heap = [[0, [start, null]]]
        let seen = {}
        seen[heap[0][1][0]] = true
        let found = undefined
        while (heap.length && !found) {
            let r = heappop(heap)
            //console.log(r)
            let [d, path] = r
            for (let q of neighbs(path[0])) {
                //console.log("v")
                if (!seen[q] && willWalk(q) && inBounds(q) || validOrder(q)) {
                    //console.log("a")
                    seen[q] = true
                    if (validOrder(q)) {
                        found = [q, path]
                    }
                    heappush(heap, d + 1, [q, path])
                    // Could use heuristics to avoid busy areas, increase d by 2 if the cell is occupied by another ant
                }
            }
        }
        console.log(Object.keys(seen).length, found)
        if (found) {
            let plan = linkedListToArray(found)
            console.log(plan)
            if (type === "worker") { plan.pop() }
            this.giveTask([type, plan])
        }
        else if (type == "dirt" && !lookForAir) {
            this.findTarget(type, start, true)
        }
        // targets[["worker", this.plan[0]]] = this
        // this.dragging = undefined
    }

    popTask() {
        //return type [type,plan], ["finished",locaton], "finished"
        if (!this.plan) return null
        let plan = this.plan
        let target = this.plan[0]
        let type = this.dragging ?? "worker"
        let task0 = [type, target]
        if (this.dragging) {
            let dragPos = this.plan[this.plan.length - 1]
            assert(draggers[[type, dragPos]] === this)
            delete draggers[[type, dragPos]]
            this.dragging = null
        }
        assert(targets[task0] === this)
        delete targets[task0]
        assert(orders[type][target] ?? 0 < maxOrders(type)) // assume we cannot place an order on an existing order (including if the existing order has started to be executed)
        this.plan = null
        if (plan.length === 0) {
            return "finished"
        }
        if (plan.length === 1) {
            if (type === "worker") { return ["finished", plan[0]] }
            else { return "finished" }
        }
        orders[type][target] = (orders[type][target] ?? 0) + 1
        return [type, plan]
    }

    giveTask(task) {
        assert(!this.plan)
        if (task === null || task === "finished" || task[0] === "finished") return
        let [type, plan] = task
        let target = plan[0]
        let task0 = [type, target]
        orders[type][target] -= 1
        if (!orders[type][target]) delete orders[type][target]
        targets[task0] = this
        this.plan = plan
        if (type !== "worker") {
            this.dragging = type
            assert(draggers[[type, plan[plan.length - 1]]] === undefined)
            draggers[[type, plan[plan.length - 1]]] = this
        }
    }

    doDrag(src, dest) {
        console.log(draggers)
        assert(draggers[[this.dragging, src]] === this)
        delete draggers[[this.dragging, src]]
        assert(!draggers[[this.dragging, dest]])
        draggers[[this.dragging, dest]] = this

        let thing = move(this.dragging, src, dest)
        this.move(src)
        if (thing == "tunnel") {
            // we just placed dirt as a tunnel in air; cancel plan (consider complete)
            this.popTask()
        }
    }

    followPlan() {
        console.log("following plan", this.plan, this.dragging)
        let ant = this
        let other
        let l = this.plan.length
        //print(l)
        if (l === 0) { // Plan is probably complete
            assert(this.popTask() === "finished")
            return
        }
        if (l === 1) {
            let result = this.popTask()
            if (result === "finished") { return }
            else if (result[0] === "finished") {
                let type = getType(result[1])
                this.findTarget(type, result[1])
            }
            else assert(false)
            return // could be a recursive call so we don't spend a turn making no movement
        }
        if (this.dragging) {
            let cur = this.plan[l - 1]
            let next = this.plan[l - 2]
            if (canWalk(next)) {
                this.plan.pop()
                this.doDrag(cur, next)

                return
            }
            else {
                // reasons we can't move:
                // - ant in the way
                // -- if it's us, just swap
                // -- otherwise, probably switch tasks? depends on its task
                // - dirt in the way
                // -- if being dragged, maybe switch tasks. else, swap and pick up that
                // - it's air, that we wouldn't be able to walk on but can push dirt on
                // - ???
                if (other = hasAnt(next)) {
                    if (other === this) {
                        this.plan.pop()
                        this.doDrag(cur, next)
                        return
                    }
                    else {
                        // TODO
                        assert(false)
                    }
                }
                else if (isAir(next)) {
                    this.plan.pop()
                    this.doDrag(cur, next)
                }
                else {
                    // TODO
                    assert(false)
                }
            }
        }
        else { // worker task
            let next = this.plan[l - 1]
            console.log("next")
            if (canWalk(next)) {
                console.log("canwalk")
                this.move(next)
                this.plan.pop()
                return
            }
            else {
                if (isDirt(next)) {
                    // ordered: done - find new plan
                    // targeted: switch plans with targeter
                    // dragged: ??
                    // built: swap
                    if (orders["worker"][next]) {
                        console.log("found other order")
                        let result = this.popTask()
                        let type = getType(next)
                        this.findTarget(type, next)

                    }
                    if (other = targets[["worker", next]]) {
                        // TODO: rewrite using popTask/giveTask
                        // append remainder of plan to its plan, switch ant with dirt, find new plan
                        assert(other.plan && other.plan[0] == next)
                        // ant.plan: last elt is next, first elt is original target
                        // other.plan: last elt is its next, first elt is its target which is next
                        this.plan.pop()
                        other.plan = ant.plan.concat(other.plan)

                        this.plan.pop()
                        p = ant.p
                        ant.move(next)
                        move("dirt", next, p)

                        // findBuildPlan
                    }
                    if (draggers[["dirt", next]]) {
                        // TODO
                        assert(false)
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

function maxOrders(type) {
    if (type == "dirt") return 2
    else return 1
}


queen = new Ant([0, 0])
queen.queen = false // TODO:make this matter and change it to true

function sel(p) {
    if (!targets[["worker", p]] && isDirt(p)) {
        orders["worker"][p] = true
    }
    if (isAir(p) && ((orders["dirt"][p] ?? 0) + !!targets[["dirt", p]] < maxOrders("dirt"))) {
        orders["dirt"][p] = (orders["dirt"][p] ?? 0) + 1
    }
    if (map[p]?.includes("tunnel") && !targets[["dirt", p]]) {
        assert(!isDirt(p))
        orders["dirt"][p] = 1
    }
    console.log(p)
    redraw()
}
//put("water", [10, 2])
//water.push([10, 2])

function add(p, q) {
    return [p[0] + q[0], p[1] + q[1]]
}

function isDirt(p) {
    return (p[1] < 0 && !map[p]?.includes("tunnel")
        || map[p]?.includes("dirt"))
}

function isAir(p) {
    return (p[1] >= 0 && !map[p]?.includes("tunnel") && !map[p]?.includes("dirt")
        || map[p]?.includes("air"))
}

function getType(p) {
    assert(isDirt(p))
    return "dirt"
}

function hasAnt(p) {
    return map[p]?.find(item => item instanceof Ant)
}

function canWalk(p) {
    return !isDirt(p) && !hasAnt(p) &&
        (map[p]?.includes("tunnel") || isDirt([p[0], p[1] - 1]) || isDirt([p[0] - 1, p[1] - 1]) || isDirt([p[0] + 1, p[1] - 1]))
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
        (map[p]?.includes("tunnel") || willBeDirt([p[0], p[1] - 1]) || willBeDirt([p[0] - 1, p[1] - 1]) || willBeDirt([p[0] + 1, p[1] - 1]))
}



function take(thing, src) {
    let l = map[src]
    if (thing == "dirt" && isDirt(src)) {
        put("tunnel", src)
        if (!l?.includes(thing)) return
    }
    assert(l.includes(thing), l, thing, src)
    if (l.length === 1) delete map[src]
    else l.splice(l.indexOf(thing), 1)
}

function put(thing, dst) {
    if (thing == "dirt") {
        if (isAir(dst)) {
            thing = "tunnel"
            console.log("placed tunnel")
        }
        else if (map[dst]?.includes("tunnel")) {
            take("tunnel", dst)
        }
    }
    if (map[dst]) map[dst].push(thing)
    else map[dst] = [thing]
    return thing
}

function move(thing, src, dst) {
    take(thing, src)
    return put(thing, dst)
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
            ant.findTarget("worker")
        }
        if (ant.plan) { // Execute plan
            ant.followPlan()
        }
    }
    draw()
}

tickInterval = null
function setTickrate(rate) {
    clearInterval(tickInterval)
    setInterval(tick, rate)
}

setTickrate(200)

function assert(c, ...args) {
    if (!c) {
        if (args.length) {
            console.error(...args)
        }
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
