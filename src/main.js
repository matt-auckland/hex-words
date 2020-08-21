import App from "./App.svelte";
import words from "../words/six-and-three-letter-words.json";

const app = new App({
  target: document.body,
  props: {
    words,
  },
});

export default app;
