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