orderMode = "Digging and building"
orderType = "dirt"

// click to order build or dig
// hold shift to set order type to non-dirt, release to set it back to dirt
// right click to cancel orders
// z, x, c switch between digging,building,both

function sel(p, button) {
    if (shiftHeld && isSolid(p)) {
        orderType = getSolidTypeStr(p)
    }
    if (button == 0) {
        (orderMode.toLowerCase().includes("build") && setOrder(p, orderType)) || (orderMode.toLowerCase().includes("dig") && isSolid(p) && getSolidTypeStr(p) === orderType && setOrder(p, "worker"))
    }
    else if (button == 2) {
        clearOrder(p)
    }
    redraw()
}

shiftHeld = false
window.addEventListener("keydown", (event) => {
    switch (event.key) {
        case "Shift":
            shiftHeld = true
            break
        case "z":
            orderMode = "Digging and building"
            break
        case "x":
            orderMode = "Digging"
            break
        case "c":
            orderMode = "Building"
            break
    }
    updateHud()
})

window.addEventListener("keyup", (event) => {
    if (event.key == "Shift") {
        shiftHeld = false
        orderType = "dirt"
    }
})

function updateHud() {
    document.getElementById("order-mode").textContent = orderMode + " " + orderType
}

function gameOver(reason) {
    clearInterval(tickInterval)
    redraw()
    alert(`${reason}, game over!\nRefresh the page to retry.`)
}
