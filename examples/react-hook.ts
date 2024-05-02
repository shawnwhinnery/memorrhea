import { Pointer, allocate, deref, watch, write } from '../memory'

// An example react hook that syncs a pointer with a React state.
// I'll probably add this to a separate package later.
export function usePointer<T>(pointer: Pointer<T>) {
    const [reactState, setReactState] = useState<T>(deref(pointer))

    // Swap the reactSetState with a function that writes directly to the pointer.
    // note: A unidirectional data flow is enforced by the use of the pointer.
    const setState = useCallback(
        (value: T) => {
            write(pointer, value)
        },
        [pointer]
    )

    // Sync changes made to the pointer with the React state
    // note: watch returns a function that, when called, unregisters the watcher
    useEffect(() => {
        return watch(() => {
            setReactState(deref(pointer))
        }, pointer)
    }, [pointer])

    return [reactState, setState]
}

// More memory efficient than usePointer, simply observes pointers and triggers a re-render when they change.
// The react component will need to use deref to access the pointer's value.
export function useWatchPointers(...pointers: Pointer[]) {
    // Use a number to trigger a re-render when the pointer changes
    const [x, setX] = useState<T>(1)

    // Sync changes made to the pointer with the React state
    // note: watch returns a function that, when called, unregisters the watcher
    useEffect(() => {
        return watch(() => {
            setX(x + 1)
        }, ...pointers)
    }, [pointers])

    return x
}
