import { expect, it, spyOn, test } from 'bun:test'
import { allocate, deallocate, deref, watch, write } from './memory'

test('get', () => {
    var pointer = allocate(1)
    expect(deref<number>(pointer)).toEqual(1)
})

test('set', () => {
    var pointer = allocate(1)
    write(pointer, 2)
    expect(deref<number>(pointer)).toEqual(2)
})

test('deallocate', () => {
    var pointer = allocate(1)
    deallocate(pointer)
    try {
        deref(pointer)
    } catch (e) {
        expect(e instanceof Error).toEqual(true)
    }
})

var cb = {
        name: 'watch callback',
        cb() {},
    },
    spy = spyOn(cb, 'cb'),
    global_cb = {
        name: 'watch callback',
        cb() {},
    },
    global_spy = spyOn(global_cb, 'cb')

test('watch', async () => {
    var pointer = allocate(1),
        pointer2 = allocate(2)

    it('should call the callback when the value changes', () => {
        var cleanup = watch(cb.cb, pointer, pointer2)
        write(pointer, 2)
        expect(spy).toHaveBeenCalledTimes(1)
        write(pointer2, 3)
        expect(spy).toHaveBeenCalledTimes(2)

        // make sure cleanup works
        cleanup()
        write(pointer2, 4)
        expect(spy).toHaveBeenCalledTimes(2)
    })

    it('should call the global callback when the value changes', () => {
        var cleanup = watch(global_cb.cb)
        write(pointer, 10)
        expect(global_spy).toHaveBeenCalledTimes(1)
        write(pointer2, 30)
        expect(global_spy).toHaveBeenCalledTimes(2)

        // make sure cleanup works
        cleanup()
        write(pointer2, 40)
        expect(global_spy).toHaveBeenCalledTimes(2)
    })
})

test('referential stability', async () => {
    var original = { a: 1, b: 2 },
        pointer = allocate(original)

    expect(original === deref(pointer)).toEqual(true)
    ;((p, o) => {
        expect(o === deref(p)).toEqual(true)
    })(pointer, original)
})
