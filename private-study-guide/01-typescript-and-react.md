# 1. TypeScript And React For A Python Programmer

Read this before the source walkthrough. Examples marked **teaching example**
illustrate a concept; they are not necessarily functions in Megalifts.

## 1.1 The Execution Model Comes First

Megalifts is not a Python service translated into another language. Most of
its application logic executes on the user's device inside a browser engine.
There is no required API server, account service, or remote workout database.

There are four different layers to keep separate:

1. **TypeScript source:** `.ts` and `.tsx` files you edit.
2. **Build tools:** Node.js runs tools such as Vite and TypeScript on your computer or CI runner.
3. **Browser runtime:** the generated JavaScript runs with browser APIs such as `localStorage`, `FileReader`, and the DOM.
4. **Android wrapper:** Capacitor loads the built web application in an Android WebView and bridges selected native capabilities.

Node.js is a JavaScript runtime, roughly analogous to the Python interpreter
as an execution environment. That does not make Node the production backend
here. Vite's development server is development tooling, not a server the
Android app must contact to log a workout.

The DOM is the browser's live document tree. React computes what that tree
should look like from application state and updates it. JSX describes UI;
it does not create an Android-native widget hierarchy.

## 1.2 TypeScript Is JavaScript Plus Static Checking

Python supports annotations such as `weight: float`, but ordinary Python does
not enforce them automatically. TypeScript similarly checks source before
execution. Most of its type syntax disappears from generated JavaScript.

```python
# Teaching comparison
def add_weight(weight: float, increment: float) -> float:
    return weight + increment
```

```ts
// Teaching example
function addWeight(weight: number, increment: number): number {
  return weight + increment;
}
```

Read the second signature as: two numeric parameters, numeric return value.
Unlike Python's separate `int` and `float` concepts, ordinary JavaScript
`number` uses floating-point arithmetic. Integers beyond the safe integer
range are not all exactly representable. This matters when imported counts
control allocation; `Number.isSafeInteger` is stronger than merely checking
that a value is positive.

TypeScript does not make network data, imported JSON, or old local storage
valid. An assertion such as `value as Exercise` asks the compiler to trust
you; it does not inspect the object. Runtime validators in this project exist
because the type system cannot protect those input boundaries by itself.

This repository's [tsconfig](../tsconfig.json) does **not** enable the complete
`strict` mode. Do not describe it as a strictly configured TypeScript codebase.
Types still help, but a successful typecheck is not proof that every null or
undefined case has been ruled out.

## 1.3 Syntax Translation Table

| Python concept | Common TypeScript/JavaScript form | Important difference |
| --- | --- | --- |
| `True`, `False`, `None` | `true`, `false`, `null` | JavaScript also has `undefined` |
| `and`, `or`, `not` | `&&`, `\|\|`, `!` | `??` is a separate nullish fallback |
| `def f(x):` | `function f(x) {}` or `const f = (x) => ...` | Arrow functions have different `this` rules |
| `list[T]` | `T[]` or `Array<T>` | Arrays can contain holes |
| `dict[str, T]` | `Record<string, T>` | Plain objects are not Python dictionaries in every detail |
| `len(items)` | `items.length` | Length is a property |
| `isinstance(x, str)` | `typeof x === 'string'` | `typeof null` is `'object'` |
| `[f(x) for x in xs]` | `xs.map(x => f(x))` | `map` eagerly returns an array |
| `[x for x in xs if p(x)]` | `xs.filter(x => p(x))` | Predicate return truthiness matters |
| `next(..., None)` | `xs.find(predicate)` | Missing match is `undefined` |
| `{**old, 'name': new}` | `{ ...old, name: nextName }` | Both are shallow copies |
| `raise Error(...)` | `throw new Error(...)` | Catch variables may be any thrown value |
| `try / except / finally` | `try / catch / finally` | Braces delimit blocks |
| f-string | `` `Week ${week}` `` | Backticks, not ordinary quotes |

Semicolons are commonly written but JavaScript can insert many automatically.
Indentation communicates structure; braces actually delimit blocks.

### `const` does not mean immutable

```ts
const logs = [];
logs.push({ weight: 100, reps: 5, completed: true });
// Reassigning logs = [] would be forbidden, but mutating this array is allowed.
```

For React state, however, prefer creating a replacement array/object rather
than mutating the existing one. That is a React data-flow discipline, not a
guarantee provided by the `const` keyword.

### Equality and truthiness

