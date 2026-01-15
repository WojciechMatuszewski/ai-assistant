# AI Assistant

## Learnings

- The `@starting-style` is _very_ powerful. With the `allow-discrete` we can animate appearance and disappearance of elements **without** any additional libraries.

- The `router.replace` can interrupt streaming. This is quite problematic in our case.

- The `dispatch` you get from `useFormAction` **does NOT** automatically run transition when you invoke it.

  - This means that you either have to wrap it with `startTransition`, OR use `formAction` on the `form` or `button` HTML elements (the `button` must be wrapped with a `form` and have `type="submit"` attribute).

    Thinking about it more, it kind of makes sense. If you were to automatically wrap it in `startTransition` it would be hard to _compose_ multiple dispatches in a single transition.

- TIL that **using `#` in the URL allows you to _focus ANY_ element on the page that is focusable**.

  - This is very handy for me here since I want the chat input to automatically focus when you click "New Chat" button.

    ```jsx
    <input id="your-id-here" />

    // Some other place in the code

    <Link href = "/#your-id-here"/>
    ```
