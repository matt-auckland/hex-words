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
    padding: 0 0 1em 0;
    margin: 0 auto;
  }

  .github {
    position: absolute;
    top: 15px;
    right: 15px;
    width: 30px;
  }

  .github img {
    width: 100%;
  }

  h1 {
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
    transition: color 250ms;
    margin: 0 0 15px 0;
  }

  .filter-cont {
    padding: 15px 0 10px;
    position: sticky;
    position: -webkit-sticky;
    top: 0;
    background: white;
    border-bottom: 1px solid;
  }

  .filter-cont input {
    margin-left: 10px;
    border-radius: 6px;
  }

  .filter-cont h4,
  .filter-cont h5 {
    margin: 5px 0;
  }

  .words {
    width: min(90vw, 1200px);
    margin: 15px auto 0;

    display: grid;
    grid-gap: 30px;
    grid-template-columns: repeat(auto-fill, 250px);
    justify-content: space-between;
    align-items: center;
  }

  .word {
    display: flex;
    justify-content: center;
    align-items: center;

    cursor: pointer;
  }

  .original {
    text-transform: capitalize;
  }

  .colour {
    height: 24px;
    flex: 1;
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

  .back-to-top {
    --size: 45px;

    cursor: pointer;
    position: fixed;
    bottom: 15px;
    right: 15px;
    background: white;
    width: var(--size);
    height: var(--size);
    border: 1px solid;
    border-radius: var(--size);
    text-align: center;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 20px;

    transition: all 200ms;
  }

  .back-to-top:hover {
    font-size: 24px;
  }

  @media (max-width: 600px) {
    .original {
      display: block;
    }

    .words {
      width: 100%;
      grid-gap: 20px;
      grid-template-columns: repeat(2, 1fr);
    }

    .colour {
      max-width: 120px;
    }
  }
</style>

<main>
  <a
    class="github"
    href="https://github.com/matt-auckland/hex-words"
    target="_blank">
    <img src="github.png" alt="github logo" width="30" />
  </a>
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

  <div class="filter-cont">
    <label for="filter">
      Search for words:
      <input
        name="filter"
        type="text"
        bind:value={searchString}
        on:keydown={filterWords} />
    </label>
    <h4>
      {`There ${filteredWords.length == 1 ? 'is' : 'are'} ${filteredWords.length} word${filteredWords.length == 1 ? '' : 's'}!`}
    </h4>

    {#if filteredWordsCount > 0}
      <h5>({filteredWordsCount} words are hidden)</h5>
    {/if}

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

<div class="back-to-top" on:click={() => window.scrollTo(0, 0)}>↑</div>
