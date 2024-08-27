import { allocate, lock, Pointer, unlock, watch, write, deref } from '../memory'

/**
 * @function view
 * @description A view allocates a dependant variable that is recomputed from multiple dependant variables.
 * @returns a pointer for the data view
 * @example
 * 
 * import { view } from "memorrhea"
 * import { auth } from "./state.ts"
 * 
 * const loginFormDisabled = view((email, password, loading) => {
 *  return !email || !password || loading
 * }, auth.email, auth.password, auth.loading)
 * 
 * 
 * export const LoginForm () {
 *  const [disabled] = usePointer(loginFormDisabled)
 *  return <form>
 *       <input />
 *       <input />
 *       <button type="submit" disabled={disabled}
 *  <form>
 * }
 * 
 */
export function view<T, U extends Pointer<any>[]>(
    reducer: (
        ...args: { [K in keyof U]: U[K] extends Pointer<infer U> ? U : never }
    ) => T,
    ...deps: U
) {
    type View = {
        [K in keyof U]: U[K] extends Pointer<infer U> ? U : never
    }

    // The reducer result will be written here
    const pointer = allocate<T>(
        reducer(
            ...(deps.map(deref) as View)
        )
    )

    // Immediately lock pointer
    lock(pointer)

    // 
    watch(() => {
        // reduce
        lock(...deps)
        const nextVal = reducer(
            ...(deps.map(deref) as View)
        )
        unlock(...deps)

        // write the new reduced value to state
        unlock(pointer)
        write(pointer, nextVal)
        lock(pointer)
    }, ...deps)

    return pointer
}

