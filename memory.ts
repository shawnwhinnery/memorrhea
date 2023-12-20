import { debounce } from './util'

/**
 * Represents a pointer with an associated memory address.
 */
export type Address = string | number
export type Pointer<T = any> = [Address]

export interface Options {
    /**
     * Set to false to disable indexing addresses on their primitive address.
     * NOTE: Setting this to false will disable the find function.
     * @default true
     */
    addressMap?: boolean
}

export function Memory(options?: Options) {
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
        // ADDRESSES: Map to store associations between pointer addresses and weak references to pointers.
        // I may remove this. It isn't really used and could be implemented optionally and I could omit the garbage collection.
        ADDRESSES = new Map<Pointer[0], WeakRef<Pointer<any>>>(),
        /*
         * ID: Generator function to create unique IDs for each pointer.
         * The address generator will be used to generate unique IDs for each pointer.
         * The generator is a generator function that returns a generator object.
         * The generator object is an iterator that will yield a new ID each time it is called.
         */
        ID = (function* () {
            var index = 0
            while (true) {
                if (ADDRESSES.has(index))
                    while (ADDRESSES.has(index)) {
                        index++
                    }
                yield index
            }
        })(),
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
            observersList.forEach((cb: VoidFunction) => cb())
        }
    }

    /**
     * Cleans up dead weak references in the ADDRESSES map.
     */
    var gcTimer: Timer
    function garbageCollect() {
        clearTimeout(gcTimer)
        gcTimer = setTimeout(() => {
            var iterator = ADDRESSES.entries()
            while (true) {
                let result = iterator.next()
                if (result.done) break

                let [id, weakRef] = result.value

                if (weakRef.deref() === undefined) {
                    // If the weak reference is dead, remove it from the map
                    ADDRESSES.delete(id)
                }
            }
        }, 100)
    }

    /**
     * Allocates memory for a given value and associates it with a unique pointer.
     * @function allocate
     * @param value - The value to be associated with the allocated memory.
     * @param address - Optional parameter for specifying a custom address for the pointer.
     * @returns {Object} The allocated pointer associated with the given value.
     */
    function allocate<T = any>(value: T, address?: Address) {
        // If an address is specified, check if it is already in use
        if (address !== undefined && ADDRESSES.has(address)) {
            throw new Error(
                `Unable to allocate memory at ${address}. Address ${address} in use.`,
            )
        }

        // Create a new pointer with a unique address (or use the specified address if provided)
        var nextAddress = address || ID.next().value
        // if (address === undefined) {
        //     nextAddress = ID.next().value as number
        //     while (ADDRESSES.has(nextAddress)) {
        //         nextAddress = ID.next().value as number
        //     }
        // }

        if (nextAddress === undefined) {
            throw new Error('Unable to allocate memory. Address is undefined')
        }

        var pointer: Pointer<T> = [nextAddress]

        // Store the value in the MEMORY WeakMap, associating it with the pointer
        MEMORY.set(pointer, value)

        // Store a weak reference to the pointer in the ADDRESSES Map, associating it with its address
        if (options?.addressMap !== false) {
            ADDRESSES.set(pointer[0], new WeakRef(pointer))
        }

        // Return the allocated pointer
        return pointer
    }

    /**
     * Deallocates memory associated with a given pointer.
     * @function deallocate
     * @param pointer - The pointer whose associated memory should be deallocated.
     */
    function deallocate(pointer: Pointer<any>): void {
        // Remove the pointer and its associated value from the MEMORY WeakMap
        MEMORY.delete(pointer)

        // Remove the weak reference associated with the pointer's address from the ADDRESSES Map
        if (options?.addressMap !== false) {
            ADDRESSES.delete(pointer[0])
        }
    }

    /**
     * Retrieves the value associated with a given pointer.
     * @function deref
     * @param pointer - The pointer whose associated value should be retrieved.
     * @returns The value associated with the specified pointer.
     */
    const deref = <T>(pointer: Pointer<T>): T | undefined => {
        return MEMORY.has(pointer)
            ? // Retrieve the value associated with the pointer from the MEMORY WeakMap
              MEMORY.get(pointer)
            : // Attempt to look it up in the ADDRESSES Map
            options?.addressMap !== false
            ? lookup(pointer[0])
            // If the addressMap option is disabled, return undefined
            : undefined
    }

    /**
     * Updates the value associated with a given pointer.
     * @function write
     * @param pointer - The pointer whose associated value should be updated.
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

    // function watch<T>(pointer: Pointer<T>, cb: VoidFunction) {
    function watch<T>(cb: VoidFunction, ...pointers: Pointer<T>[]) {
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

    /**
     * Retrieves a Pointer by its ID from ADDRESSES.
     * @function lookup
     * @param address - The address of the pointer to retrieve.
     * @returns The pointer associated with the given ID, or undefined if not found.
     */
    function lookup(address: Address): Pointer<any> | undefined {
        if (options?.addressMap === false) {
            throw new Error(
                'Unable to lookup pointer by address when opotions.AddressMap is set to false.',
            )
        }
        return ADDRESSES.get(address)?.deref()
    }

    // If the addressMap option is enabled, watch the global scope for
    // changes and cleans up dead weak references on the ADDRESSES Map.
    if (options?.addressMap !== false) {
        watch(() => {
            garbageCollect()
        }, SCOPE_POINTER)
    }

    return {
        allocate,
        deallocate,
        deref,
        write,
        watch,
        lookup,
    }
}

// The global scope for the memory module.
// Unless you need to sync a remote instance of the memory module, where address collisions are possible, just use this scope.
const GLOBAL_SCOPE = Memory()

// Export the memory module's public API
export const allocate = GLOBAL_SCOPE.allocate
export const deallocate = GLOBAL_SCOPE.deallocate
export const deref = GLOBAL_SCOPE.deref
export const write = GLOBAL_SCOPE.write
export const watch = GLOBAL_SCOPE.watch
export const lookup = GLOBAL_SCOPE.lookup
