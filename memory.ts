export type Pointer<T = any> = []
export interface Options {}

/**
 * Creates a new memory scope with the specified options.
 * @function scope
 */
export function scope(options?: Options) {
    const /*
         * MEMORY: WeakMap to store associations between pointers and values.
         * WeakMaps don't prevent their keys (pointers in this case) from being garbage
         * collected if there are no other references to them outside of the WeakMap.
         */
        MEMORY = new WeakMap(),
        /*
         * WATCHERS: WeakMap to store associations between pointers and sets of watcher functions.
         * The WATCHERS map won't keep lingering references to pointers that are no longer in use.
         * This helps prevent memory leaks associated with watcher functions being attached
         * to pointers that are no longer valid.
         */
        WATCHERS = new WeakMap(),
        // SCOPE_POINTER: A pointer that is used to watch for changes to the global scope.
        SCOPE_POINTER = allocate(0)

    /**
     * Notifies watchers of a given pointer that its value has changed.
     * @function notifyWatchers
     * @param pointer - The pointer whose watchers should be notified.
     * @returns {void}
     */
    function notifyWatchers<T>(pointer: Pointer<T>) {
        if (WATCHERS.has(pointer)) {
            const observersList = WATCHERS.get(pointer)
            observersList.forEach((cb: () => void) => cb())
        }
    }

    /**
     * Allocates memory for a given value and associates it with a unique pointer.
     * @function allocate
     * @param value - The value to be associated with the allocated memory.
     * @returns {Object} The allocated pointer associated with the given value.
     */
    function allocate<T = any>(value: T) {
        var pointer: Pointer<T> = []

        // Store the value in the MEMORY WeakMap, associating it with the pointer
        MEMORY.set(pointer, value)

        // Return the allocated pointer
        return pointer
    }

    /**
     * Deallocates memory associated with a given pointer.
     * @function deallocate
     * @param pointer - The pointer for the memory to deallocate.
     */
    function deallocate(pointer: Pointer<any>): void {
        // Remove the pointer and its associated value from the MEMORY WeakMap
        MEMORY.delete(pointer)
    }

    /**
     * Retrieves the value associated with a given pointer.
     * @function deref
     * @param pointer - The pointer for the value should be retrieved.
     * @returns The value associated with the specified pointer.
     */
    const deref = <T>(pointer: Pointer<T>): T => {
        if (!MEMORY.has(pointer)) throw new Error('Invalid pointer')
        return MEMORY.get(pointer)
    }

    /**
     * Updates the value associated with a given pointer.
     * @function write
     * @param pointer - The pointer for the value should be updated.
     * @param value - The new value to be associated with the pointer.
     */
    // should be write use set in the quark
    function write<T>(pointer: Pointer<T>, val: T) {
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
     */
    function watch<T>(cb: Function, ...pointers: Pointer<T>[]) {
        pointers = pointers.length === 0 ? [SCOPE_POINTER] : pointers

        pointers.forEach((pointer: Pointer<T>) => {
            // If no watchers are registered for the given pointer, create a new set of watchers
            if (!WATCHERS.has(pointer)) WATCHERS.set(pointer, new Set<T>())

            // Retrieve the set of watchers for the given pointer
            const observersList = WATCHERS.get(pointer)

            // Add the provided watcher function to the set of watchers
            if (!observersList.has(cb)) {
                observersList.add(cb)
            }
        })

        // Return a function that, when called, removes the watcher from the set
        return () => {
            pointers.forEach((pointer) => {
                const observersList = WATCHERS.get(pointer)
                observersList.delete(cb)
            })
        }
    }

    return {
        allocate,
        deallocate,
        deref,
        write,
        watch,
    }
}

/**
 * Although you can create multiple memory scopes, it is recommended to use a single global scope.
 */
const GLOBAL_SCOPE = scope()

export const allocate = GLOBAL_SCOPE.allocate
export const deallocate = GLOBAL_SCOPE.deallocate
export const deref = GLOBAL_SCOPE.deref
export const write = GLOBAL_SCOPE.write
export const watch = GLOBAL_SCOPE.watch

export default {
    allocate,
    deallocate,
    deref,
    write,
    watch,
}
