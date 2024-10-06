// Invariants:

// for each ant:
//   if ant.plan:
//     tasktype = ant.dragging ?? "worker"
//     targets[tasktype, ant.plan[0]] === ant
//   if ant.dragging:
//     draggers[ant.draggng,ant.plan[-1]] = ant
//     if ant.dragging == "dirt":
//       isDirt(ant.plan[-1])

// for each position p:
//   if orders[tasktype,p]:
//     not targets[tasktype,p]
//     not draggers[tasktype,p]
//   if orders["workers",p]:
//     isDirt(p)

let map = {}  // "x,y" : ["water"|"tunnel"|"dirt"|Ant|"toDig"|"toBuild"]


let thingLists = {}


thingLists["water"] = [] //[[1,-2]] // immutable?
thingLists["tunnel"] = [[0, -1]]
thingLists["ant"] = []
let dirts = []

solidTypes = ["dirt", "food", "grub", "queen"] // if we add stone, we may want to separate solid types from pushable types

// Orders Could generalize by what the order needs:
//   digging is dirt that needs an ant,
//   building is air or tunnel that needs dirt
//
let orders = { "worker": {} } // These are really Set()s because lists are objects
for (let t of solidTypes) {
    orders[t] = {}
}


let draggers = {} // tracks if anyone is dragging a particular thing {[thing,postion]:Ant}
let targets = {} // tracks if anyone is targeting a particular position {[task,postion]:Ant}


