import { Pointer, deref, watch, write } from '../memory'

/**
 * This class mimmic's the output of a React useState hook.
 * It is used as a stable output for the usePointer hook that syncs a pointer with a React state.
 */
class PassThrough<T = any> extends Array {
    pointer: Pointer
    setter: (value: any) => void

    get 0(): T {
        return deref(this.pointer)
    }

    get 1(): typeof this.setter {
        return this.setter
    }

    constructor(pointer: Pointer) {
        super()
        this.pointer = pointer
        this.setter = (value: any) => write(pointer, value)
    }
}

// An example react hook that syncs a pointer with a React state.
// I'll probably add this to a separate package later.
export function usePointer<T>(pointer: Pointer<T>) {

    // This is incremented every time the pointer is changed.
    // Used to trigger a re-render when the value pointed to by the pointer changes
    const [v, setV] = useState(1);
    
    // When the pointer changes we need to hook into memmorhea's watch function
    useEffect(() => {
        return watch(() => {
            setV(v + 1)
        }, pointer)
    }, pointer)

    // Create stable output
    const prox = useMemo<PassThrough<T>>(() => {
        return new PassThrough(pointer)
    }, [pointer, v, setV])

    // Return the stable output that mimics the output of a React useState hook
    return prox as readonly [T, (value: T) => void]
}