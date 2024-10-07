orderMode = "Digging and building"
orderType = "dirt"

// click to order build or dig
// hold shift to set order type to non-dirt, release to set it back to dirt
// right click to cancel orders
// z, x, c switch between digging,building,both

function sel(p, button) {
    orderMode = document.querySelector('input[name="action"]:checked').value
    /*if (shiftHeld && orderMode=="flexible") { can't directly build/place anything except dirt any more
        orderType = getSolidTypeStr(p)
    }*/
    if ((button == 2) || (button == 0 && orderMode == "cancel")) {
        clearOrder(p)
        clearNursery(p)
    }
    else if (button == 0) {
        if (orderMode == "dig") {
            if (isSolid(p) && (getSolidTypeStr(p) === "dirt" || getSolidTypeStr(p) === "food")) { setOrder(p, "worker") }
        }
        else if (orderMode == "dirt") {
            setOrder(p, "dirt")
        }
        else if (orderMode == "grub") {
            designateNursery(p)
        }
        else if (orderMode == "queen") {
            setQueenHome(p)
        }
        if (orderMode == "flexible") {
            setOrder(p, orderType) || (isSolid(p) && (getSolidTypeStr(p) === "dirt" || getSolidTypeStr(p) === "food") && setOrder(p, "worker"))
        }
    }
    redraw()
}

shiftHeld = false
/*
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
})*/

window.addEventListener("keyup", (event) => {
    if (event.key == "Shift") {
        shiftHeld = false
        orderType = "dirt"
    }
})

OrderText = {
    "dirt": "Build dirt",
    "dig": "Dig",
    "grub": "Designate grub Nursery",
    "queen": "Set Queen's home",
    "flexible":"Dig and build dirt"
    /*"food":true,*/
}

function updateHud() {
    let orderMode = document.querySelector('input[name="action"]:checked').value
    document.getElementById("order-mode").textContent = OrderText[orderMode]
    // orderMode + " " + orderType
}
updateHud()

function gameOver(reason) {
    clearInterval(tickInterval)
    redraw()
    alert(`${reason}, game over!\nRefresh the page to retry.`)
}