Use `===` for ordinary equality checks; it avoids the coercions of `==`.
Object equality is reference identity, not recursive value comparison:

```ts
({ weight: 100 }) === ({ weight: 100 }); // false
```

Python dictionaries with equal contents compare equal. JavaScript objects do
not behave that way. Tests use deep equality when comparing nested content.

Empty arrays and empty objects are truthy in JavaScript. Python's empty lists
and dictionaries are falsey. Consequently, `if (logs)` does not mean there is
at least one log. Look for `logs.length > 0` when that is the actual question.

## 1.4 Read The Project's Types Like Data Contracts

Actual excerpt from [types.ts](../src/types.ts):

```ts
export interface SetLog {
  weight: number;
  reps: number;
  completed: boolean;
}
```

`export` makes this name available to other modules. An interface describes
an object's expected shape. It does not construct an object or create a
runtime class. It is closer to a `TypedDict` or a structural protocol than
to a Python dataclass with a generated constructor.

```ts
const loggedSet: SetLog = {
  weight: 100,
  reps: 5,
  completed: true,
};
```

The project's `Exercise` includes these declarations:

```ts
logs: Array<SetLog | undefined>;
lastLogs?: Array<SetLog | undefined>;
```

Decode each piece:

- `Array<T>` means an array of values of type `T`.
- `SetLog | undefined` is a union: either a log or an absent value.
- `lastLogs?` means the property itself is optional.
- The array can preserve set indexes even when some sets have no saved log.

A missing third log does not necessarily mean the fourth log should shift
into its position. Set indexes are part of the meaning of the data.

Optional properties, an empty array, and an array containing absent entries
are different situations. JSON introduces another distinction: an undefined
array entry serializes as `null`, while an undefined object property is
normally omitted. The persistence code deliberately handles sparse logs
rather than assuming the JSON representation preserves JavaScript exactly.

### Literal unions constrain categories

```ts
unit: 'lbs' | 'kg';
```

This allows only two string values in checked code. The Python typing
analogue is `Literal['lbs', 'kg']`. It is not an enum class you instantiate.

### Indexed objects and generics

```ts
exerciseSetCounts?: Record<string, number>;
```

This represents a mapping from exercise name to a plan-specific set count.
The name, not the exercise ID, is the key in this part of the schema. That
choice explains why exercise renaming has to update saved plans too.

The App's generic state adapter uses syntax of this form:

```ts
const updateStateField = <K extends keyof WorkoutState>(
  key: K,
  action: React.SetStateAction<WorkoutState[K]>
) => { /* implementation in App.tsx */ };
```

`keyof WorkoutState` is the union of the state's property names. `K` captures
one selected name. `WorkoutState[K]` means the type of the value at that name.
This links the key and the proposed update: a settings update should not be
accepted as an exercises array. Think of it as a more precise version of a
generic Python function whose key determines the expected value type.

`React.SetStateAction<T>` allows either a replacement `T` or a function that
receives the previous `T` and returns the next `T`.

## 1.5 Optional Access And Fallbacks

```ts
const weight = exercise.recommended?.weight ?? 0;
```

The `?.` stops property access if `recommended` is nullish. `??` uses its
right-hand value only for `null` or `undefined`.

Do not replace `??` casually with `||`:

```ts
0 ?? 100; // 0
0 || 100; // 100
```

A zero input can be meaningful. Falling back because it is falsey can be a
different product decision than falling back because no value exists.

In [main.tsx](../src/main.tsx), `document.getElementById('root')!` has a
different exclamation mark: a TypeScript non-null assertion. It says the
programmer expects the root element to exist. It does not create it or
perform a runtime check. The HTML file must actually contain that element.

## 1.6 Objects, Array Transformations, And Immutability

Teaching example resembling the project's update style:

```ts
const nextExercises = exercises.map(exercise =>
  exercise.id === targetId
    ? { ...exercise, name: nextName }
    : exercise
);
```

Equivalent Python idea:

```python
next_exercises = [
    {**exercise, 'name': next_name}
    if exercise['id'] == target_id else exercise
    for exercise in exercises
]
```

The outer array is new. The changed exercise object is new. Unchanged
exercise objects can be reused. This is not a recursive deep copy. If you
also need to change nested logs, you must replace the relevant nested array
and changed log objects too.

Why not deep-copy everything? Repeated deep copies add cost and hide the
actual boundary of a change. Why not mutate everything? Shared references
make bugs harder to isolate and interfere with React's identity-based
change reasoning. Copy the path that changes.

