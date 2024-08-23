export class Pointer<T = any> extends Array {}

const UNKNOWN_POINTER_ERROR = 'Unrecognized pointer reference'
const WRITE_LOCK_ERROR =
    'Object is write locked. Likely writing to a pointer in a watch callback.'

// For validating referential stability during CRUD ops
const POINTERS = new WeakSet<Pointer>()

/*
 * MEMORY: WeakMap to store associations between pointers and values.
 * WeakMaps don't prevent their keys (pointers in this case) from being garbage
 * collected if there are no other references to them outside of the WeakMap.
 */
const MEMORY = new WeakMap()

/*
 * WATCHERS: WeakMap to store associations between pointers and sets of watcher functions.
 * The WATCHERS map won't keep lingering references to pointers that are no longer in use.
 * This helps prevent memory leaks associated with watcher functions being attached
 * to pointers that are no longer valid.
 */
const WATCHERS = new WeakMap<Pointer<any>, Set<() => void>>()

/*
 * LOCK: WeakMap to store associations between pointers and lock counts.
 * Useful for preventing infinite loops when updating pointers in a watch function.
 */
const LOCK = new WeakMap<Pointer, number>()

// SCOPE_POINTER: A pointer that is used to watch for changes to the global scope.
const GLOBAL_SCOPE = allocate(0)

/**
 * @function lock
 * @param pointers - The pointer to lock.
 */
export function lock(...pointers: Pointer<any>[]) {
    let i = pointers.length
    while (i--) {
        var pointer = pointers[i],
            lock = LOCK.get(pointer) || 0
        // @ts-ignore
        LOCK.set(pointer, lock + 1)
    }
}

/**
 * @function unlock
 * @param pointer - The pointer to unlock.
 */
export function unlock(...pointers: Pointer<any>[]) {
    let i = pointers.length
    while (i--) {
        var pointer = pointers[i],
            lock = LOCK.get(pointer)
        if (lock)
            LOCK.set(pointer, lock - 1)
        else
            LOCK.delete(pointer)
    }
}

/**
 * Notifies watchers of a given pointer that its value has changed.
 * @function notifyWatchers
 * @param pointer - The pointer whose watchers should be notified.
 * @returns {void}
 */
export function notifyWatchers<T>(pointer: Pointer<T>) {
    if (WATCHERS.has(pointer)) {
        const observersList = WATCHERS.get(pointer)
        if (observersList) {
            lock(pointer)
            observersList.forEach((cb: () => void) => cb())
            unlock(pointer)
        }
    }

    // Global scope watchers get notified of errythang
    if (pointer !== GLOBAL_SCOPE) {
        notifyWatchers(GLOBAL_SCOPE)
    }
}

/**
 * Allocates memory for a given value and associates it with a unique pointer.
 * @function allocate
 * @param value - The value to be associated with the allocated memory.
 * @returns {Object} The allocated pointer associated with the given value.
 */
export function allocate<T = any>(value: T): Pointer<T> {
    var pointer: Pointer<T> = []

    // Store the value in the MEMORY WeakMap, associating it with the pointer
    MEMORY.set(pointer, value)
    POINTERS.add(pointer)

    // Return the allocated pointer
    return pointer as Pointer<T>
}

/**
 * Deallocates memory associated with a given pointer.
 * @function deallocate
 * @param pointer - The pointer for the memory to deallocate.
 */
export function deallocate(pointer: Pointer<any>): void {
    // Remove the pointer and its associated value from the MEMORY WeakMap
    MEMORY.delete(pointer)
}

/**
 * Retrieves the value associated with a given pointer.
 * @function deref
 * @param pointer - The pointer for the value should be retrieved.
 * @returns The value associated with the specified pointer.
 */
export const deref = <T>(pointer: Pointer<T>): T => {
    if (!MEMORY.has(pointer)) throw new Error(UNKNOWN_POINTER_ERROR) // SLOW
    return MEMORY.get(pointer)
}

/**
 * Updates the value associated with a given pointer.
 * @function write
 * @param pointer - The pointer for the value should be updated.
 * @param value - The new value to be associated with the pointer.
 */
export function write<T>(pointer: Pointer<T>, val: T) {
    // USEFUL BUT SLOW
    if (!MEMORY.has(pointer)) throw new Error(UNKNOWN_POINTER_ERROR)

    // USEFUL BUT SLOW
    if (LOCK.has(pointer)) throw new Error(WRITE_LOCK_ERROR)

    MEMORY.set(pointer, val)
    notifyWatchers(pointer)
}

/**
 * Registers a watcher function for a given pointer. The watcher function is invoked
 * when the value associated with the pointer is changed using the `set` function.
 * @function watch
 * @param pointer - The pointer to watch for changes.
 * @param cb - The watcher function to be invoked when the pointer's value changes.
 * @returns A function that, when called, unregisters the watcher.
 * @note The deps of a watcher function are write-locked before the function is called. This is to prevent infinite loops.
 */
export function watch<T>(cb: () => void, ...pointers: Pointer<T>[]) {
    pointers = pointers.length === 0 ? [GLOBAL_SCOPE] : pointers

    let i = pointers.length
    while (i--) {

        var pointer = pointers[i]
        if (!POINTERS.has(pointer)) throw new Error('')
        if (!WATCHERS.has(pointer)) WATCHERS.set(pointer, new Set())

        var observersList = WATCHERS.get(pointer)
        if (observersList) observersList.add(cb)
    }

    // Return a function that, when called, removes the watcher from the set
    return () => {
        pointers.forEach((pointer) => {
            const observersList = WATCHERS.get(pointer)
            observersList?.delete(cb)
        })
    }
}

// I just like these better. Probably going to switch.
export const get = deref
export const set = write
