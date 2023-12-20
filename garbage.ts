import { allocate, deallocate, deref, watch, write } from "./memory";

function createGarbage() {
    var pointer = allocate(1),
        pointer2 = allocate(2);
        console.log("pointer", pointer);
        console.log("pointer2", pointer2);
}

createGarbage();

setInterval(() => {
console.log(".");
}, 2000)