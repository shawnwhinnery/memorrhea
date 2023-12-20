export function debounce(
    func: (...args: any) => void,
    delay: number,
): () => void {
    let timeoutId: Timer

    return function () {
        clearTimeout(timeoutId as any)

        timeoutId = setTimeout(() => {
            func(...arguments)
        }, delay)
    }
}

export const nextId = (function* () {
    var index = 0
    while (true) {
        yield index
    }
})()
