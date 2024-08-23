import { allocate, deref, write } from "./memory"

type result = [string, number, number]
function Bench(name: string, fn: () => void, count: number = 10000000): result {
    const start = Date.now()
    let i = count * 1
    while (i--) {
        fn()
    }
    const deltaT = Date.now() - start
    return [name, deltaT, count]
}


function Compare(title:string, res: (result)[]) {
    // sort lowest time first
    console.log(title)
    console.log(res.sort((a, b) => a[1] - b[1]))
}

Compare("declare + assign vs allocate",[
    Bench("declare + assign", () => {
        var a = 1
    }),
    Bench("allocate", () => {
        var a = allocate(1)
    })
])

const A = 1
const B = allocate(1)
Compare("access vs deref",[
    Bench("access", () => {
        (A)
    }),
    Bench("deref", () => {
        (deref(B))
    })
])

var C = 1
var D = allocate(1)
Compare("assign vs write",[
    Bench("assign", () => {
        C = 2
    }),
    Bench("write", () => {
        write(D, 2)
    })
])

var x = 1
let y = 1
const z = 1
Compare("var, let const",[
    Bench("let", () => {
        (y)
    }),
    Bench("const", () => {
        (z)
    }),
    Bench("var", () => {
        (x)
    }),
])