### Pure helpers versus orchestration

A helper such as `advancePlanProgress(plan, includeRestDays)` computes and
returns data. It need not access storage or render HTML. A handler in App
uses helper results to update state. A storage helper writes the result.

Separating those responsibilities is useful for the same reason pure
Python functions are easy to unit-test: inputs and outputs are explicit.
Not every function in this repo is pure; file reads, storage, navigation,
and rendering lifecycle are deliberate side-effect boundaries.

## 1.7 Async JavaScript Without Mysticism

A Promise represents an eventual result or failure. An `async` function
returns a Promise; `await` pauses that function's continuation, not the
entire operating system or browser.

```ts
// Teaching example
async function readBackup(file: File): Promise<string> {
  return await file.text();
}
```

The real project uses an injectable reader around FileReader. Read its
actual implementation in the next chapter; do not assume this teaching
example is the app's import path.

JavaScript callbacks can capture variables from the render or operation
that created them. These closures are not automatically updated when a
later render has newer state. Async listeners, file reads and cleanup
need care for this reason. A Promise is not proof that work runs on a
background thread: JSON parsing and normal array processing can still
block the main thread.

## 1.8 React: UI Is A Function Of State

Teaching example:

```tsx
function WeightLabel({ weight }: { weight: number }) {
  return <span>{weight} lbs</span>;
}
```

The function receives props: read-only inputs from its parent. JSX looks
like HTML but is JavaScript syntax transformed by tooling. `{weight}`
switches into an expression. A capitalized `<WeightLabel />` invokes a
component; a lowercase `<span>` describes a built-in element.

Do not think of this component as printing HTML once. React may call it
again with new props. A render describes a UI snapshot. React then commits
the needed changes to the DOM; a rerender does not mean the whole page is
reloaded or every DOM element recreated.

Common JSX spellings in this repo:

- `className`, not HTML's `class`.
- `onClick={handler}`, passing a function rather than calling it immediately.
- `onClick={() => handler(id)}`, creating a callback with an argument.
- `condition ? <A /> : <B />`, choosing a rendered branch.
- `items.map(item => <Card key={item.id} />)`, generating repeated elements.
- `<>...</>`, a fragment grouping children without an extra DOM wrapper.

Keys identify siblings during reconciliation. They do not render visible
labels. Duplicate exercise references can therefore cause both duplicate
keys and shared-log bugs; unique keys alone would not fix shared data.

## 1.9 State Is A Snapshot, Not A Mutable Local Variable

```tsx
// Teaching example
const [count, setCount] = useState(0);
```

This destructures the hook's result into the current state value and a
setter. Calling `setCount` requests an update; it does not rewrite the
`count` variable inside the already-running handler.

```tsx
setCount(count + 1);
setCount(count + 1);
```

Both use the same captured `count`. Compare:

```tsx
setCount(previous => previous + 1);
setCount(previous => previous + 1);
```

The updater functions are queued and applied in order, so the latter
expresses two increments. React batches many updates, avoiding a separate
render for every setter call in a handler. The project's functional
updates are especially important when several handlers can change plans,
logs or drafts.

Do not put storage writes, analytics, or native calls inside an updater
just because it receives current state. Updaters should compute the next
state without external side effects; development checks can invoke them
more than once.

The app has two different state levels: component-local state for a
temporary UI interaction, and root workout state for data other screens
need. A local input value disappears when its component is unmounted
unless the application also records it in durable/root state. That is
the reason unfinished workout drafts have their own explicit model.

## 1.10 Controlled Inputs And Numeric Conversion

Exercise detail inputs use the React pattern:

```tsx
// Simplified from the real input pattern
<input
  type="number"
  value={currentWeight}
  onChange={event => handleWeightChange(i, Number(event.target.value))}
/>
```

The DOM reports input text. `Number(...)` converts it before updating the
numeric model. `value` makes React state authoritative: it is a controlled
input. If a later render supplies an old value, the input visibly reverts.
That symptom is a state-flow problem, not necessarily a broken keyboard.

An empty string converts to zero with `Number('')`. Runtime numeric input
behavior deserves tests; TypeScript's `number` annotation cannot decide
the desired UX for an empty field or reject all non-finite values alone.

## 1.11 Effects, Refs, And Cleanup

`useEffect` synchronizes the committed UI state with something outside
React, such as localStorage or a native event listener. An effect is not
a general substitute for computing derived values during rendering.

