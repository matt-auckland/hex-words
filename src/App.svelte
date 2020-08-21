<script>
  export let words;

  let filteredWords = words;
  let filteredWordsCount = 0;
  let searchString = "";

  let timeout;
  function filterWords() {
    if (timeout) {
      window.clearTimeout(timeout);
    }
    timeout = window.setTimeout(function () {
      filteredWords = words.filter((word) => word.word.includes(searchString));
      filteredWordsCount = words.length - filteredWords.length;
    }, 100);
  }

  let lastCopiedColour;
  let clickedColour;

  function copyHex(hexcode) {
    lastCopiedColour = hexcode;
    clickedColour = hexcode;
    navigator.clipboard.writeText(`#${hexcode}`).then(() => {
      console.log("copied!");
    });

    setTimeout(function () {
      clickedColour = null;
    }, 400);
  }
</script>

<style>
  main {
    text-align: center;
    padding: 1em;
    margin: 0 auto;
  }

  h1 {
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
    transition: color 250ms;
  }

  .filter-cont {
    margin: 15px 0;
  }

  .filter-cont input {
    margin-left: 10px;
    border-radius: 6px;
  }

  .words {
    width: min(90vw, 1200px);
    margin: 0 auto;
    display: grid;
    grid-gap: 30px;
    grid-template-columns: repeat(auto-fill, 250px);
    justify-content: center;
  }

  .word {
    display: flex;
    width: 250px;
    justify-content: flex-end;
    cursor: pointer;
  }
  .original {
    text-transform: capitalize;
  }

  .colour {
    height: 24px;
    width: 80px;
    border: 1px solid black;
    border-radius: 6px;
    margin-left: 10px;
  }

  .copy-hex {
    height: 100%;
    transition: transform 300ms;
    transform: rotateX(90deg);

    -moz-user-select: none;
    -webkit-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }

  .colour:hover .copy-hex {
    transform: rotateX(0deg);
  }
  .copy-hex.boop,
  .copy-hex.boop:hover {
    transition: transform 400ms ease-out;

    transform: scale(110%) rotateX(0deg);
  }

  footer {
    width: 100%;
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    text-align: center;
    margin-top: 30px;
  }
  footer .me {
    flex-basis: 100%;
  }
  footer a {
    display: block;
    margin: 5px 15px;
  }
</style>

<main>
  <h1 style={`color:  #${lastCopiedColour};`}>Hex-Words</h1>
  <p>
    You're familiar with the standard
    <a
      href="https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#Color_keywords"
      target="_blank">
      CSS colour keywords,
    </a>
    now learn about the ones hidden in hexcodes!
  </p>
  <p>Click on a colour to copy the colour's hexcode.</p>
  <h2>
    {`There ${filteredWords.length > 1 ? 'are' : 'is'} ${filteredWords.length} word${filteredWords.length > 1 ? 's' : ''}!`}
  </h2>

  {#if filteredWordsCount > 0}
    <h3>({filteredWordsCount} words are hidden)</h3>
  {/if}

  <div class="filter-cont">
    <label for="filter">
      Search for words:
      <input
        name="filter"
        type="text"
        bind:value={searchString}
        on:keydown={filterWords} />
    </label>
  </div>

  <div class="words">
    {#each filteredWords as word}
      <div class="word" on:click={copyHex(word.leet)}>
        <div>
          <span class="original">{word.word}</span>
          → #{word.leet}
        </div>
        <div class="colour" style={`background-color: #${word.leet};`}>
          <div class="copy-hex" class:boop={clickedColour == word.leet}>
            {clickedColour == word.leet ? 'COPIED!' : 'COPY'}
          </div>
        </div>
      </div>
    {/each}
  </div>

  {#if filteredWords.length == 0}
    <h3>No words containing "{searchString}" found</h3>
  {/if}

</main>
<footer>
  <div class="me">Created by Mathew Paul.</div>
  <a href="https://twitter.com/matt4ttack" target="_blank">Twitter</a>
  <a href="https://github.com/matt-auckland" target="_blank">Github</a>
</footer>
