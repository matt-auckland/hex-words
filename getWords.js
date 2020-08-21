const fs = require("fs");

const dict = require("./words/words_dictionary.json");

const wordsOnly = Object.keys(dict);

const validLetters = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",

  // 'leetspeak' letters
  "g",
  "h",
  "i",
  "j",
  "l",
  "o",
  "s",
  "t",
  // "x", // goes with the number 8 but looks kind of dumb
  "z",
];

let filtered = wordsOnly
  .filter((word) => word.length === 3 || word.length === 6)
  .filter((word) => {
    let allow = true;
    const letters = word.split("");
    letters.forEach((letter) => {
      if (!validLetters.includes(letter)) {
        allow = false;
      }
    });

    return allow;
  })
  .sort((a, b) => b.length - a.length);

let leetSpeak = filtered.map((word) => {
  let leetSpeakified = word.toUpperCase();

  leetSpeakified = leetSpeakified.replace(/O/g, "0");
  leetSpeakified = leetSpeakified.replace(/[L,I]/g, "1");
  leetSpeakified = leetSpeakified.replace(/Z/g, "2");
  // leetSpeakified = leetSpeakified.replace(/E/g, "3"); // no need to replace E
  leetSpeakified = leetSpeakified.replace(/H/g, "4"); //A would also be valid here
  leetSpeakified = leetSpeakified.replace(/S/g, "5");
  leetSpeakified = leetSpeakified.replace(/G/g, "6");
  leetSpeakified = leetSpeakified.replace(/T/g, "7");
  // leetSpeakified = leetSpeakified.replace(/X/g, "8"); // 8 looks kind of dumb as a replacement for X so commented. Also works for B.
  leetSpeakified = leetSpeakified.replace(/J/g, "9");

  return { word: word, leet: leetSpeakified };
});

let sixLetters = leetSpeak
  .filter((word) => word.word.length === 6)
  .sort((a, b) => a.word.localeCompare(b.word));

let threeLetters = leetSpeak
  .filter((word) => word.word.length === 3)
  .sort((a, b) => a.word.localeCompare(b.word));

let leetSpeakSorted = [...sixLetters, ...threeLetters];

fs.writeFileSync(
  "./words/six-and-three-letter-words.json",
  JSON.stringify(leetSpeakSorted)
);
fs.writeFileSync("./words/six-letter-words.json", JSON.stringify(sixLetters));
fs.writeFileSync(
  "./words/three-letter-words.json",
  JSON.stringify(threeLetters)
);