```tsx
// Teaching example, not the complete guarded persistence implementation
useEffect(() => {
  localStorage.setItem('example', JSON.stringify(value));
}, [value]);
```

The dependency list tells React when the effect needs resynchronization.
With changed dependencies, React cleans up the previous effect and runs
the new setup. An empty list does not mean a universal guarantee that
code executes exactly once under every development/remount scenario.

The real app adds recovery and skip-save guards. Do not copy the teaching
snippet over it: unconditional saving can destroy unreadable originals.

A ref holds a mutable value across renders without causing a rerender
when `.current` changes. The app uses refs for storage handles, initial
load results, operation/lifecycle coordination and native listener work.
Use state for values that should change the visible UI; refs are not a
hidden alternative rendering system.

`StrictMode` in main enables extra development checks, including extra
render/effect work that helps expose impure logic or missing cleanup.
It is not a production feature that intentionally logs every workout
twice. Native listeners need lifecycle cleanup so a remount does not
leave multiple active back handlers.

## 1.12 Practice And Answers

1. Explain why an imported object's TypeScript annotation is insufficient.
2. Predict `[] ? 'yes' : 'no'`, `0 ?? 5`, and `0 || 5`.
3. Explain what `{ ...exercise, logs: [] }` copies and what it clears.
4. Explain why `setCount(count + 1)` twice differs from two updater calls.
5. Explain why a draft can survive navigation but still be lost on process death.
6. In the actual source, find a union, optional property, generic and functional updater.

Answers:

1. Types are checked at development/build time and erased; external values need runtime validation.
2. `'yes'`, `0`, and `5`. Empty arrays are truthy; nullish and falsey fallbacks differ.
3. It creates a shallow exercise copy and replaces its logs with a new empty array. Other nested references are not deep-cloned.
4. Both direct replacements read the same render snapshot; queued updater functions receive the evolving state.
5. Root React state can outlive a child screen, but only a successful persistent write can survive a new process.
6. Suggested places: `Settings.unit`, `Exercise.lastLogs`, `updateStateField`, and handlers calling `setPlans(previous => ...)`.

## 1.13 Reading The Styling And Small Utilities

In this project, a long `className` is largely a set of Tailwind utility
classes, not a custom JavaScript language. For example, the actual Header
uses `sticky top-0 z-40` to position it and `p-4 pt-8` for padding. Color and
font names such as `text-primary` and `font-display` connect to theme values
in [index.css](../src/index.css). Arbitrary values such as `text-[64px]` set
a specific font size. Prefixes such as `hover:` apply a style in a particular
interaction state; responsive prefixes apply at configured viewport sizes.

Flexbox classes describe layout: `flex` creates a flex container, `flex-col`
stacks children, `gap-4` separates them, and `flex-1` lets an item participate
in distributing available space. Understand the parent container too: a
child's width or flex setting alone may not explain a squished mobile screen.

The [Header component](../src/components/Header.tsx) is a good first complete
component to read. It has required `title` and optional `subtitle` props,
renders the title, and conditionally renders the subtitle with `subtitle &&`.
It has no workout state or storage dependency. Compare that narrow job with
the much broader responsibilities in App.

[utils.ts](../src/lib/utils.ts) exports `cn(...inputs)`. The `...` here is a
rest parameter collecting arguments, not object spread. `clsx` builds a class
string from conditional inputs; `twMerge` resolves recognized Tailwind class
conflicts. This helper chooses CSS classes, not business rules.

Icons come from `lucide-react`, animations from `motion`, and chart components
from Recharts. A `<Plus />` component draws an icon; it does not itself log a
set. The surrounding button's event handler implements the operation. Keep
the visual affordance separate from the action when reading JSX.

[id.ts](../src/lib/id.ts) uses `crypto.randomUUID()` to generate IDs. An ID
supports entity identity; it is not an authentication secret or proof of
authorization. Those security concepts are not supplied by this app's IDs.

## Further Reading

- [TypeScript handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [React: state as a snapshot](https://react.dev/learn/state-as-a-snapshot)
- [React: queueing state updates](https://react.dev/learn/queueing-a-series-of-state-updates)
- [React: synchronizing with effects](https://react.dev/learn/synchronizing-with-effects)
- [React StrictMode](https://react.dev/reference/react/StrictMode)

The source walkthrough is [chapter 2](02-code-walkthrough.md).