//const ants = []
class Ant {
    constructor(p) {
        this.plan = null
        this.dragging = null // thing (e.g. "dirt")
        this.idx = thingLists["ant"].length
        this.p = p
        put(this, p)
        thingLists["ant"].push(this)

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
        } else if (type !== "worker") {
            console.warn("search failed")
            //throw new Error("search failed")
            orders["worker"][start] = true // there shouldn't have been an order/target on start when we called this, so this shouldn't break invariants
        }
    }

    popTask(finishing) {
        //return type [type,plan], ["finished",locaton], "finished"
        if (!this.plan) return null
        let plan = this.plan
        let target = this.plan[0]
        let type = this.dragging ?? "worker"
        let task0 = [type, target]
        if (this.dragging) {
            var dragPos = this.plan[this.plan.length - 1]
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
        /*if(!finishing && type!=="worker"){
            if(orders[type][dragPos]){console.warn("didn't expect an order to already be there")}
            orders[type][dragPos] = true
        }*/
        orders[type][target] = true
        return [type, plan]
    }

    giveTask(task) {
        assert(!this.plan)
        if (task === null || task === "finished" || task[0] === "finished") return
        // TODO: Remove assertion for efficiency before release
        // DO NOT REMOVE beforehand. it is a very useful test
        for (let i = 0; i < task[1].length; i++) {
            assert([...neighbs(task[1][i])].find(x => x == (i + 1 < task[1].length ? task[1][i + 1] : this.p) + ""))
        }
        let [type, plan] = task
        let target = plan[0]
        let task0 = [type, target]
        delete orders[type][target]
        targets[task0] = this
        this.plan = plan
        if (type !== "worker") {
            this.dragging = type
            let draggedPos = plan[plan.length - 1]
            assert(draggers[[type, draggedPos]] === undefined)
            draggers[[type, draggedPos]] = this
            // orders["worker"][draggedPos] may not have been true. That's not a problem
            delete orders["worker"][draggedPos]
        }
    }

    doDrag() {
        let src = this.plan.pop()
        let dest = this.plan[this.plan.length - 1]
        //console.log(draggers)
        assert(draggers[[this.dragging, src]] === this)
        delete draggers[[this.dragging, src]]
        assert(!draggers[[this.dragging, dest]])
        draggers[[this.dragging, dest]] = this

        let thing = move(this.dragging, src, dest)
        this.move(src)
        if (thing == "tunnel") {
            // we just placed dirt as a tunnel in air; cancel plan (consider complete)
            this.popTask(true)
        }
    }

    followPlan() {
        console.info("following plan", this.plan, this.dragging)
        let other
        let l = this.plan.length
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
                        // other ant in the way of our dragging
                        // - if it has no task or is a worker, switch?
                        // - if its dragging... probably we wait. maybe a chance to hand off our plan and abandon theirs. 
                        if (!other.dragging) {
                            console.info(this.idx, new Date(), "ant in way of dragging - swapping tasks")
                            let myTask = this.popTask()
                            let otherTask = other.popTask()

                            // my next intended step (for the pushed dirt) is their current position
                            // they want to carry the same path (and their first step would be to swap)
                            // the path of the block hasn't changed, so we don't modify the task
                            other.giveTask(myTask)

                            if (!otherTask || otherTask === "finished") return
                            if (otherTask[0] === "finished") otherTask = ["worker", [otherTask[1]]]

                            let [otherType, otherPlan] = otherTask
                            assert(otherType === "worker")

                            otherPlan = concatPaths(otherPlan, [other.p, cur, this.p])
                            otherPlan.pop()

                            this.giveTask([otherType, otherPlan])

                        }
                        else {
                            console.info(this.idx, new Date(), "want to push block into other ant which is also pushing something")
                            if (other.plan[other.plan.length - 2] + "" == this.p + "") {
                                console.info(this.idx, new Date(), "swapping plans that push into each other")
                                let myTask = this.popTask() // did not finish
                                let otherTask = other.popTask()// did not finish
                                // for multiple different pushable types, the same object still goes with the same plan
                                other.giveTask(myTask)
                                this.giveTask(otherTask)
                            } else {// probably fine to wait, but there are possible deadlocks involving several ants.
                                if (rand() < 0.03) {
                                    console.info(this.idx, new Date(), "randomly deciding to hand task to busy friend")
                                    let myTask = this.popTask() // did not finish
                                    let otherTask = other.popTask()// might have finished
                                    other.giveTask(myTask)
                                    console.info(otherTask + "")
                                    if (otherTask !== "finished" && otherTask[0] != "finished") {
                                        orders["worker"][otherTask[1][otherTask[1].length - 1]] = true
                                    }
                                }
                            }
                        }
                    }
                }
                else if (isAir(next)) {
                    this.doDrag()
                }
                else if (isSolid(next)) {
                    let nextType = getType(next)
                    let curType = this.dragging
                    if (other = draggers[[nextType, next]]) {
                        console.info(this.idx, new Date(), "Trying to push dirt into dirt someone else is trying to push")
                        if (other.plan[other.plan.length - 2] + "" == next + "") {
                            console.info(this.idx, new Date(), "swapping tasks, shortening both :)")
                            let myTask = this.popTask() // did not finish
                            let otherTask = other.popTask()// did not finish
                            //shorten both tasks, draggers handled by poptask
                            myTask[1].pop()
                            let cur = otherTask[1].pop()
                            // for two dirts, we'd be done; each dirt is in the intended next step of the other plan

                            // for other pushables, we should swap them 
                            let res = swap(curType, cur, nextType, next)
                            // could have pushed dirt into air like this - handle potential leftover orders
                            if (res[0] === "tunnel") { // swap returns the result of the first type first - so this is the case of dirt (curType) becoming tunnel at position next
                                delete orders["dirt"][next] // might not be an order here, but if there is (next step was the last step), remove it
                            }
                            else other.giveTask(myTask) // we dont give this task if it just finished by being pushed to air (myTask had next as its next step)
                            if (res[1] == "tunnel") {
                                delete orders["dirt"][cur]
                            }
                            else this.giveTask(otherTask)
                        }
                        else {//Probably fine to wait, but there are possible deadlocks
                            if (rand() < 0.05) {
                                console.info(this.idx, new Date(), "swapping tasks and associated blocks")
                                let myTask = this.popTask() // did not finish
                                let otherTask = other.popTask()// might have finished
                                // draggers handled by poptask
                                if (otherTask == "finished") { otherTask = ["finished", []] }
                                otherTask[1].push(myTask[1].pop())
                                other.giveTask(myTask)
                                this.giveTask(otherTask)
                            }
                        }

                    }
                    else {
                        if (((other = targets[["worker", next]]) || orders["worker"][next]) && nextType == curType) { // only try pushing along another thing of the same type
                            console.info(this.idx, new Date(), "encountered dirt, switching to drag it")
                            let origPlan = this.plan
                            let origPos = this.p
                            origPlan.push(origPos)
                            origPlan.push(origPlan[origPlan.length - 2])
                            this.doDrag() // if this puts dirt into air, it unsets our plan
                            let oldTask = this.popTask() // this may be undefined, but not finished
                            origPlan.length -= 2 // pushed +2, popped -1, moved +1. after this, we are where our original dirt was, and the front of the path (its last element) is the other dirt
                            if (other) {//take their dirt and give them ours
                                let [type, otherPlan] = other.popTask()
                                if (type === "finished") { otherPlan = [otherPlan] }
                                else { assert(type === "worker") }
                                if (oldTask) {
                                    other.giveTask([
                                        "worker",
                                        concatPaths([origPos, this.p], otherPlan)
                                    ])
                                }
                            } else if (oldTask) { // order the dirt we dropped to be collected
                                // to keep invariants:
                                // - this must be dirt 
                                // -- the doDrag ensures that)
                                // -- if the doDrag pushed it onto air, oldTask is falsy as it ended up being finished in the doDrag step
                                // - and not targeted 
                                // -- it shouldn't be due to not being dirt previously

                                // additionally in this case there must have been an order on the previous dirt om position next; so it makes sense to create a new order.
                                // the following call to giveTask removes the original order on next
                                orders["worker"][origPos] = true
                            }
                            this.giveTask(["dirt", origPlan])
                        }
                        else {
                            // wait for next turn and recalculate path around obstacle then
                            console.info(this.idx, new Date(), "encountered dirt, rerouting")
                            let t = this.popTask()
                            if (t != "finished" && t[0] != "finished") {
                                this.giveTask(["worker", [t[1][t[1].length - 1]]])
                            }
                        }
                    }
                }
                else {
                    // this shouldn't happen (not air, not dirt, not ant => tunnel)
                    // unless we decide to add restrictions involving water
                    assert(false)
                }
            }
        }
        else { // worker task
            let next = this.plan[l - 1]
            //console.log("next")
            if (canWalk(next)) {
                //console.log("canwalk")
                this.move(next)
                this.plan.pop()
                return
            }
            else {
                if (isSolid(next)) {
                    let nextType = getType(next)
                    // ordered: done - find new plan
                    // targeted: switch plans with targeter
                    // dragged: switch path or wait 
                    // built: swap
                    if (orders["worker"][next]) {
                        console.info(this.idx, new Date(), "found other order")
                        let result = this.popTask()
                        let type
                        if (type = getType(next)) {
                            this.findTarget(type, next)
                        }

                    }
                    else if (other = targets[["worker", next]]) {
                        if (other === this) {
                            console.warn("some sort of loop")
                            assert(this.plan[0] + "" === next + "")
                            this.popTask() // This won't say "finished", so we rely on giveTask to remove the order. If findTarget fails, this will leave the order there
                            let type
                            if (type = getType(next)) {
                                this.findTarget(type, next)
                            }
                            return
                        }
                        // append remainder of plan to its plan, switch ant with dirt, find new plan

                        console.info(this.idx, new Date(), "found another targeted block - handing off plan")

                        let [otherType, otherPlan] = other.popTask()
                        assert(otherType === "finished" && otherPlan + "" === next + ""
                            || otherType === "worker" && otherPlan[0] + "" === next + "")

                        let [myType, myPlan] = this.popTask() // this cannot be finished because next is someone else's target
                        assert(myType === "worker")
                        if (otherType === "finished") {
                            otherPlan = [otherPlan]
                        }
                        myPlan.pop() // last element is same as first element from otherplan
                        otherPlan = concatPaths(myPlan, otherPlan)
                        other.giveTask([myType, otherPlan])

                        // give task to properly clear the order
                        this.giveTask(["worker", [next]])
                        assert(this.popTask()[0] == "finished")

                        let newType = getType(next)
                        this.findTarget(newType, next)
                    }
                    else if (other = draggers[[nextType, next]]) {
                        // dragged dirt is in the way. relevant cases are if i'm in their way or not.
                        let otherNext = other.plan[other.plan.length - 2]
                        if (otherNext + "" === this.p + "") {
                            console.info(this.idx, new Date(), "in the way of dragged path while not dragging - switching and performing a step")
                            let myTask = this.popTask()
                            let otherTask = other.popTask()
                            this.giveTask(otherTask) // don't need to modify this path (now), block path hasn;t changed 
                            this.doDrag()

                            if (myTask[1][myTask[1].length - 2] + "" === other.p + "") {
                                //console.log("simplifying path")
                                myTask[1].length -= 2
                            }
                            other.giveTask(myTask)
                        }
                        else {
                            // dragged block in our way, we are not in its way. seems sensible to wait (switching puts them in our situation again)
                            // may consider probibalistic switching 
                            console.info(this.idx, new Date(), "dragged block in our way, we are not in its way - idling")
                        }
                    }
                    else {
                        /*I think that without ordering the moved dirt to be mined
                         * (which should come with a corresponding build order next to it,
                         * and would cause other problems)
                         * this puts more dirt in the way of other ants, and its own path back,
                         * causing lots of ants to end up stuck in the middle of dirt from which its hard to get them out
                        console.info(this.idx,new Date(),"placed block in way - swapping")
                        move("dirt", next, this.p)
                        this.move(next)
                        this.plan.pop()
                        return*/
                        console.info(this.idx, new Date(), "blocked, plan abandoned ")
                        this.popTask()
                    }
                }
                else if (other = hasAnt(next)) {
                    if (!other.dragging) {
                        console.info(this.idx, new Date(), "ant in way - swapping tasks")
                        let myTask = this.popTask()
                        let otherTask = other.popTask()

                        let [myType, myPlan] = myTask
                        myPlan.pop() // my plan's next intended step is their current step

                        other.giveTask([myType, myPlan])

                        if (!otherTask || otherTask === "finished") return
                        if (otherTask[0] === "finished") {
                            otherTask = ["worker", [otherTask[1]]] // we'll need to finish it properly
                        }

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
                        console.info(this.idx, new Date(), "dragger in the way - idling")
                        return
                    }
                }
                else {
                    // we can't walk to where we want, but it's not because of dirt or ant. probably bc we pathed assuming dirt will be placed that has not yet arrived.
                    // sensible to abandon plan here; or wait.
                    if (!willWalk(next) || rand() < 0.1) {
                        console.info(this.idx, new Date(), "can't advance, abandoning")
                        this.popTask()
                    }
                    else {
                        console.info(this.idx, new Date(), "can't advance right now, waiting")
                    } // wait
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

orderKind = "dirtTunnel" // TODO: proper UI for this. currently set it manually in console to test ordering different things. 
function sel(p) {
    if (!targets[["worker", p]] && isSolid(p) && !(solidTypes.find(t => draggers[[t, p]])) && (orderKind == "dirtTunnel" || orderKind == "tunnel")) {
        orders["worker"][p] = true
    }
    if (!isSolid(p) && !targets[["dirt", p]] && (orderKind === "dirtTunnel")) {
        orders["dirt"][p] = true
    }
    if (!isSolid(p) && !targets[[orderKind, p]] && solidTypes.includes(orderKind)) {
        orders[orderKind][p] = true
    }
    // console.log(p)
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


function isSolid(p) {
    if (isDirt(p)) return true
    for (let t of solidTypes) {
        if (map[p]?.includes(t)) return true
    }
    return false
}

function isAir(p) {
    return (p[1] >= 0 && !map[p]?.includes("tunnel") && !map[p]?.includes("dirt")
        || map[p]?.includes("air"))
}

function getType(p) {
    // assert(isDirt(p)) <- would like to do this, but it fails sometimes and it probably not too bad if it happens

    if (isDirt(p)) return "dirt"
    for (let t of solidTypes) {
        if (map[p]?.includes(t)) return t
    }

    assert(false, "expected solid type")
}

function hasAnt(p) {
    return map[p]?.find(item => item instanceof Ant)
}

function canWalk(p) {
    return !isDirt(p) && !hasAnt(p) &&
        (map[p]?.includes("tunnel") || isSolid([p[0], p[1] - 1]) || isSolid([p[0] - 1, p[1] - 1]) || isSolid([p[0] + 1, p[1] - 1]))
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
        || (targets[["dirt", p]] && map[p]?.includes("tunnel")))
}

function willBeSolid(p) {
    if (isDirt(p)) return true
    for (let t of solidTypes) {
        if ((map[p]?.includes(t)) || targets[[t, p]] && t !== "dirt") return true
    }
    return false
}

function willWalk(p) {
    return ((!isSolid(p) &&
        (map[p]?.includes("tunnel") || willBeSolid([p[0], p[1] - 1]) || willBeSolid([p[0] - 1, p[1] - 1]) || willBeSolid([p[0] + 1, p[1] - 1]))
        || targets[["worker", p]] || solidTypes.find(t => draggers[[t, p]]) || orders["worker"][p])
    )
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

function swap(thing1, p1, thing2, p2) {
    take(thing1, p1)
    take(thing2, p2)
    r1 = put(thing1, p2)
    r2 = put(thing2, p1)
    return [r1, r2]
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
    for (let p of thingLists["water"]) {
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
    thingLists["water"] = newWater

    // Search for tasks available
    // tracking ants that have been encountered during the search might be able to speed things up
    // (particularly to avoid searching a large empty region multiple times)

    for (let ant of thingLists["ant"]) {
        debug = true
        if (debug) {
            var s = ant.plan + ""
            var d = ant.dragging
            var toMine = {}
            for (let k in orders["worker"]) {
                toMine[k] = "orders"
            }
            for (let m in targets) {
                let [a, b, c] = m.split(",")
                if (a == "worker") toMine[[b, c]] = "targets";
            }
            for (let m in draggers) {
                let [a, b, c] = m.split(",")
                if (a == "dirt" && !targets[["dirt", b, c]]) toMine[[b, c]] = "draggers";
            }
        }
        if (!ant.plan) {
            console.log("finding target")
            ant.findTarget("worker")
        }
        if (ant.plan) { // Execute plan
            ant.followPlan()
        }
        if (debug) {
            for (let p in toMine) {
                if (isDirt(p)) {
                    if (orders["worker"][p]) continue
                    if (targets[["worker", p]]) continue
                    if (draggers[["dirt", p]]) continue
                    console.error(s, d, ant, toMine[p])
                    throw Error // this can happen legitemately (order got removed) if a search failed
                    // perhaps if we fail a search we could keep an order on it?
                }
                //throw new Error(p+" was added by this ant")
            }
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


// Starting configuration 

take("dirt", [0, -1])

for (let x = 0; x < 5; x++) {
    //queen = new Ant([0, 0])
    new Ant([x, 0])

    take("dirt", [2 * x, -3])
    put("food", [2 * x, -3])
}
queen = thingLists["ant"][0]
queen.queen = false // TODO: don't make the queen an instance of Ant

