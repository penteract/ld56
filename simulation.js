// Invariants:

// for each ant:
//   if ant.plan:
//     tasktype = ant.dragging ?? "worker"
//     targets[tasktype, ant.plan[0]] === ant

// for each position p:
//   if orders[tasktype,p]:
//     not targets[tasktype,p]
//   if orders["workers",p]:
//     isDirt(p)



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
        maxx = Math.max(maxx, this.p[0] + Margin)
        minx = Math.min(minx, this.p[0] - Margin)
        maxy = Math.max(maxy, this.p[1] + Margin)
        miny = Math.min(miny, this.p[1] - Margin)
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
            return ordrs[q] || (lookForAir && isAir(q) && !targets[[type, q]])
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
        //console.log(Object.keys(seen).length, found)
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
        assert(!orders[type][target]) // assume we cannot place an order on an existing order (including if the existing order has started to be executed)
        this.plan = null
        if (plan.length === 0) {
            return "finished"
        }
        if (plan.length === 1) {
            if (type === "worker") { return ["finished", plan[0]] }
            else { return "finished" }
        }
        orders[type][target] = true
        return [type, plan]
    }

    giveTask(task) {
        assert(!this.plan)
        if (task === null || task === "finished" || task[0] === "finished") return
        let [type, plan] = task
        let target = plan[0]
        let task0 = [type, target]
        delete orders[type][target]
        targets[task0] = this
        this.plan = plan
        if (type !== "worker") {
            this.dragging = type
            assert(draggers[[type, plan[plan.length - 1]]] === undefined)
            draggers[[type, plan[plan.length - 1]]] = this
        }
    }

    doDrag() {
        let src = this.plan.pop()
        let dest = this.plan[this.plan.length - 1]
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
                this.doDrag()
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
                        this.doDrag()
                        return
                    }
                    else {
                        // TODO
                        // other ant in the way of our dragging
                        // - if it has no task or is a worker, switch?
                        // - if its dragging... probably we wait. maybe a chance to hand off our plan and abandon theirs. 
                        if (!other.dragging) {
                            console.log("ant in way of dragging - swapping tasks")
                            let myTask = this.popTask()
                            let otherTask = other.popTask()

                            // my next intended step (for the pushed dirt) is their current position
                            // they want to carry the same path (and their first step would be to swap)
                            // the path of the block hasn't changed, so we don't modify the task
                            other.giveTask(myTask)

                            if (!otherTask || otherTask === "finished" || otherTask[0] === "finished") return

                            let [otherType, otherPlan] = otherTask
                            assert(otherType === "worker")

                            otherPlan = concatPaths(otherPlan, [other.p, next, this.p])
                            otherPlan.pop()

                            this.giveTask([otherType, otherPlan])

                        }
                        else {
                            assert(false)
                        }
                    }
                }
                else if (isAir(next)) {
                    this.doDrag()
                }
                else if (isDirt(next)) {
                    if (other = draggers[[dirt,next]]){
                        assert(false)
                    }
                    else{
                        if ((other = targets[["worker", next]]) || orders["worker"][next]) {
                            origPlan = this.plan
                            origPos = this.p
                            origPlan.push(origPos)
                            origPlan.push(origPlan[origPlan.length-2])
                            doDrag() // if this puts dirt into air, it unsets our plan
                            let oldTask = this.popTask() // this may be undefined, but not finished
                            origPlan.length-=2 // pushed +2, popped -1, moved +1
                            if(other){//take their dirt and give them ours
                                let [type,otherPlan] = other.popTask()
                                if(type==="finished") {otherPlan = [otherPlan]}
                                else {assert (type==="worker")}
                                if(oldTask) {
                                    other.giveTask([
                                        "worker",
                                        concatPaths([origPos, this.p],otherPlan)
                                        ])
                                }
                            }
                            this.giveTask(["dirt" ,origPlan])
                        }
                        else{
                            // wait for next turn and recalculate path around obstacle then
                            let t = this.popTask()
                            if(t!="finished" && t[0]!="finished"){
                                this.giveTask(["worker",[t[1][t[1].length-1]]])
                            }
                        }
                    }
                }
                else{
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
                        let type
                        if (type = getType(next)) {
                            this.findTarget(type, next)
                        }

                    }
                    else if (other = targets[["worker", next]]) {
                        // append remainder of plan to its plan, switch ant with dirt, find new plan

                        console.log("found another targeted block - handing off plan")

                        let [otherType, otherPlan] = other.popTask()
                        assert(otherType === "worker" && otherPlan[0] + "" === next + "")

                        let [myType, myPlan] = this.popTask()
                        assert(myType === "worker")

                        otherPlan = concatPaths(myPlan, otherPlan)
                        other.giveTask([myType, otherPlan])

                        // give task to properly clear the order
                        this.giveTask(["worker", [next]])
                        assert(this.popTask()[0] == "finished")

                        let newType = getType(next)
                        this.findTarget(newType, next)
                    }
                    else if (other = draggers[["dirt", next]]) {
                        // dragged dirt is in the way. relevant cases are if i'm in their way or not.
                        let otherNext = other.plan[other.plan.length - 2]
                        if (otherNext + "" === this.p + "") {
                            console.log("in the way of dragged path while not dragging - switching and performing a step")
                            let myTask = this.popTask()
                            let otherTask = other.popTask()
                            this.giveTask(otherTask) // don't need to modify this path (now), block path hasn;t changed 
                            this.doDrag()

                            if (myTask[1][myTask[1].length - 2] + "" === other.p + "") {
                                console.log("simplifying path")
                                myTask[1].length -= 2
                            }
                            other.giveTask(myTask)
                        }
                        else {
                            // dragged block in our way, we are not in its way. seems sensible to wait (switching puts them in our situation again)
                            // may consider probibalistic switching 
                            console.log("dragged block in our way, we are not in its way - idling")
                        }
                    }
                    else {
                        console.log("placed block in way - swapping")
                        move("dirt", next, this.p)
                        this.move(next)
                        this.plan.pop()
                        return
                    }
                }
                else if (other = hasAnt(next)) {
                    if (!other.dragging) {
                        console.log("ant in way - swapping tasks")
                        let myTask = this.popTask()
                        let otherTask = other.popTask()

                        let [myType, myPlan] = myTask
                        myPlan.pop() // my plan's next intended step is their current step

                        other.giveTask([myType, myPlan])

                        if (!otherTask || otherTask === "finished" || otherTask[0] === "finished") return

                        let [otherType, otherPlan] = otherTask
                        assert(otherType === "worker")
                        otherPlan = concatPaths(otherPlan, [other.p, this.p])
                        otherPlan.pop()

                        this.giveTask([otherType, otherPlan])

                    }
                    else {
                        // im not dragging, they are
                        // im not in their way due to parity
                        // doing nothing seems like the sensible option here 
                        console.log("dragger in the way - idling")
                        return
                    }
                }
            }
        }
    }
}

function concatPaths(p1, p2) {
    let res = []
    let idx
    for (let p of p1) {
        res.push(p)
        if ((idx = p2.indexOf(p)) > -1) {
            res.push(...p2.slice(idx + 1))
            return res
        }
    }
    res.push(...p2)
    return res
}


queen = new Ant([0, 0])
otherAnt = new Ant([1, 0])
queen.queen = false // TODO:make this matter and change it to true

function sel(p) {
    if (!targets[["worker", p]] && isDirt(p) && !draggers[["dirt", p]]) {
        orders["worker"][p] = true
    }
    if (isAir(p) && !targets[["dirt", p]]) {
        orders["dirt"][p] = true
    }
    if (map[p]?.includes("tunnel") && !targets[["dirt", p]]) {
        assert(!isDirt(p))
        orders["dirt"][p] = true
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
    // assert(isDirt(p)) <- would like to do this, but it fails sometimes and it probably not too bad if it happens

    if (isDirt(p)) return "dirt"
    else console.warn("Couldn't find dirt where expected")
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
    tickInterval = setInterval(tick, rate)
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
