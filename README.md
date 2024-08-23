# memorrhea

Radically simple state managemnet. Get shit done.

## setup
To install dependencies:

```bash
bun install
```

To run:

```bash
bun run memory.ts
```
## Intro
State management solutions in JavaScript are excessively complicated. Much of this complexity exists to create referential stability throughout your application creating a single source of truth. In practice referential stability can not be guaranteed by any framework because the behavior is a core feature of the runtime and is a side effect of code style and not the logic described by the code.

I'm sick of writing boilerplate code in 4 files just to add something to state so I wrote Memorrhea. 

- Fast
- Zero dependencies
- Simple api
    - allocate
    - get
    - set
    - watch
- No boiler plate
- Memory stable / safe
    - Does not prevent garbage collection
    - Does not copy references internally
- Type safe
- Framework / environment agnostic
    - Works everywhere JavaScript works
    - Event system allows state to be "reactive" allowing state to be shared between business logic and view layer.

```
import { allocate, get, set } from "memorrhea"

// allocate state
const name = allocate("Foo")

// read some state
get(name) // "Foo"

// mutate some state
set(name, "Bar")
```

You just mastered the core API.